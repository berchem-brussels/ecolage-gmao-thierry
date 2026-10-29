/**
 * Rôles des personnes par entité (cahier des charges ROL-01, ROL-02, ROL-07 ; standard v3.2, section 8.5).
 * Un rôle s'attribue dans une entité précise : un gestionnaire de l'AC n'est pas gestionnaire au CPAS sans attribution explicite.
 * Gestion réservée à l'administrateur. DELETE retire le rôle avec un motif : la ligne reste en base (annulation logique).
 * À terme, cette table est remplacée par l'application Droits ; les routes gardent leur contrat.
 */
const { getDb } = require('../database');
const { AppError } = require('../envelope');
const { logAudit } = require('../audit');
const { DEFAULT_ROLE } = require('../roles');

const COLUMNS = `ur.id, ur.user_id, ur.entite_id, ur.role, ur.is_active, ur.motif_retrait, ur.created_at, ur.updated_at,
  u.first_name, u.last_name, u.email, e.code AS entite_code, e.nom_fr AS entite_nom_fr, e.nom_nl AS entite_nom_nl`;
const FROM = 'FROM user_roles ur JOIN users u ON u.id = ur.user_id JOIN entites e ON e.id = ur.entite_id';

const admin = (user) => { if (user.role !== 'admin') throw new AppError(403, 'FORBIDDEN'); };

function load(id) {
  const r = getDb().prepare(`SELECT ${COLUMNS} ${FROM} WHERE ur.id = ?`).get(id);
  if (!r) throw new AppError(404, 'NOT_FOUND');
  return r;
}

function list(user, { limit = 50, offset = 0, q, user_id, entite_id, role, is_active = 1 } = {}) {
  admin(user);
  const where = ['ur.is_active = ?'];
  const params = [is_active];
  if (user_id) { where.push('ur.user_id = ?'); params.push(user_id); }
  if (entite_id) { where.push('ur.entite_id = ?'); params.push(entite_id); }
  if (role) { where.push('ur.role = ?'); params.push(role); }
  if (q) { where.push('(u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const clause = `WHERE ${where.join(' AND ')}`;
  const db = getDb();
  const total = db.prepare(`SELECT COUNT(*) AS n ${FROM} ${clause}`).get(...params).n;
  const rows = db.prepare(`SELECT ${COLUMNS} ${FROM} ${clause} ORDER BY u.last_name, u.first_name, e.code, ur.role LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
  return { rows, pagination: { total, limit, offset } };
}

function get(user, id) {
  admin(user);
  return load(id);
}

/** Écriture sans contrôle de droits : appelée par create() et par la création d'un compte (rôle d'office). */
function grant(byUserId, userId, entiteId, role, channel) {
  const db = getDb();
  const u = db.prepare('SELECT is_active FROM users WHERE id = ?').get(userId);
  if (!u) throw new AppError(404, 'NOT_FOUND');
  if (!u.is_active) throw new AppError(409, 'USER_INACTIVE');
  const e = db.prepare('SELECT is_active FROM entites WHERE id = ?').get(entiteId);
  if (!e) throw new AppError(404, 'NOT_FOUND');
  if (!e.is_active) throw new AppError(409, 'ENTITE_INACTIVE');
  if (db.prepare('SELECT 1 FROM user_roles WHERE user_id = ? AND entite_id = ? AND role = ? AND is_active = 1').get(userId, entiteId, role)) {
    throw new AppError(409, 'ROLE_DUPLICATE');
  }
  const r = db.prepare('INSERT INTO user_roles (user_id, entite_id, role, created_by, updated_by) VALUES (?, ?, ?, ?, ?)')
    .run(userId, entiteId, role, byUserId, byUserId);
  logAudit(byUserId, 'role.grant', 'user_role', r.lastInsertRowid, { user_id: userId, entite_id: entiteId, role }, channel, entiteId);
  return r.lastInsertRowid;
}

function create(user, data, channel = 'api') {
  admin(user);
  return load(grant(user.id, data.user_id, data.entite_id, data.role, channel));
}

function isDefaultRole(r) {
  const home = getDb().prepare('SELECT entite_id FROM users WHERE id = ?').get(r.user_id);
  return r.role === DEFAULT_ROLE && home && home.entite_id === r.entite_id;
}

function update(user, id, data, channel = 'api') {
  admin(user);
  const r = load(id);
  if (!r.is_active) throw new AppError(409, 'CANCELLED');
  if (data.role === r.role) return r;
  if (isDefaultRole(r)) throw new AppError(409, 'ROLE_DEFAUT');
  const db = getDb();
  if (db.prepare('SELECT 1 FROM user_roles WHERE user_id = ? AND entite_id = ? AND role = ? AND is_active = 1').get(r.user_id, r.entite_id, data.role)) {
    throw new AppError(409, 'ROLE_DUPLICATE');
  }
  db.prepare("UPDATE user_roles SET role = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?").run(data.role, user.id, id);
  logAudit(user.id, 'role.update', 'user_role', id, { from: r.role, to: data.role }, channel, r.entite_id);
  return load(id);
}

/** Retrait avec motif : la ligne reste, marquée inactive. Le rôle de demandeur dans l'entité de rattachement reste (ROL-01). */
function retirer(user, id, motif, channel = 'api') {
  admin(user);
  const r = load(id);
  if (!r.is_active) throw new AppError(409, 'CANCELLED');
  if (isDefaultRole(r)) throw new AppError(409, 'ROLE_DEFAUT');
  getDb().prepare("UPDATE user_roles SET is_active = 0, motif_retrait = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?")
    .run(motif, user.id, id);
  logAudit(user.id, 'role.retrait', 'user_role', id, { motif }, channel, r.entite_id);
  return load(id);
}

/** Rôles actifs d'une personne, entité par entité (profil et écran Utilisateurs). */
function ofUser(userId) {
  return getDb().prepare(`SELECT ur.id, ur.entite_id, ur.role, e.code AS entite_code FROM user_roles ur JOIN entites e ON e.id = ur.entite_id
    WHERE ur.user_id = ? AND ur.is_active = 1 ORDER BY e.code, ur.role`).all(userId);
}

module.exports = { list, get, create, update, retirer, grant, ofUser };
