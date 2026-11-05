/**
 * OpenID Connect côté serveur avec Microsoft Entra ID (standard, sections 8.2 et 8.6).
 * Code d'autorisation avec PKCE S256, aucun paramètre prompt ni max_age, jeton d'identité vérifié :
 * RS256 seul, clé publiée par Microsoft (cache d'une heure), émetteur du locataire, audience, expiration, nonce.
 * Aucune bibliothèque OpenID Connect : crypto et fetch de Node. L'autorité se remplace par APP_OIDC_AUTHORITY pour les tests.
 */
const crypto = require('crypto');

const authority = () => (process.env.APP_OIDC_AUTHORITY || 'https://login.microsoftonline.com').replace(/\/$/, '');
const b64url = (buf) => Buffer.from(buf).toString('base64url');
const random = (n = 32) => crypto.randomBytes(n).toString('base64url');

function newPending() {
  const verifier = random(48);
  return { state: random(24), nonce: random(24), verifier, challenge: b64url(crypto.createHash('sha256').update(verifier).digest()) };
}

function authorizeUrl({ tenant, clientId, redirectUri, state, nonce, challenge }) {
  const p = new URLSearchParams({
    client_id: clientId, response_type: 'code', response_mode: 'query', redirect_uri: redirectUri,
    scope: 'openid profile email', state, nonce, code_challenge: challenge, code_challenge_method: 'S256',
  });
  return `${authority()}/${encodeURIComponent(tenant)}/oauth2/v2.0/authorize?${p.toString()}`;
}

async function exchangeCode({ tenant, clientId, clientSecret, redirectUri, code, verifier }) {
  const body = new URLSearchParams({
    client_id: clientId, client_secret: clientSecret, grant_type: 'authorization_code',
    code, redirect_uri: redirectUri, code_verifier: verifier, scope: 'openid profile email',
  });
  const res = await fetch(`${authority()}/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.id_token) throw new Error('OIDC_EXCHANGE');
  return json.id_token;
}

const jwksCache = new Map();
async function keys(tenant) {
  const hit = jwksCache.get(tenant);
  if (hit && hit.until > Date.now()) return hit.keys;
  const res = await fetch(`${authority()}/${encodeURIComponent(tenant)}/discovery/v2.0/keys`);
  const json = await res.json();
  if (!res.ok || !Array.isArray(json.keys)) throw new Error('OIDC_JWKS');
  jwksCache.set(tenant, { keys: json.keys, until: Date.now() + 3600 * 1000 });
  return json.keys;
}

/** Vérifie le jeton d'identité ; lève une erreur au moindre écart. */
async function verifyIdToken(idToken, { tenant, clientId, nonce }) {
  const parts = String(idToken).split('.');
  if (parts.length !== 3) throw new Error('OIDC_TOKEN');
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
  const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  if (header.alg !== 'RS256') throw new Error('OIDC_ALG');
  const jwk = (await keys(tenant)).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('OIDC_KEY');
  const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const valid = crypto.verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], 'base64url'));
  if (!valid) throw new Error('OIDC_SIGNATURE');
  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== `${authority()}/${tenant}/v2.0`) throw new Error('OIDC_ISSUER');
  if (claims.aud !== clientId) throw new Error('OIDC_AUDIENCE');
  if (!claims.exp || claims.exp < now - 60) throw new Error('OIDC_EXPIRED');
  if (claims.nonce !== nonce) throw new Error('OIDC_NONCE');
  return claims;
}

/** Chemin de retour accepté seulement s'il commence par un seul « / » et ne contient que des caractères sûrs. */
function safeNext(next) {
  const s = String(next || '');
  return /^\/(?![/\\])[A-Za-z0-9\-._~/]*$/.test(s) ? s : '/';
}

module.exports = { newPending, authorizeUrl, exchangeCode, verifyIdToken, safeNext, authority };
