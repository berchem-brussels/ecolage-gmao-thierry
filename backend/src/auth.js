/**
 * Session et contrôle d'accès (standard v3.2, section 8.3, modèle SAGA 0.91.0).
 * - Session : jeton opaque de 32 octets aléatoires ; la base n'en garde que l'empreinte HMAC-SHA256 (clé JWT_SECRET).
 * - Cookie HttpOnly, SameSite=Strict, Secure en HTTPS, 8 heures.
 * - Jeton anti-CSRF propre à chaque session, rendu à la connexion et par /api/auth/me,
 *   exigé dans l'en-tête X-CSRF-Token de toute écriture par cookie, sinon 403 CSRF.
 * - Le même jeton de session est accepté en Authorization: Bearer pour les clients machine et le MCP (pas de CSRF).
 * - Déconnexion et désactivation suppriment la ligne de session : le jeton ne vaut plus rien.
 * - Entité active (cahier des charges ROL-03) : gardée sur la session, choisie dans l'en-tête ; req.user.roles porte
 *   les seuls rôles de la personne dans cette entité. Toute donnée d'entité se contrôle sur req.user.entiteId (SEC-01).
 */
const crypto = require('crypto');
const { JWT_SECRET, SESSION_HOURS } = require('./config');
const { getDb } = require('./database');
const { fail } = require('./envelope');

const COOKIE = 'app_session';
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const fingerprint = (token) => crypto.createHmac('sha256', JWT_SECRET).update(String(token)).digest('hex');

function readCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

const isHttps = (req) => req.secure || req.headers['x-forwarded-proto'] === 'https';

function cookie(req, value, maxAge) {
  const parts = [`${COOKIE}=${value}`, 'Path=/', `Max-Age=${maxAge}`, 'SameSite=Strict', 'HttpOnly'];
  if (isHttps(req)) parts.push('Secure');
  return parts.join('; ');
}

/** Rôles actifs d'une personne dans une entité active. */
function rolesIn(userId, entiteId) {
  if (!entiteId) return [];
  return getDb().prepare(`SELECT ur.role FROM user_roles ur JOIN entites e ON e.id = ur.entite_id
    WHERE ur.user_id = ? AND ur.entite_id = ? AND ur.is_active = 1 AND e.is_active = 1 ORDER BY ur.role`).all(userId, entiteId).map((r) => r.role);
}

/** Entité proposée à l'ouverture d'une session : l'entité de rattachement si la personne y a un rôle, sinon la première où elle en a un. */
function defaultEntite(userId) {
  const db = getDb();
  const u = db.prepare('SELECT entite_id FROM users WHERE id = ?').get(userId);
  if (u && u.entite_id && rolesIn(userId, u.entite_id).length) return u.entite_id;
  const r = db.prepare(`SELECT ur.entite_id FROM user_roles ur JOIN entites e ON e.id = ur.entite_id
    WHERE ur.user_id = ? AND ur.is_active = 1 AND e.is_active = 1 ORDER BY e.code LIMIT 1`).get(userId);
  return r ? r.entite_id : null;
}

/** Ouvre une session : ligne en base (empreintes seules), cookie posé. Renvoie le jeton et le jeton anti-CSRF. */
function openSession(req, res, user) {
  const token = crypto.randomBytes(32).toString('base64url');
  const csrf = crypto.randomBytes(24).toString('base64url');
  getDb().prepare(`INSERT INTO sessions (id, user_id, entite_id, csrf_token, expires_at) VALUES (?, ?, ?, ?, datetime('now', ?))`)
    .run(fingerprint(token), user.id, defaultEntite(user.id), csrf, `+${SESSION_HOURS} hours`);
  res.setHeader('Set-Cookie', cookie(req, token, SESSION_HOURS * 3600));
  return { token, csrf };
}

function closeSession(req, res) {
  if (req.user && req.user.sid) getDb().prepare('DELETE FROM sessions WHERE id = ?').run(req.user.sid);
  res.setHeader('Set-Cookie', cookie(req, '', 0));
}

function csrfOf(sid) {
  const row = getDb().prepare('SELECT csrf_token FROM sessions WHERE id = ?').get(sid);
  return row ? row.csrf_token : null;
}

function sameSecret(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

function authMiddleware(req, res, next) {
  const hdr = req.headers.authorization || '';
  let token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  let byCookie = false;
  if (!token) {
    token = readCookies(req)[COOKIE] || null;
    byCookie = !!token;
  }
  if (!token) return fail(res, req, 401, 'NO_TOKEN');
  const sid = fingerprint(token);
  const row = getDb().prepare(`SELECT u.id, u.email, u.user_role, u.preferred_lang, s.csrf_token, s.entite_id
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND s.expires_at > datetime('now') AND u.is_active = 1`).get(sid);
  if (!row) return fail(res, req, 401, 'BAD_TOKEN');
  if (byCookie && WRITE_METHODS.has(req.method) && !sameSecret(req.headers['x-csrf-token'], row.csrf_token)) {
    return fail(res, req, 403, 'CSRF');
  }
  const roles = rolesIn(row.id, row.entite_id);
  req.user = { id: row.id, email: row.email, role: row.user_role, lang: row.preferred_lang, sid, entiteId: roles.length ? row.entite_id : null, roles };
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return fail(res, req, 403, 'FORBIDDEN');
    next();
  };
}

/** Contrôle d'un rôle métier dans l'entité active (cahier des charges ROL-02). L'administrateur d'instance n'en reçoit aucun d'office. */
function requireEntiteRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !req.user.entiteId) return fail(res, req, 403, 'NO_ENTITE');
    if (!req.user.roles.some((r) => roles.includes(r))) return fail(res, req, 403, 'FORBIDDEN');
    next();
  };
}

/** Change l'entité active de la session ; refusé si la personne n'y a aucun rôle actif. */
function setActiveEntite(user, entiteId) {
  if (!rolesIn(user.id, entiteId).length) return false;
  getDb().prepare('UPDATE sessions SET entite_id = ? WHERE id = ?').run(entiteId, user.sid);
  return true;
}

module.exports = {
  COOKIE, readCookies, openSession, closeSession, csrfOf, authMiddleware, requireRole, requireEntiteRole,
  fingerprint, rolesIn, setActiveEntite, defaultEntite,
};
