/**
 * Indisponibilités des ouvriers (0.21.0, étape 17, point 2 ; cahier des charges PLA-04).
 *   1. Une indisponibilité est une période d'un ouvrier dans une entité : du, au (dates de Bruxelles, au plus 366 jours),
 *      la journée entière, le matin ou l'après-midi (une demi-journée seulement sur un seul jour) et un motif pris dans une
 *      liste fermée : congé, formation, autre. Aucun texte libre (pas de cause de santé ou autre détail personnel).
 *   2. L'ouvrier est un compte actif qui a, dans l'entité active, un rôle portant « interventions:realiser » (409
 *      OUVRIER_INVALIDE) ; une indisponibilité qui en chevauche une autre du même ouvrier est refusée (409
 *      INDISPO_CHEVAUCHEMENT ; le matin et l'après-midi d'un même jour ne se chevauchent pas).
 *   3. Droits : saisie, modification et suppression par « indisponibilites:gerer » (gestionnaire, responsable) ; lecture par
 *      cette permission ou « equipes:lire » (chef d'équipe). Le motif n'est rendu qu'à qui gère ; tout autre lecteur voit
 *      seulement que l'ouvrier est indisponible (PLA-04 : jamais la cause). Cloison : l'entité active (404 inconnue,
 *      403 autre entité).
 *   4. Une indisponibilité saisie par erreur se supprime vraiment (correction, pas une donnée métier) ; journal de la création,
 *      des champs changés et de la suppression : ouvrier, dates et période, jamais le motif.
 *   5. Effet : un ouvrier indisponible toute la journée n'est pas disponible dans « Ouvriers proposés » (services/taches.js,
 *      règle 12) ; une demi-journée est signalée sans le rendre indisponible. Le planning (point 3) et les conflits (point 4)
 *      lisent la même fonction (duJour).
 *   6. Pas de lecture depuis SAGA à ce stade (brique à soumettre à Renaud) : saisie à l'écran, par l'API ou par le MCP.
 */
const { getDb } = require('../database');
const { AppError } = require('../envelope');
const { logAudit } = require('../audit');
const { rolesWith } = require('../roles');
const { avecTrace } = require('./trace');
const { porteurs } = require('./equipes');

const PERIODES = ['journee', 'matin', 'apres_midi'];
const MOTIFS = ['conge', 'formation', 'autre'];
const peut = (user, permission) => user.roles.some((r) => rolesWith(permission).includes(r));

function entiteActive(user) {
  if (!user.entiteId) throw new AppError(403, 'NO_ENTITE');
  return user.entiteId;
}
const gere = (user) => peut(user, 'indisponibilites:gerer');
function lecteur(user) {
  entiteActive(user);
  if (!gere(user) && !peut(user, 'equipes:lire')) throw new AppError(403, 'FORBIDDEN');
}
function gestion(user) {
  entiteActive(user);
  if (!gere(user)) throw new AppError(403, 'FORBIDDEN');
}

const COLUMNS = `i.id, i.entite_id, i.user_id, i.du, i.au, i.periode, i.motif, i.created_by, i.updated_by, i.created_at, i.updated_at,
  u.first_name AS prenom, u.last_name AS nom`;
const FROM = 'FROM indisponibilites i JOIN users u ON u.id = i.user_id';

/** Règle 3 : le motif n'est rendu qu'à qui gère. */
function fiche(user, i) {
  const f = avecTrace(user, i);
  if (!gere(user)) delete f.motif;
  return f;
}

function load(user, id) {
  const i = getDb().prepare(`SELECT ${COLUMNS} ${FROM} WHERE i.id = ?`).get(id);
  if (!i) throw new AppError(404, 'NOT_FOUND');
  if (i.entite_id !== entiteActive(user)) throw new AppError(403, 'FORBIDDEN');
  return i;
}

const jours = (du, au) => Math.round((Date.parse(`${au}T00:00:00Z`) - Date.parse(`${du}T00:00:00Z`)) / 86400000);

/** Règles 1 et 2 : contrôles d'une période, sans rien écrire. */
function controler(entiteId, { user_id: uid, du, au, periode }, saufId = 0) {
  if (!porteurs(entiteId, 'interventions:realiser').has(uid)) throw new AppError(409, 'OUVRIER_INVALIDE', { user_id: uid });
  if (au < du) throw new AppError(409, 'INDISPO_DATES', { du, au });
  if (jours(du, au) > 365) throw new AppError(409, 'INDISPO_TROP_LONGUE');
  if (periode !== 'journee' && du !== au) throw new AppError(409, 'INDISPO_DEMI_JOUR');
  const autres = getDb().prepare(`SELECT id, du, au, periode FROM indisponibilites WHERE entite_id = ? AND user_id = ? AND id <> ?
    AND du <= ? AND au >= ?`).all(entiteId, uid, saufId, au, du);
  const conflit = autres.find((x) => periode === 'journee' || x.periode === 'journee' || x.periode === periode);
  if (conflit) throw new AppError(409, 'INDISPO_CHEVAUCHEMENT', { id: conflit.id, du: conflit.du, au: conflit.au });
}

function list(user, { user_id: uid, du, au, limit = 200, offset = 0 } = {}) {
  lecteur(user);
  const where = ['i.entite_id = ?'];
  const params = [user.entiteId];
  if (uid) { where.push('i.user_id = ?'); params.push(uid); }
  if (du) { where.push('i.au >= ?'); params.push(du); }
  if (au) { where.push('i.du <= ?'); params.push(au); }
  const db = getDb();
  const clause = `WHERE ${where.join(' AND ')}`;
  const total = db.prepare(`SELECT COUNT(*) AS n ${FROM} ${clause}`).get(...params).n;
  const rows = db.prepare(`SELECT ${COLUMNS} ${FROM} ${clause} ORDER BY i.du, u.last_name, u.first_name LIMIT ? OFFSET ?`)
    .all(...params, limit, offset).map((i) => fiche(user, i));
  return { rows, pagination: { total, limit, offset } };
}

function get(user, id) {
  lecteur(user);
  return fiche(user, load(user, id));
}

function create(user, data, channel = 'api') {
  gestion(user);
  const v = { user_id: data.user_id, du: data.du, au: data.au || data.du, periode: data.periode || 'journee', motif: data.motif };
  controler(user.entiteId, v);
  const db = getDb();
  let id;
  db.transaction(() => {
    id = db.prepare(`INSERT INTO indisponibilites (entite_id, user_id, du, au, periode, motif, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(user.entiteId, v.user_id, v.du, v.au, v.periode, v.motif, user.id, user.id).lastInsertRowid;
    logAudit(user.id, 'indisponibilite.create', 'indisponibilite', id, { ouvrier_id: v.user_id, du: v.du, au: v.au, periode: v.periode }, channel, user.entiteId);
  })();
  return get(user, id);
}

function update(user, id, data, channel = 'api') {
  gestion(user);
  const i = load(user, id);
  const v = { user_id: i.user_id, du: data.du ?? i.du, au: data.au ?? (data.du && data.du > i.au ? data.du : i.au), periode: data.periode ?? i.periode, motif: data.motif ?? i.motif };
  controler(i.entite_id, v, i.id);
  const champs = ['du', 'au', 'periode'].filter((k) => v[k] !== i[k]);
  if (!champs.length && v.motif === i.motif) return get(user, id);
  const db = getDb();
  db.transaction(() => {
    db.prepare(`UPDATE indisponibilites SET du = ?, au = ?, periode = ?, motif = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(v.du, v.au, v.periode, v.motif, user.id, id);
    // Règle 4 : jamais le motif au journal ; un changement du seul motif est noté sans dire lequel.
    logAudit(user.id, 'indisponibilite.update', 'indisponibilite', id, {
      ouvrier_id: i.user_id, avant: Object.fromEntries(champs.map((k) => [k, i[k]])), apres: Object.fromEntries(champs.map((k) => [k, v[k]])),
      ...(v.motif !== i.motif ? { motif_change: 1 } : {}),
    }, channel, i.entite_id);
  })();
  return get(user, id);
}

/** Description d'une suppression, sans l'écrire : première étape du MCP (API-06). */
function decrireSuppression(user, id) {
  gestion(user);
  const i = load(user, id);
  return { action: 'delete_indisponibilite', indisponibilite: fiche(user, i), definitif: true };
}

function remove(user, id, channel = 'api') {
  gestion(user);
  const i = load(user, id);
  const db = getDb();
  db.transaction(() => {
    db.prepare('DELETE FROM indisponibilites WHERE id = ?').run(id);
    logAudit(user.id, 'indisponibilite.delete', 'indisponibilite', id, { ouvrier_id: i.user_id, du: i.du, au: i.au, periode: i.periode }, channel, i.entite_id);
  })();
  return { id, supprimee: 1 };
}

/**
 * Règle 5 : indisponibilité d'un ouvrier un jour donné, dans une entité : 'journee', 'matin', 'apres_midi',
 * 'journee' aussi quand le matin et l'après-midi sont tous deux pris ; null s'il est là.
 */
function duJour(entiteId, userId, jour) {
  const p = getDb().prepare('SELECT periode FROM indisponibilites WHERE entite_id = ? AND user_id = ? AND du <= ? AND au >= ?')
    .all(entiteId, userId, jour, jour).map((x) => x.periode);
  if (p.includes('journee') || (p.includes('matin') && p.includes('apres_midi'))) return 'journee';
  return p[0] || null;
}

module.exports = { PERIODES, MOTIFS, list, get, create, update, remove, decrireSuppression, duJour };
