/**
 * Journal d'audit lisible (standard v3.2, sections 9.1, 15.8 et 17.3 ; écart E-12). Lecture seule, réservée à
 * l'administrateur (décision du 22/10/2026) : le journal contient des données personnelles (qui, quand, connexions).
 * Filtres : action (exacte, ou famille « lieu » pour toutes les actions « lieu.* »), personne, entité, canal, période
 * (bornes en UTC, comme les dates de la base). Plus récent d'abord, pagination bornée. Aucune route n'écrit ni n'efface
 * le journal : seules les fonctions de service y ajoutent une ligne par logAudit().
 * Noms (0.7.4, DV-50) : chaque ligne rend aussi « noms », le code et le nom actuels des lieux et des catégories que le
 * détail désigne par leur identifiant, trouvés à la lecture ; le journal lui-même ne change pas. Un identifiant qui ne
 * correspond plus à aucune fiche est rendu avec introuvable: 1. Le bénéficiaire d'une demande reste un identifiant.
 */
const { getDb } = require('../database');
const { AppError } = require('../envelope');

const COLUMNS = `a.id, a.created_at, a.action, a.entity_type, a.entity_id, a.channel, a.details_json, a.entite_id,
  a.user_id, u.email AS user_email, u.first_name AS user_first_name, u.last_name AS user_last_name, e.code AS entite_code`;
const FROM = 'FROM audit_log a LEFT JOIN users u ON u.id = a.user_id LEFT JOIN entites e ON e.id = a.entite_id';

const admin = (user) => { if (!user || user.role !== 'admin') throw new AppError(403, 'FORBIDDEN'); };

/** Date ISO (2026-10-22T08:00:00.000Z) vers le format de la base (2026-10-22 08:00:00, UTC). */
const sqlDate = (iso) => new Date(iso).toISOString().slice(0, 19).replace('T', ' ');

function shape(r) {
  let details = null;
  try { details = r.details_json ? JSON.parse(r.details_json) : null; } catch (e) { details = null; }
  const { details_json: _ignore, ...rest } = r;
  return { ...rest, details };
}

// Clés du détail qui désignent un lieu ou une catégorie (DV-50). Le chemin « avant.parent_id » vise un champ d'une
// modification (changements() de audit.js) ; « avant » seul vise le lieu habituel quitté.
const REFERENCES = [
  { chemin: 'lieu_id', type: 'lieu' },
  { chemin: 'categorie_id', type: 'categorie' },
  { chemin: 'lieu_habituel_id', type: 'lieu', action: 'user.update' },
  { chemin: 'avant', type: 'lieu', action: 'user.lieu_habituel' },
  { chemin: 'apres', type: 'lieu', action: 'user.lieu_habituel' },
  { chemin: 'avant.parent_id', type: 'lieu', entity: 'lieu' },
  { chemin: 'apres.parent_id', type: 'lieu', entity: 'lieu' },
  { chemin: 'avant.parent_id', type: 'categorie', entity: 'categorie' },
  { chemin: 'apres.parent_id', type: 'categorie', entity: 'categorie' },
];
const NOMS = {
  lieu: `SELECT l.id, l.code, l.nom_fr, l.nom_nl, e.code AS entite_code FROM lieux l LEFT JOIN entites e ON e.id = l.entite_id
    WHERE l.id IN (SELECT value FROM json_each(?))`,
  categorie: `SELECT c.id, c.code, c.libelle_fr AS nom_fr, c.libelle_nl AS nom_nl, e.code AS entite_code FROM categories c
    LEFT JOIN entites e ON e.id = c.entite_id WHERE c.id IN (SELECT value FROM json_each(?))`,
};

const lire = (details, chemin) => chemin.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), details);

/** Identifiants de lieu et de catégorie désignés par le détail d'une ligne : [{ chemin, type, id }]. */
function references(ligne) {
  if (!ligne.details || typeof ligne.details !== 'object') return [];
  return REFERENCES
    .filter((r) => (!r.action || r.action === ligne.action) && (!r.entity || r.entity === ligne.entity_type))
    .map((r) => ({ chemin: r.chemin, type: r.type, id: lire(ligne.details, r.chemin) }))
    .filter((r) => Number.isInteger(r.id) && r.id > 0);
}

/** Ajoute « noms » à chaque ligne, en deux requêtes au plus pour toute la page. */
function avecNoms(lignes) {
  const refs = lignes.map(references);
  const trouves = {};
  for (const type of Object.keys(NOMS)) {
    const ids = [...new Set(refs.flat().filter((r) => r.type === type).map((r) => r.id))];
    trouves[type] = new Map(ids.length ? getDb().prepare(NOMS[type]).all(JSON.stringify(ids)).map((x) => [x.id, x]) : []);
  }
  return lignes.map((l, i) => {
    const noms = {};
    for (const r of refs[i]) {
      const x = trouves[r.type].get(r.id);
      noms[r.chemin] = x ? { type: r.type, ...x } : { type: r.type, id: r.id, introuvable: 1 };
    }
    return { ...l, noms };
  });
}

function list(user, { limit = 50, offset = 0, action, user_id, entite_id, channel, du, au, q } = {}) {
  admin(user);
  const where = [];
  const params = [];
  if (action) { where.push('(a.action = ? OR a.action LIKE ?)'); params.push(action, `${action}.%`); }
  if (user_id) { where.push('a.user_id = ?'); params.push(user_id); }
  if (entite_id) { where.push('a.entite_id = ?'); params.push(entite_id); }
  if (channel) { where.push('a.channel = ?'); params.push(channel); }
  if (du) { where.push('a.created_at >= ?'); params.push(sqlDate(du)); }
  if (au) { where.push('a.created_at <= ?'); params.push(sqlDate(au)); }
  if (q) { where.push('(a.action LIKE ? OR u.email LIKE ? OR a.details_json LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const db = getDb();
  const total = db.prepare(`SELECT COUNT(*) AS n ${FROM} ${clause}`).get(...params).n;
  const rows = db.prepare(`SELECT ${COLUMNS} ${FROM} ${clause} ORDER BY a.id DESC LIMIT ? OFFSET ?`).all(...params, limit, offset).map(shape);
  return { rows: avecNoms(rows), pagination: { total, limit, offset } };
}

/** Actions présentes dans le journal, pour le filtre de l'écran. */
function actions(user) {
  admin(user);
  return getDb().prepare('SELECT DISTINCT action FROM audit_log ORDER BY action').all().map((r) => r.action);
}

function get(user, id) {
  admin(user);
  const r = getDb().prepare(`SELECT ${COLUMNS} ${FROM} WHERE a.id = ?`).get(id);
  if (!r) throw new AppError(404, 'NOT_FOUND');
  return avecNoms([shape(r)])[0];
}

module.exports = { list, actions, get };
