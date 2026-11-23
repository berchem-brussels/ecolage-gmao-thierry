/**
 * FAQ locale (standard, section 13.1 ; 0.12.0) : questions et réponses ajoutées sans livraison, montrées dans le centre
 * d'aide et sur la fiche d'aide de l'écran qu'elles concernent (topic_id). Reprise du service faq.js du gabarit 1.3.0,
 * adaptée à la GMAO (écart E-44) :
 *
 * - entite_id null : entrée commune aux entités, écrite par l'administrateur seul ; entite_id renseigné : entrée d'une
 *   entité, écrite par son service technique (permission « faq:gerer » : gestionnaire et responsable de l'entité active)
 *   ou par l'administrateur ;
 * - lecture : toute personne connectée lit les entrées actives communes et celles de son entité active ; une entrée de
 *   l'autre entité est refusée (403, SEC-01) ; les entrées désactivées ne se lisent que par qui peut les gérer ;
 * - une question métier résolue ou close devient une entrée de l'entité du ticket (section 13.5), par une personne qui
 *   traite ce ticket ; le ticket n'est pas modifié (un ticket clos n'accepte plus rien), l'entrée garde son origine ;
 * - rien ne se supprime : désactivation avec motif, réactivation par is_active = 1 (CYC-05) ;
 * - journal d'audit : champs changés seulement, avec l'entité de l'entrée.
 */
const { getDb, safeBuildUpdate } = require('../database');
const { AppError } = require('../envelope');
const { logAudit, changements } = require('../audit');
const { rolesWith } = require('../roles');

const COLUMNS = `f.id, f.entite_id, e.code AS entite_code, f.topic_id, f.question_fr, f.question_nl, f.answer_fr, f.answer_nl,
  f.source_ticket_id, t.reference AS source_ticket_reference, f.is_active, f.motif_desactivation, f.created_at, f.updated_at`;
const FROM = 'FROM help_faq f LEFT JOIN entites e ON e.id = f.entite_id LEFT JOIN tickets t ON t.id = f.source_ticket_id';

const estAdmin = (user) => user.role === 'admin';
/** Gère les entrées de son entité active : permission « faq:gerer » dans cette entité. */
const gereEntite = (user) => !!user.entiteId && (user.roles || []).some((r) => rolesWith('faq:gerer').includes(r));
/** Peut gérer cette entrée : l'administrateur toutes, le service technique celles de son entité active. */
const peutGerer = (user, f) => estAdmin(user) || (f.entite_id !== null && gereEntite(user) && f.entite_id === user.entiteId);

function charger(id) {
  const f = getDb().prepare(`SELECT ${COLUMNS} ${FROM} WHERE f.id = ?`).get(id);
  if (!f) throw new AppError(404, 'NOT_FOUND');
  return f;
}

/** Fiche visible par la personne : commune, ou de son entité active ; l'administrateur voit tout. */
function load(user, id) {
  const f = charger(id);
  if (!estAdmin(user) && f.entite_id !== null && f.entite_id !== user.entiteId) throw new AppError(403, 'FORBIDDEN');
  if (!f.is_active && !peutGerer(user, f)) throw new AppError(404, 'NOT_FOUND');
  return f;
}

function fiche(user, f) {
  return { ...f, can_manage: peutGerer(user, f) };
}

/**
 * Liste : entrées actives communes et de l'entité active, triées par écran puis par date. inclure_inactives (gestion) :
 * aussi les entrées désactivées que la personne peut gérer. q : recherche dans les questions et les réponses FR et NL.
 */
function list(user, { limit = 200, offset = 0, topic_id, q, inclure_inactives = 0 } = {}) {
  // Communes et entité active, administrateur compris : la FAQ suit l'entité active comme les autres listes (ROL-03).
  const where = ['(f.entite_id IS NULL OR f.entite_id = ?)'];
  const params = [user.entiteId || 0];
  const gestion = inclure_inactives && (estAdmin(user) || gereEntite(user));
  if (!gestion) where.push('f.is_active = 1');
  else if (!estAdmin(user)) { where.push('(f.is_active = 1 OR f.entite_id = ?)'); params.push(user.entiteId); }
  if (topic_id) { where.push('f.topic_id = ?'); params.push(topic_id); }
  if (q) {
    where.push("(f.question_fr LIKE ? ESCAPE '\\' OR f.question_nl LIKE ? ESCAPE '\\' OR f.answer_fr LIKE ? ESCAPE '\\' OR f.answer_nl LIKE ? ESCAPE '\\')");
    const m = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    params.push(m, m, m, m);
  }
  const clause = `WHERE ${where.join(' AND ')}`;
  const db = getDb();
  const total = db.prepare(`SELECT COUNT(*) AS n ${FROM} ${clause}`).get(...params).n;
  const rows = db.prepare(`SELECT ${COLUMNS} ${FROM} ${clause} ORDER BY f.topic_id IS NULL, f.topic_id, f.id LIMIT ? OFFSET ?`).all(...params, limit, offset);
  return { rows: rows.map((f) => fiche(user, f)), pagination: { total, limit, offset } };
}

function get(user, id) {
  return fiche(user, load(user, id));
}

/**
 * Création : portee « commune » (administrateur seul) ou « entite » (entité active ; administrateur ou service technique
 * de l'entité). Sans portee : commune pour l'administrateur, entité active pour le service technique.
 */
function create(user, data, channel = 'api', sourceTicket = null) {
  const portee = data.portee || (estAdmin(user) ? 'commune' : 'entite');
  let entiteId = null;
  if (sourceTicket) entiteId = sourceTicket.entite_id;
  else if (portee === 'commune') {
    if (!estAdmin(user)) throw new AppError(403, 'FORBIDDEN');
  } else {
    if (!user.entiteId) throw new AppError(403, 'NO_ENTITE');
    if (!estAdmin(user) && !gereEntite(user)) throw new AppError(403, 'FORBIDDEN');
    entiteId = user.entiteId;
  }
  const r = getDb().prepare(`INSERT INTO help_faq (entite_id, topic_id, question_fr, question_nl, answer_fr, answer_nl, source_ticket_id, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(entiteId, data.topic_id || null, data.question_fr, data.question_nl, data.answer_fr, data.answer_nl, sourceTicket ? sourceTicket.id : null, user.id, user.id);
  const id = r.lastInsertRowid;
  logAudit(user.id, 'faq.create', 'faq', id, { topic_id: data.topic_id || null, ticket: sourceTicket ? sourceTicket.reference : undefined }, channel, entiteId);
  return fiche(user, charger(id));
}

function update(user, id, data, channel = 'api') {
  const f = load(user, id);
  if (!peutGerer(user, f)) throw new AppError(403, 'FORBIDDEN');
  if (!f.is_active && data.is_active !== 1) throw new AppError(409, 'CANCELLED');
  const diff = changements('help_faq', id, data);
  if (diff) {
    const { sets, params } = safeBuildUpdate(diff.apres, ['id']);
    if (diff.apres.is_active === 1) sets.push('motif_desactivation = NULL');
    getDb().prepare(`UPDATE help_faq SET ${sets.join(', ')}, updated_by = ?, updated_at = datetime('now') WHERE id = ?`).run(...params, user.id, id);
    logAudit(user.id, diff.apres.is_active === 1 ? 'faq.reactivate' : 'faq.update', 'faq', id, diff, channel, f.entite_id);
  }
  return fiche(user, charger(id));
}

/** DELETE = désactivation avec motif ; l'entrée reste en base et se réactive par update(is_active = 1). */
function deactivate(user, id, motif, channel = 'api') {
  const f = load(user, id);
  if (!peutGerer(user, f)) throw new AppError(403, 'FORBIDDEN');
  if (!f.is_active) throw new AppError(409, 'CANCELLED');
  getDb().prepare("UPDATE help_faq SET is_active = 0, motif_desactivation = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?").run(motif, user.id, id);
  logAudit(user.id, 'faq.deactivate', 'faq', id, { motif }, channel, f.entite_id);
  return fiche(user, charger(id));
}

/** Entrée de la FAQ née d'un ticket, ou null : rendue sur la fiche du ticket. */
function deTicket(ticketId) {
  const f = getDb().prepare('SELECT id, is_active FROM help_faq WHERE source_ticket_id = ?').get(ticketId);
  return f || null;
}

module.exports = { list, get, create, update, deactivate, deTicket, peutGerer, gereEntite };
