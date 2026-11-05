/**
 * Connexion Microsoft compatible avec Portal (standard, section 8.6) et réglages de connexion (administrateur).
 * GET /api/auth/config, GET /api/auth/sso/start, GET /api/auth/callback : routes libres.
 * GET et PUT /api/settings/auth : administrateur ; le secret est chiffré et jamais renvoyé (services/connexion.js, partagé avec le MCP).
 * Repris du gabarit 1.3.0 ; seule adaptation à la GMAO : les réglages passent par services/connexion.js (DV-104).
 */
const express = require('express');
const { getDb } = require('../database');
const { ok, handle } = require('../envelope');
const { openSession, readCookies, isHttps, appendCookie, authMiddleware, requireRole } = require('../auth');
const { validate } = require('../validation');
const { logAudit } = require('../audit');
const { getSetting, listSetting } = require('../settings');
const connexion = require('../services/connexion');
const oidc = require('../oidc');
const S = require('../schemas');

const router = express.Router();
const STATE_COOKIE = 'app_oidc';
const PENDING_MINUTES = 15;

function config() {
  return {
    mode: getSetting('auth.mode'),
    tenant: getSetting('auth.tenant'),
    clientId: getSetting('auth.client_id'),
    clientSecret: getSetting('auth.client_secret'),
    publicUrl: getSetting('auth.public_url').replace(/\/$/, ''),
  };
}
const microsoftReady = (c) => !!(c.tenant && c.clientId && c.clientSecret && c.publicUrl);
const redirectUri = (c) => `${c.publicUrl}/api/auth/callback`;

function stateCookie(req, value, maxAge) {
  const parts = [`${STATE_COOKIE}=${value}`, 'Path=/api/auth', `Max-Age=${maxAge}`, 'SameSite=Lax', 'HttpOnly'];
  if (isHttps(req)) parts.push('Secure');
  return parts.join('; ');
}

router.get('/auth/config', (req, res) => {
  const c = config();
  const installed = getDb().prepare('SELECT COUNT(*) AS n FROM users').get().n > 0;
  ok(res, { mode: c.mode, microsoft: c.mode !== 'local' && microsoftReady(c), installed }, { resource: 'auth' });
});

router.get('/auth/sso/start', (req, res) => {
  const c = config();
  if (c.mode === 'local' || !microsoftReady(c)) return res.redirect(302, '/login?erreur=SSO_NOT_CONFIGURED');
  const p = oidc.newPending();
  const db = getDb();
  db.prepare("DELETE FROM auth_pending WHERE created_at < datetime('now', ?)").run(`-${PENDING_MINUTES} minutes`);
  db.prepare('INSERT INTO auth_pending (state, nonce, verifier, next_path) VALUES (?, ?, ?, ?)')
    .run(p.state, p.nonce, p.verifier, oidc.safeNext(req.query.next));
  appendCookie(res, stateCookie(req, p.state, 600));
  res.redirect(302, oidc.authorizeUrl({ tenant: c.tenant, clientId: c.clientId, redirectUri: redirectUri(c), ...p }));
});

router.get('/auth/callback', handle(async (req, res) => {
  const fail302 = (code) => { appendCookie(res, stateCookie(req, '', 0)); return res.redirect(302, `/login?erreur=${code}`); };
  const c = config();
  if (!microsoftReady(c)) return fail302('SSO_NOT_CONFIGURED');
  const state = String(req.query.state || '');
  const db = getDb();
  const pending = db.prepare(`SELECT * FROM auth_pending WHERE state = ? AND created_at > datetime('now', ?)`).get(state, `-${PENDING_MINUTES} minutes`);
  db.prepare('DELETE FROM auth_pending WHERE state = ?').run(state);
  if (!pending || readCookies(req)[STATE_COOKIE] !== state) return fail302('SSO_STATE');
  if (req.query.error || !req.query.code) return fail302('SSO_MICROSOFT');
  let claims;
  try {
    const idToken = await oidc.exchangeCode({ tenant: c.tenant, clientId: c.clientId, clientSecret: c.clientSecret, redirectUri: redirectUri(c), code: String(req.query.code), verifier: pending.verifier });
    claims = await oidc.verifyIdToken(idToken, { tenant: c.tenant, clientId: c.clientId, nonce: pending.nonce });
  } catch (e) {
    logAudit(null, 'sso.refused', 'user', null, { reason: e.message });
    return fail302('SSO_TOKEN');
  }
  const email = String(claims.email || claims.preferred_username || '').toLowerCase();
  const domains = listSetting('auth.domains').map((d) => d.toLowerCase());
  if (domains.length && !domains.some((d) => email.endsWith(`@${d}`))) {
    logAudit(null, 'sso.refused', 'user', null, { reason: 'domain' });
    return fail302('SSO_DOMAIN');
  }
  const user = (claims.oid && db.prepare('SELECT id, is_active FROM users WHERE oid = ?').get(claims.oid))
    || db.prepare('SELECT id, is_active FROM users WHERE email = ? AND (oid IS NULL OR oid = ?)').get(email, claims.oid || '');
  if (!user || !user.is_active) {
    logAudit(user ? user.id : null, 'sso.unknown_account', 'user', user ? user.id : null, null);
    return fail302('SSO_UNKNOWN_ACCOUNT');
  }
  if (claims.oid) db.prepare('UPDATE users SET oid = ? WHERE id = ? AND oid IS NULL').run(claims.oid, user.id);
  appendCookie(res, stateCookie(req, '', 0));
  openSession(req, res, user);
  logAudit(user.id, 'login.success', 'user', user.id, { method: 'sso' });
  res.redirect(302, oidc.safeNext(pending.next_path));
}));

// Réglages : même fonction de service que l'outil MCP (services/connexion.js, DV-104).
router.get('/settings/auth', authMiddleware, requireRole('admin'), handle((req, res) => {
  ok(res, connexion.lire(req.user), { resource: 'settings' });
}));

router.put('/settings/auth', authMiddleware, requireRole('admin'), validate(S.authSettings), handle((req, res) => {
  ok(res, connexion.regler(req.user, req.body), { resource: 'settings' });
}));

router.PUBLIC_ROUTES = ['GET /api/auth/config', 'GET /api/auth/sso/start', 'GET /api/auth/callback'];
module.exports = router;
