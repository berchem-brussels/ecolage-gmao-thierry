/**
 * Réglages de la connexion Microsoft (standard, section 8.6), communs à la route REST et au MCP (section 7.4).
 * Logique reprise telle quelle de routes/sso.js du gabarit 1.3.0 (GET et PUT /api/settings/auth), sortie de la route
 * pour que l'outil MCP appelle la même fonction (DV-104). Administrateur seulement ; le secret est chiffré et jamais renvoyé.
 *
 * Ajouts de la 0.11.0 (recette de la 0.10.0, DV-106) :
 * - un secret qui a la forme d'un identifiant (ID du secret d'Entra ID, xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) est refusé,
 *   400 SECRET_IS_ID : c'est la colonne Valeur qui sert, jamais l'ID du secret ;
 * - la lecture rend la date et l'auteur du dernier enregistrement (« Enregistré le … par … »), lus dans le journal d'audit
 *   (action settings.auth) : aucune colonne nouvelle, aucune migration.
 */
const { getDb } = require('../database');
const { AppError } = require('../envelope');
const { logAudit } = require('../audit');
const { getSetting, setSetting, isSet } = require('../settings');

const MAP = { mode: 'auth.mode', tenant: 'auth.tenant', client_id: 'auth.client_id', client_secret: 'auth.client_secret', public_url: 'auth.public_url', domains: 'auth.domains' };
const ID_SECRET = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const admin = (user) => { if (!user || user.role !== 'admin') throw new AppError(403, 'FORBIDDEN'); };
const iso = (s) => (s ? `${String(s).replace(' ', 'T')}Z` : null);

/** Dernier enregistrement des réglages : date UTC et nom de l'auteur, ou null si les réglages n'ont jamais été enregistrés. */
function dernierEnregistrement() {
  const r = getDb().prepare(`SELECT a.created_at, u.first_name, u.last_name FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
    WHERE a.action = 'settings.auth' ORDER BY a.id DESC LIMIT 1`).get();
  if (!r) return null;
  const nom = `${r.first_name || ''} ${r.last_name || ''}`.trim();
  return { le: iso(r.created_at), par: nom || null };
}

function lire(user) {
  admin(user);
  const publicUrl = getSetting('auth.public_url').replace(/\/$/, '');
  return {
    mode: getSetting('auth.mode'), tenant: getSetting('auth.tenant'), client_id: getSetting('auth.client_id'), public_url: publicUrl,
    domains: getSetting('auth.domains'), secret_set: isSet('auth.client_secret'), redirect_uri: publicUrl ? `${publicUrl}/api/auth/callback` : null,
    enregistre: dernierEnregistrement(),
  };
}

function regler(user, b, channel = 'api') {
  admin(user);
  if (b.client_secret && ID_SECRET.test(b.client_secret)) throw new AppError(400, 'SECRET_IS_ID');
  if (b.mode === 'sso') {
    const n = getDb().prepare("SELECT COUNT(*) AS n FROM users WHERE user_role = 'admin' AND is_active = 1 AND (is_admin_local = 1 OR oid IS NOT NULL)").get().n;
    if (!n) throw new AppError(409, 'SSO_NO_ADMIN');
  }
  for (const [k, v] of Object.entries(b)) if (v !== undefined) setSetting(MAP[k], v);
  logAudit(user.id, 'settings.auth', 'settings', null, { ...b, client_secret: b.client_secret ? '***' : undefined }, channel);
  return lire(user);
}

module.exports = { lire, regler, ID_SECRET };
