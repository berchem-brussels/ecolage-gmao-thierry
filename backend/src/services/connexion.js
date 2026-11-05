/**
 * Réglages de la connexion Microsoft (standard, section 8.6), communs à la route REST et au MCP (section 7.4).
 * Logique reprise telle quelle de routes/sso.js du gabarit 1.3.0 (GET et PUT /api/settings/auth), sortie de la route
 * pour que l'outil MCP appelle la même fonction (DV-104). Administrateur seulement ; le secret est chiffré et jamais renvoyé.
 */
const { getDb } = require('../database');
const { AppError } = require('../envelope');
const { logAudit } = require('../audit');
const { getSetting, setSetting, isSet } = require('../settings');

const MAP = { mode: 'auth.mode', tenant: 'auth.tenant', client_id: 'auth.client_id', client_secret: 'auth.client_secret', public_url: 'auth.public_url', domains: 'auth.domains' };
const admin = (user) => { if (!user || user.role !== 'admin') throw new AppError(403, 'FORBIDDEN'); };

function lire(user) {
  admin(user);
  const publicUrl = getSetting('auth.public_url').replace(/\/$/, '');
  return {
    mode: getSetting('auth.mode'), tenant: getSetting('auth.tenant'), client_id: getSetting('auth.client_id'), public_url: publicUrl,
    domains: getSetting('auth.domains'), secret_set: isSet('auth.client_secret'), redirect_uri: publicUrl ? `${publicUrl}/api/auth/callback` : null,
  };
}

function regler(user, b, channel = 'api') {
  admin(user);
  if (b.mode === 'sso') {
    const n = getDb().prepare("SELECT COUNT(*) AS n FROM users WHERE user_role = 'admin' AND is_active = 1 AND (is_admin_local = 1 OR oid IS NOT NULL)").get().n;
    if (!n) throw new AppError(409, 'SSO_NO_ADMIN');
  }
  for (const [k, v] of Object.entries(b)) if (v !== undefined) setSetting(MAP[k], v);
  logAudit(user.id, 'settings.auth', 'settings', null, { ...b, client_secret: b.client_secret ? '***' : undefined }, channel);
  return lire(user);
}

module.exports = { lire, regler };
