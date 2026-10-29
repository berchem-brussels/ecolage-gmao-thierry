/**
 * Connexion locale, session (jeton opaque et jeton anti-CSRF par session), profil. Le SSO Entra ID (mode préconisé) se branche sur le patron
 * OpenID Connect côté serveur de PILOT (src/lib/oidc.js) : non inclus dans ce gabarit (README, « À construire »).
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { getDb } = require('../database');
const { openSession, closeSession, authMiddleware, csrfOf, fingerprint } = require('../auth');
const { validate } = require('../validation');
const { ok, fail, handle } = require('../envelope');
const { logAudit } = require('../audit');
const { TEST_MODE } = require('../config');
const S = require('../schemas');
const session = require('../services/session');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: TEST_MODE ? 1000 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => fail(res, req, 429, 'TOO_MANY'),
});

router.post('/login', loginLimiter, validate(S.login), handle((req, res) => {
  const db = getDb();
  const u = db.prepare('SELECT id, password_hash FROM users WHERE email = ? AND is_active = 1').get(req.body.email.trim());
  if (!u || !u.password_hash || !u.password_hash.startsWith('$2') || !bcrypt.compareSync(req.body.password, u.password_hash)) {
    logAudit(u ? u.id : null, 'login.failure', 'user', u ? u.id : null, null);
    return fail(res, req, 401, 'LOGIN_FAILED');
  }
  const { token, csrf } = openSession(req, res, u);
  logAudit(u.id, 'login.success', 'user', u.id, { method: 'local' });
  ok(res, { user: session.profil({ id: u.id, sid: fingerprint(token) }), token, csrf_token: csrf }, { resource: 'session' });
}));

router.post('/logout', authMiddleware, handle((req, res) => {
  logAudit(req.user.id, 'logout', 'user', req.user.id, null);
  closeSession(req, res);
  ok(res, { closed: true }, { resource: 'session' });
}));

router.get('/me', authMiddleware, handle((req, res) => {
  ok(res, { ...session.profil(req.user), csrf_token: csrfOf(req.user.sid) }, { resource: 'session' });
}));

/** Entité active de la session (cahier des charges ROL-03) : seulement une entité où la personne a un rôle actif. */
router.put('/entite', authMiddleware, validate(S.entiteActive), handle((req, res) => {
  ok(res, session.choisirEntite(req.user, req.body.entite_id), { resource: 'session' });
}));

/** Nouveautés de la version lues (note affichée à la première connexion après une mise à jour). */
router.put('/nouveautes', authMiddleware, validate(S.nouveautesLues), handle((req, res) => {
  ok(res, session.nouveautesLues(req.user), { resource: 'session' });
}));

/** Lieu de travail habituel, proposé d'office dans les demandes (REF-04, DV-42) ; null l'efface. */
router.put('/lieu-habituel', authMiddleware, validate(S.lieuHabituel), handle((req, res) => {
  ok(res, session.lieuHabituel(req.user, req.body.lieu_id), { resource: 'session' });
}));

router.put('/password', authMiddleware, validate(S.changePassword), handle((req, res) => {
  const db = getDb();
  const u = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!u.password_hash || !bcrypt.compareSync(req.body.current_password, u.password_hash)) return fail(res, req, 400, 'BAD_PASSWORD');
  db.prepare("UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = datetime('now') WHERE id = ?")
    .run(bcrypt.hashSync(req.body.new_password, 10), req.user.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND id <> ?').run(req.user.id, req.user.sid);
  logAudit(req.user.id, 'password.change', 'user', req.user.id, null);
  ok(res, { changed: true }, { resource: 'session' });
}));

/** Préférences par utilisateur, en base (patron PILOT pref_utilisateur) : langue, niveau de détail, thème. */
router.put('/preferences', authMiddleware, validate(S.preferences), handle((req, res) => {
  const db = getDb();
  for (const [k, v] of Object.entries(req.body)) {
    db.prepare(`UPDATE users SET ${k} = ?, updated_at = datetime('now') WHERE id = ?`).run(v, req.user.id);
  }
  ok(res, session.profil(req.user), { resource: 'session' });
}));

module.exports = router;
