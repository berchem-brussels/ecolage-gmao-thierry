/**
 * Fonctions de service des comptes. À terme remplacées par l'application Droits (standard v3.2, section 8.5).
 * Création sur le modèle Microsoft 365 (section 8.1) : mot de passe généré (rendu une seule fois, jamais stocké en clair
 * ni journalisé) ou encodé par le gestionnaire ; changement à la première connexion seulement si la case est cochée.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getDb, safeBuildUpdate } = require('../database');
const { AppError } = require('../envelope');
const { logAudit } = require('../audit');
const { DEFAULT_ROLE } = require('../roles');
const rolesUtilisateurs = require('./roles-utilisateurs');
const parametres = require('./parametres');
const { VERSION } = require('../config');

const COLUMNS = 'id, email, first_name, last_name, user_role, entite_id, preferred_lang, lieu_habituel_id, is_active, is_demo, must_change_password, created_at, updated_at';

/** L'entité de rattachement doit exister et être active (cahier des charges ROL-01). */
function assertEntite(entiteId) {
  const e = getDb().prepare('SELECT is_active FROM entites WHERE id = ?').get(entiteId);
  if (!e) throw new AppError(400, 'ENTITE_REQUIRED');
  if (!e.is_active) throw new AppError(409, 'ENTITE_INACTIVE');
}

/** Rôle de demandeur d'office dans l'entité de rattachement, s'il n'y est pas déjà. */
function ensureDefaultRole(byUserId, userId, entiteId, channel) {
  const has = getDb().prepare('SELECT 1 FROM user_roles WHERE user_id = ? AND entite_id = ? AND role = ? AND is_active = 1').get(userId, entiteId, DEFAULT_ROLE);
  if (!has) rolesUtilisateurs.grant(byUserId, userId, entiteId, DEFAULT_ROLE, channel);
}

function load(id) {
  const u = getDb().prepare(`SELECT ${COLUMNS} FROM users WHERE id = ?`).get(id);
  if (!u) throw new AppError(404, 'NOT_FOUND');
  return u;
}

function list(user, { limit = 50, offset = 0, q, is_active, entite_id } = {}) {
  const where = [];
  const params = [];
  if (entite_id) { where.push('entite_id = ?'); params.push(entite_id); }
  if (q) { where.push('(email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (is_active !== undefined) { where.push('is_active = ?'); params.push(is_active); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const db = getDb();
  const total = db.prepare(`SELECT COUNT(*) AS n FROM users ${clause}`).get(...params).n;
  const rows = db.prepare(`SELECT ${COLUMNS} FROM users ${clause} ORDER BY last_name, first_name LIMIT ? OFFSET ?`).all(...params, limit, offset)
    .map((u) => ({ ...u, roles: rolesUtilisateurs.ofUser(u.id) }));
  return { rows, pagination: { total, limit, offset } };
}

function get(user, id) {
  if (user.role !== 'admin' && user.id !== id) throw new AppError(403, 'FORBIDDEN');
  return { ...load(id), roles: rolesUtilisateurs.ofUser(id) };
}

function create(user, data, channel = 'api') {
  const db = getDb();
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(data.email)) throw new AppError(409, 'DUPLICATE');
  assertEntite(data.entite_id);
  const generated = (data.password_mode || 'generated') === 'generated';
  const password = generated ? crypto.randomBytes(12).toString('base64url') : data.password;
  const hash = bcrypt.hashSync(password, 10);
  const id = db.transaction(() => {
    // Langue et niveau de détail : défauts de l'instance (Paramètres) ; la note de version en cours n'est pas montrée
    // à un compte nouveau (version_vue = version installée).
    const r = db.prepare(`INSERT INTO users (email, first_name, last_name, user_role, entite_id, preferred_lang, ui_mode, password_hash, must_change_password,
      version_vue, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(data.email, data.first_name, data.last_name, data.user_role || 'agent',
      data.entite_id, data.preferred_lang || parametres.valeur('app.default_lang'), parametres.valeur('app.default_ui_mode'), hash,
      data.must_change_password ? 1 : 0, VERSION, user.id, user.id);
    // Ni le mot de passe ni son mode ne vont au journal ; le mot de passe généré n'est rendu qu'une fois.
    logAudit(user.id, 'user.create', 'user', r.lastInsertRowid, { email: data.email, role: data.user_role || 'agent', entite_id: data.entite_id }, channel, data.entite_id);
    ensureDefaultRole(user.id, r.lastInsertRowid, data.entite_id, channel);
    return r.lastInsertRowid;
  })();
  const out = get(user, id);
  return generated ? { ...out, generated_password: password } : out;
}

function activeAdminCount() {
  return getDb().prepare("SELECT COUNT(*) AS n FROM users WHERE user_role = 'admin' AND is_active = 1").get().n;
}

function update(user, id, data, channel = 'api') {
  const target = load(id);
  const losesAdmin = target.user_role === 'admin' && target.is_active === 1
    && ((data.user_role && data.user_role !== 'admin') || data.is_active === 0);
  if (losesAdmin && activeAdminCount() <= 1) throw new AppError(409, 'LAST_ADMIN');
  if (data.entite_id !== undefined) assertEntite(data.entite_id);
  // Lieu habituel : actif, dans une entité où le compte a un rôle (REF-04, DV-42).
  if (data.lieu_habituel_id !== undefined) require('./demandes').controlerLieuHabituel(id, data.lieu_habituel_id);
  const { sets, params } = safeBuildUpdate(data, ['id', 'email', 'password_hash']);
  const db = getDb();
  if (sets.length) {
    db.transaction(() => {
      db.prepare(`UPDATE users SET ${sets.join(', ')}, updated_by = ?, updated_at = datetime('now') WHERE id = ?`).run(...params, user.id, id);
      if (data.is_active === 0) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
      logAudit(user.id, 'user.update', 'user', id, data, channel);
      const after = load(id);
      if (data.entite_id !== undefined && after.is_active) ensureDefaultRole(user.id, id, data.entite_id, channel);
    })();
  }
  return get(user, id);
}

/** Désactivation : le compte reste en base, ses sessions sont fermées. */
function deactivate(user, id, channel = 'api') {
  return update(user, id, { is_active: 0 }, channel);
}

module.exports = { list, get, create, update, deactivate, activeAdminCount };
