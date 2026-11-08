/**
 * Tickets de l'application (standard, section 13.5) : signalement par tout utilisateur, traitement ITIL par les files.
 * Question métier vers la file « business », incident, bug et souhait vers la file « it » ; rôles des files en paramètres.
 * Priorité impact × urgence, délais par priorité en paramètre, transitions contrôlées, rien n'est supprimé.
 *
 * Repris de services/tickets.js du gabarit 1.3.0. Adaptations à la GMAO (DV-97, DV-107), et rien d'autre :
 * - le ticket porte l'entité active du demandeur au signalement (entite_id) ;
 * - un rôle d'une file se compare au rôle d'instance (admin : toutes les entités) ou aux rôles de la personne dans son
 *   entité active (responsable, gestionnaire : les tickets de cette entité seulement), au lieu du rôle unique user.role ;
 * - une question métier exige une entité active (NO_ENTITE) ; un transfert vers la file métier exige un ticket rattaché
 *   à une entité (NO_ENTITE) ; la personne affectée doit pouvoir traiter le ticket (ASSIGNEE_INVALIDE) ;
 * - les réglages se lisent dans le catalogue des paramètres de l'instance (services/parametres.js, groupe tickets),
 *   réglable par l'administrateur, au lieu de settings.js ;
 * - le journal d'audit porte l'entité du ticket, pour le filtre de l'écran du journal ;
 * - la capture est nettoyée de ses métadonnées par cleanPhoto (images.js), comme les photos des demandes.
 */
const { getDb } = require('../database');
const { AppError } = require('../envelope');
const { logAudit } = require('../audit');
const { valeur } = require('./parametres');
const { ROLES } = require('../roles');
const { cleanPhoto } = require('../images');
const faq = require('./faq');

const getSetting = (cle) => String(valeur(cle) ?? '');
const listSetting = (cle) => getSetting(cle).split(',').map((x) => x.trim()).filter(Boolean);
const INSTANCE_ROLES = ROLES.filter((r) => r.portee === 'instance').map((r) => r.code);

const IMPACT = { person: 3, service: 2, organisation: 1 };
const URGENCY = { blocking: 1, annoying: 2, comfort: 3 };
const OPEN = ['new', 'in_progress', 'waiting_requester'];
const TRANSITIONS = {
  in_progress: { from: ['new', 'waiting_requester'], who: 'handler', reason: false },
  waiting_requester: { from: ['new', 'in_progress'], who: 'handler', reason: true },
  resolved: { from: OPEN, who: 'handler', reason: true },
  rejected: { from: OPEN, who: 'handler', reason: true },
  cancelled: { from: OPEN, who: 'both', reason: true },
  closed: { from: ['resolved'], who: 'both', reason: false },
  reopen: { from: ['resolved'], who: 'requester', reason: true },
};
const LIST_COLUMNS = `t.id, t.reference, t.type, t.title, t.queue, t.priority, t.status, t.wish_status, t.fixed_version, t.screen, t.entite_id,
  t.requester_id, t.assignee_id, t.due_resolution_at, t.created_at, t.updated_at, (t.screenshot IS NOT NULL) AS has_screenshot,
  (t.status IN ('new', 'in_progress', 'waiting_requester') AND t.due_resolution_at < datetime('now')) AS overdue,
  r.first_name || ' ' || r.last_name AS requester_name, a.first_name || ' ' || a.last_name AS assignee_name`;

const priorityOf = (impact, urgency) => ({ 2: 'P1', 3: 'P2', 4: 'P3' })[impact + urgency] || 'P4';
const queueOf = (type) => (type === 'question' ? 'business' : 'it');

/**
 * Portée d'une personne sur une file : 'all' si son rôle d'instance figure parmi les rôles de la file, l'identifiant de
 * son entité active si l'un de ses rôles dans cette entité y figure, sinon null.
 */
function scope(user, queue) {
  const roles = listSetting(queue === 'business' ? 'tickets.business_roles' : 'tickets.it_roles');
  if (INSTANCE_ROLES.includes(user.role) && roles.includes(user.role)) return 'all';
  if (user.entiteId && (user.roles || []).some((r) => roles.includes(r))) return user.entiteId;
  return null;
}
const handlerQueues = (user) => ['business', 'it'].filter((q) => scope(user, q) !== null);
const canHandle = (user, t) => { const s = scope(user, t.queue); return s === 'all' || (s !== null && s === t.entite_id); };
const canSee = (user, t) => t.requester_id === user.id || canHandle(user, t);

/** Clause SQL des tickets que la personne traite (alias a, ou t), avec ses paramètres ; null si elle n'en traite aucun. */
function handledClause(user, alias = 't') {
  const parts = [];
  const params = [];
  for (const q of ['business', 'it']) {
    const s = scope(user, q);
    if (s === 'all') { parts.push(`${alias}.queue = ?`); params.push(q); }
    else if (s !== null) { parts.push(`(${alias}.queue = ? AND ${alias}.entite_id = ?)`); params.push(q, s); }
  }
  return parts.length ? { sql: `(${parts.join(' OR ')})`, params } : null;
}

function dues(priority, from = "datetime('now')") {
  let sla;
  try { sla = JSON.parse(getSetting('tickets.sla_json')); } catch (e) { sla = {}; }
  const [resp, resol] = sla[priority] || [24, 240];
  return { resp: `+${Number(resp)} hours`, resol: `+${Number(resol)} hours`, from };
}

/**
 * Image PNG ou JPEG en data URL, contrôlée sur ses premiers octets, 2 Mo au plus. GMAO : structure parcourue et
 * métadonnées retirées par cleanPhoto (images.js, RGPD-01), comme les photos des lieux et des demandes ; seule l'image
 * nettoyée est gardée.
 */
function checkScreenshot(dataUrl) {
  if (!dataUrl) return null;
  const m = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw new AppError(400, 'VALIDATION', ['screenshot: format']);
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 2 * 1024 * 1024) throw new AppError(413, 'PAYLOAD_TOO_LARGE');
  const png = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const jpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (!(m[1] === 'png' ? png : jpg)) throw new AppError(400, 'VALIDATION', ['screenshot: contenu']);
  const propre = cleanPhoto(buf, `image/${m[1]}`);
  if (propre.error) throw new AppError(400, 'VALIDATION', ['screenshot: contenu']);
  return `data:${propre.type};base64,${propre.data.toString('base64')}`;
}

function load(id) {
  const t = getDb().prepare('SELECT * FROM tickets WHERE id = ?').get(id);
  if (!t) throw new AppError(404, 'NOT_FOUND');
  return t;
}

function event(ticketId, userId, code) {
  getDb().prepare("INSERT INTO ticket_messages (ticket_id, author_id, kind, body, is_internal) VALUES (?, ?, 'event', ?, 0)").run(ticketId, userId, code);
}

function list(user, { limit = 50, offset = 0, q, status, type, queue, open_only, mine } = {}) {
  const where = [];
  const params = [];
  const handled = handledClause(user);
  if (handled) {
    where.push(`(t.requester_id = ? OR ${handled.sql})`);
    params.push(user.id, ...handled.params);
  } else { where.push('t.requester_id = ?'); params.push(user.id); }
  if (status) { where.push('t.status = ?'); params.push(status); }
  if (type) { where.push('t.type = ?'); params.push(type); }
  if (queue) { where.push('t.queue = ?'); params.push(queue); }
  if (open_only) where.push("t.status IN ('new', 'in_progress', 'waiting_requester')");
  if (mine) { where.push('(t.assignee_id = ? OR t.requester_id = ?)'); params.push(user.id, user.id); }
  if (q) { where.push('(t.title LIKE ? OR t.reference LIKE ? OR t.description LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const clause = `WHERE ${where.join(' AND ')}`;
  const db = getDb();
  const total = db.prepare(`SELECT COUNT(*) AS n FROM tickets t ${clause}`).get(...params).n;
  const rows = db.prepare(`SELECT ${LIST_COLUMNS} FROM tickets t JOIN users r ON r.id = t.requester_id LEFT JOIN users a ON a.id = t.assignee_id ${clause}
    ORDER BY CASE t.status WHEN 'new' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'waiting_requester' THEN 2 ELSE 3 END, t.priority, t.created_at DESC
    LIMIT ? OFFSET ?`).all(...params, limit, offset);
  return { rows, pagination: { total, limit, offset } };
}

function get(user, id) {
  const t = load(id);
  if (!canSee(user, t)) throw new AppError(403, 'FORBIDDEN');
  const handler = canHandle(user, t);
  const messages = getDb().prepare(`SELECT m.id, m.kind, m.body, m.is_internal, m.created_at, m.author_id, u.first_name || ' ' || u.last_name AS author_name
    FROM ticket_messages m LEFT JOIN users u ON u.id = m.author_id WHERE m.ticket_id = ? ${handler ? '' : 'AND m.is_internal = 0'} ORDER BY m.id`).all(id);
  const { screenshot, ...rest } = t;
  let context = null;
  try { context = t.context_json ? JSON.parse(t.context_json) : null; } catch (e) { context = null; }
  const reopenDays = Number(getSetting('tickets.reopen_days')) || 14;
  const canReopen = t.requester_id === user.id && t.status === 'resolved'
    && !!getDb().prepare("SELECT 1 FROM tickets WHERE id = ? AND resolved_at > datetime('now', ?)").get(id, `-${reopenDays} days`);
  // 0.12.0 : entrée de la FAQ née de ce ticket, et possibilité d'en créer une (question métier résolue ou close, traitant).
  const entree = t.type === 'question' ? faq.deTicket(id) : null;
  const canFaq = handler && t.type === 'question' && ['resolved', 'closed'].includes(t.status) && !entree && t.entite_id !== null;
  return { ...rest, context, has_screenshot: !!screenshot, messages, can_handle: handler, can_reopen: canReopen, faq_id: entree ? entree.id : null, can_faq: canFaq };
}

function create(user, data, channel = 'api') {
  const db = getDb();
  if (queueOf(data.type) === 'business' && !user.entiteId) throw new AppError(409, 'NO_ENTITE');
  const impact = IMPACT[data.impact || 'person'];
  const urgency = URGENCY[data.urgency || 'annoying'];
  const priority = priorityOf(impact, urgency);
  const screenshot = checkScreenshot(data.screenshot);
  const context = data.context ? JSON.stringify(data.context).slice(0, 4000) : null;
  const d = dues(priority);
  const id = db.transaction(() => {
    const year = new Date().getUTCFullYear();
    const n = db.prepare('SELECT COUNT(*) AS n FROM tickets WHERE reference LIKE ?').get(`TCK-${year}-%`).n + 1;
    const reference = `TCK-${year}-${String(n).padStart(5, '0')}`;
    const r = db.prepare(`INSERT INTO tickets (reference, type, title, description, expected, actual, queue, impact, urgency, priority,
      requester_id, entite_id, screen, context_json, screenshot, due_response_at, due_resolution_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))`)
      .run(reference, data.type, data.title, data.description || null, data.expected || null, data.actual || null, queueOf(data.type),
        impact, urgency, priority, user.id, user.entiteId || null, data.screen || null, context, screenshot, d.resp, d.resol);
    event(r.lastInsertRowid, user.id, 'created');
    return r.lastInsertRowid;
  })();
  logAudit(user.id, 'ticket.create', 'ticket', id, { type: data.type, priority }, channel, user.entiteId || null);
  return get(user, id);
}

function update(user, id, data, channel = 'api') {
  const t = load(id);
  if (!canSee(user, t)) throw new AppError(403, 'FORBIDDEN');
  if (!OPEN.includes(t.status)) throw new AppError(409, 'TICKET_CLOSED');
  const handler = canHandle(user, t);
  const requesterFields = ['title', 'description', 'expected', 'actual'];
  const handlerFields = ['assignee_id', 'impact', 'urgency', 'priority', 'wish_status', 'fixed_version', 'queue'];
  const sets = [];
  const params = [];
  for (const [k, v] of Object.entries(data)) {
    if (k === 'reason') continue;
    const allowed = (handlerFields.includes(k) && handler) || (requesterFields.includes(k) && t.requester_id === user.id && t.status === 'new');
    if (!allowed) throw new AppError(403, 'FORBIDDEN');
    if (k === 'impact') { sets.push('impact = ?'); params.push(IMPACT[v]); continue; }
    if (k === 'urgency') { sets.push('urgency = ?'); params.push(URGENCY[v]); continue; }
    sets.push(`${k} = ?`);
    params.push(v);
  }
  if ((data.priority || data.queue || (data.wish_status === 'refused')) && !data.reason) throw new AppError(400, 'REASON_REQUIRED');
  if (data.queue === 'business' && !t.entite_id) throw new AppError(409, 'NO_ENTITE');
  if (data.assignee_id) {
    const u = getDb().prepare('SELECT id, user_role, is_active FROM users WHERE id = ?').get(data.assignee_id);
    const cible = { ...t, queue: data.queue || t.queue };
    const roles = u && t.entite_id ? getDb().prepare('SELECT role FROM user_roles WHERE user_id = ? AND entite_id = ? AND is_active = 1').all(u.id, t.entite_id).map((r) => r.role) : [];
    if (!u || !u.is_active || !canHandle({ id: u.id, role: u.user_role, entiteId: t.entite_id, roles }, cible)) throw new AppError(409, 'ASSIGNEE_INVALIDE');
  }
  if (!sets.length) return get(user, id);
  const db = getDb();
  db.transaction(() => {
    db.prepare(`UPDATE tickets SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...params, id);
    const after = load(id);
    if ((data.impact || data.urgency) && !data.priority) db.prepare('UPDATE tickets SET priority = ? WHERE id = ?').run(priorityOf(after.impact, after.urgency), id);
    if (data.impact || data.urgency || data.priority) {
      const d = dues(load(id).priority);
      db.prepare('UPDATE tickets SET due_response_at = datetime(created_at, ?), due_resolution_at = datetime(created_at, ?) WHERE id = ?').run(d.resp, d.resol, id);
    }
    if (data.queue && data.queue !== t.queue) db.prepare('UPDATE tickets SET assignee_id = NULL WHERE id = ?').run(id);
    event(id, user.id, data.queue && data.queue !== t.queue ? `queue:${data.queue}` : 'updated');
    if (data.reason) db.prepare("INSERT INTO ticket_messages (ticket_id, author_id, kind, body, is_internal) VALUES (?, ?, 'message', ?, 1)").run(id, user.id, data.reason);
  })();
  logAudit(user.id, 'ticket.update', 'ticket', id, { fields: Object.keys(data) }, channel, t.entite_id);
  // Transféré vers une file que la personne ne traite pas : confirmation du transfert, sans le contenu du ticket.
  const after = load(id);
  if (!canSee(user, after)) return { id, reference: after.reference, queue: after.queue, transferred: true };
  return get(user, id);
}

function changeStatus(user, id, { to, reason }, channel = 'api') {
  const t = load(id);
  if (!canSee(user, t)) throw new AppError(403, 'FORBIDDEN');
  const rule = TRANSITIONS[to];
  if (!rule || !rule.from.includes(t.status)) throw new AppError(409, 'TRANSITION');
  const handler = canHandle(user, t);
  const requester = t.requester_id === user.id;
  const permitted = rule.who === 'handler' ? handler : rule.who === 'requester' ? requester : (handler || requester);
  if (!permitted) throw new AppError(403, 'FORBIDDEN');
  if (rule.reason && !reason) throw new AppError(400, 'REASON_REQUIRED');
  if (to === 'reopen' && !get(user, id).can_reopen) throw new AppError(409, 'TRANSITION');
  const db = getDb();
  const target = to === 'reopen' ? 'in_progress' : to;
  db.transaction(() => {
    const extra = [];
    if (target === 'in_progress') extra.push('assignee_id = COALESCE(assignee_id, ?)', "first_response_at = COALESCE(first_response_at, datetime('now'))");
    if (target === 'resolved') extra.push("resolved_at = datetime('now')", 'resolution = ?');
    if (['closed', 'rejected', 'cancelled'].includes(target)) extra.push("closed_at = datetime('now')");
    const params = [];
    if (target === 'in_progress') params.push(handler ? user.id : null);
    if (target === 'resolved') params.push(reason);
    db.prepare(`UPDATE tickets SET status = ?, status_reason = ?${extra.length ? ', ' + extra.join(', ') : ''}, updated_at = datetime('now') WHERE id = ?`)
      .run(target, reason || null, ...params, id);
    event(id, user.id, `status:${to}`);
    if (reason) db.prepare("INSERT INTO ticket_messages (ticket_id, author_id, kind, body, is_internal) VALUES (?, ?, 'message', ?, 0)").run(id, user.id, reason);
  })();
  // 0.13.0 (D8, décidé par Thierry le 08/11/2026) : le motif tapé reste dans le fil du ticket ; le journal, gardé
  // longtemps, note seulement qu'il a été donné (écart au gabarit, E-46).
  logAudit(user.id, `ticket.${to}`, 'ticket', id, rule.reason ? { motif_donne: reason ? 1 : 0 } : null, channel, t.entite_id);
  return get(user, id);
}

function addMessage(user, id, { body, is_internal = false }, channel = 'api') {
  const t = load(id);
  if (!canSee(user, t)) throw new AppError(403, 'FORBIDDEN');
  if (!OPEN.includes(t.status)) throw new AppError(409, 'TICKET_CLOSED');
  const handler = canHandle(user, t);
  if (is_internal && !handler) throw new AppError(403, 'FORBIDDEN');
  const db = getDb();
  db.transaction(() => {
    db.prepare("INSERT INTO ticket_messages (ticket_id, author_id, kind, body, is_internal) VALUES (?, ?, 'message', ?, ?)").run(id, user.id, body, is_internal ? 1 : 0);
    if (t.requester_id === user.id && t.status === 'waiting_requester') {
      db.prepare("UPDATE tickets SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?").run(id);
      event(id, user.id, 'status:in_progress');
    }
    if (handler && !is_internal) db.prepare("UPDATE tickets SET first_response_at = COALESCE(first_response_at, datetime('now')) WHERE id = ?").run(id);
  })();
  logAudit(user.id, 'ticket.message', 'ticket', id, { internal: !!is_internal }, channel, t.entite_id);
  return get(user, id);
}

function screenshot(user, id) {
  const t = load(id);
  if (!canSee(user, t)) throw new AppError(403, 'FORBIDDEN');
  if (!t.screenshot) throw new AppError(404, 'NOT_FOUND');
  return t.screenshot;
}

function stats(user) {
  const handled = handledClause(user, 'tickets');
  if (!handled) throw new AppError(403, 'FORBIDDEN');
  const db = getDb();
  const inQ = handled.sql;
  const one = (sql) => db.prepare(`SELECT COUNT(*) AS n FROM tickets WHERE ${inQ} AND ${sql}`).get(...handled.params).n;
  const group = (col) => db.prepare(`SELECT ${col} AS k, COUNT(*) AS n FROM tickets WHERE ${inQ} GROUP BY ${col} ORDER BY n DESC LIMIT 10`).all(...handled.params);
  return {
    open: one("status IN ('new', 'in_progress', 'waiting_requester')"),
    overdue: one("status IN ('new', 'in_progress', 'waiting_requester') AND due_resolution_at < datetime('now')"),
    unassigned: one("status IN ('new', 'in_progress', 'waiting_requester') AND assignee_id IS NULL"),
    resolved_30d: one("resolved_at > datetime('now', '-30 days')"),
    by_priority: group('priority'), by_type: group('type'), by_screen: group('screen'),
  };
}

/** Tickets ouverts que la personne peut traiter, avec leur contexte : base de l'outil MCP pour Claude. */
function toHandle(user) {
  const handled = handledClause(user, 'tickets');
  if (!handled) return [];
  return getDb().prepare(`SELECT id, reference, type, title, description, expected, actual, priority, status, screen, entite_id, context_json, created_at, due_resolution_at
    FROM tickets WHERE ${handled.sql} AND status IN ('new', 'in_progress')
    ORDER BY priority, created_at LIMIT 100`).all(...handled.params);
}

/**
 * Question métier résolue ou close transformée en entrée de la FAQ de l'entité du ticket (standard, section 13.5 ;
 * 0.12.0). Par une personne qui traite le ticket ; une seule entrée par ticket ; le ticket lui-même ne change pas.
 * La question et la réponse sont réécrites par la personne, en FR et en NL, sans donnée personnelle du demandeur.
 */
function toFaq(user, id, data, channel = 'api') {
  const t = load(id);
  if (!canSee(user, t)) throw new AppError(403, 'FORBIDDEN');
  if (!canHandle(user, t)) throw new AppError(403, 'FORBIDDEN');
  if (t.type !== 'question' || !['resolved', 'closed'].includes(t.status) || t.entite_id === null) throw new AppError(409, 'FAQ_SOURCE');
  if (faq.deTicket(id)) throw new AppError(409, 'FAQ_DEJA');
  return faq.create(user, { ...data, portee: 'entite' }, channel, t);
}

module.exports = { toFaq, list, get, create, update, changeStatus, addMessage, screenshot, stats, toHandle, priorityOf, TRANSITIONS, handlerQueues };
