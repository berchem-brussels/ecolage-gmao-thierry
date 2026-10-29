/**
 * Entités juridiques servies par l'instance (cahier des charges, section 5.1) : par exemple une administration communale et
 * un CPAS, ou une seule entité ailleurs. Elles sont des données, jamais des valeurs du code (ADM-04).
 * Lecture pour toute personne connectée ; création, modification et désactivation par l'administrateur.
 * Les personnes d'une entité se lisent par les rôles habilités de cette entité seulement (cloison SEC-01).
 */
const { getDb, safeBuildUpdate } = require('../database');
const { AppError } = require('../envelope');
const { logAudit, changements } = require('../audit');
const { MEMBRES_ROLES } = require('../roles');
const { seedEntite } = require('./listes-valeurs');
const categories = require('./categories');
const priorites = require('./priorites');
const calendrier = require('./calendrier');

const COLUMNS = 'id, code, nom_fr, nom_nl, is_active, motif_desactivation, created_at, updated_at';

const admin = (user) => { if (user.role !== 'admin') throw new AppError(403, 'FORBIDDEN'); };

function load(id) {
  const e = getDb().prepare(`SELECT ${COLUMNS} FROM entites WHERE id = ?`).get(id);
  if (!e) throw new AppError(404, 'NOT_FOUND');
  return e;
}

function list(user, { limit = 50, offset = 0, q, is_active } = {}) {
  const where = [];
  const params = [];
  if (is_active !== undefined) { where.push('is_active = ?'); params.push(is_active); }
  if (q) { where.push('(code LIKE ? OR nom_fr LIKE ? OR nom_nl LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const db = getDb();
  const total = db.prepare(`SELECT COUNT(*) AS n FROM entites ${clause}`).get(...params).n;
  const rows = db.prepare(`SELECT ${COLUMNS} FROM entites ${clause} ORDER BY code LIMIT ? OFFSET ?`).all(...params, limit, offset);
  return { rows, pagination: { total, limit, offset } };
}

function get(user, id) {
  return load(id);
}

function assertCodeFree(code, exceptId = 0) {
  if (getDb().prepare('SELECT 1 FROM entites WHERE code = ? AND id <> ?').get(code, exceptId)) throw new AppError(409, 'CODE_DUPLICATE');
}

function create(user, data, channel = 'api') {
  admin(user);
  assertCodeFree(data.code);
  const r = getDb().prepare('INSERT INTO entites (code, nom_fr, nom_nl, created_by, updated_by) VALUES (?, ?, ?, ?, ?)')
    .run(data.code, data.nom_fr, data.nom_nl, user.id, user.id);
  logAudit(user.id, 'entite.create', 'entite', r.lastInsertRowid, { code: data.code }, channel, r.lastInsertRowid);
  seedEntite(r.lastInsertRowid); // listes de valeurs livrées de la nouvelle entité (REF-08)
  categories.seedEntite(r.lastInsertRowid); // arbre livré des catégories (REF-06)
  require('./questions-categorie').seedEntite(r.lastInsertRowid); // questions livrées des catégories (DEM-05)
  priorites.seedEntite(r.lastInsertRowid); // priorités et délais livrés (PRI-02)
  calendrier.seedEntite(r.lastInsertRowid); // horaire et congés livrés (PRI-02)
  return load(r.lastInsertRowid);
}

function activeCount() {
  return getDb().prepare('SELECT COUNT(*) AS n FROM entites WHERE is_active = 1').get().n;
}

function update(user, id, data, channel = 'api') {
  admin(user);
  const e = load(id);
  if (data.code !== undefined) assertCodeFree(data.code, id);
  if (data.is_active === 0 && e.is_active === 1 && activeCount() <= 1) throw new AppError(409, 'LAST_ENTITE');
  // Journal (0.4.1) : seuls les champs changés, avec l'ancienne et la nouvelle valeur ; rien n'est écrit sans changement.
  const diff = changements('entites', id, data);
  if (diff) {
    const { sets, params } = safeBuildUpdate(diff.apres, ['id']);
    if (diff.apres.is_active === 1) sets.push('motif_desactivation = NULL');
    getDb().prepare(`UPDATE entites SET ${sets.join(', ')}, updated_by = ?, updated_at = datetime('now') WHERE id = ?`).run(...params, user.id, id);
    logAudit(user.id, 'entite.update', 'entite', id, { code: e.code, ...diff }, channel, id);
  }
  return load(id);
}

/** DELETE = désactivation avec motif ; l'entité et ses données restent en base. */
function deactivate(user, id, motif, channel = 'api') {
  admin(user);
  const e = load(id);
  if (e.is_active === 0) throw new AppError(409, 'ENTITE_INACTIVE');
  if (activeCount() <= 1) throw new AppError(409, 'LAST_ENTITE');
  getDb().prepare("UPDATE entites SET is_active = 0, motif_desactivation = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?")
    .run(motif, user.id, id);
  logAudit(user.id, 'entite.deactivate', 'entite', id, { motif }, channel, id);
  return load(id);
}

/**
 * Personnes qui ont un rôle actif dans l'entité. Réservé à l'administrateur et aux rôles habilités
 * de cette même entité, quand elle est l'entité active : un gestionnaire de l'une ne voit jamais l'autre.
 */
function membres(user, id) {
  load(id);
  const habilite = user.role === 'admin' || (user.entiteId === id && user.roles.some((r) => MEMBRES_ROLES.includes(r)));
  if (!habilite) throw new AppError(403, 'FORBIDDEN');
  const db = getDb();
  const people = db.prepare(`SELECT DISTINCT u.id, u.first_name, u.last_name, u.email FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    WHERE ur.entite_id = ? AND ur.is_active = 1 AND u.is_active = 1 ORDER BY u.last_name, u.first_name`).all(id);
  return people.map((p) => ({
    ...p,
    roles: db.prepare('SELECT role FROM user_roles WHERE user_id = ? AND entite_id = ? AND is_active = 1 ORDER BY role').all(p.id, id).map((r) => r.role),
  }));
}

module.exports = { list, get, create, update, deactivate, membres, activeCount };
