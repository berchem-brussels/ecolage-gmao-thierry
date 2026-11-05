/**
 * Connexion Microsoft compatible avec Portal (standard, section 8.6), jouée contre un faux Microsoft qui signe ses jetons.
 * Tests du gabarit 1.3.0 repris ; adaptés à la GMAO : installation avec entité (setup), écran /demandes, compte rattaché
 * à une entité ; ajoutés : compte désactivé, mode sso_optional, accès de secours sur la fiche, MCP, paramètres publics.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const crypto = require('crypto');
const { startServer, client, setup } = require('./helpers');
const { getDb } = require('../src/database');
const { safeNext } = require('../src/oidc');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const TENANT = 'tenant-test';
const CLIENT = 'client-test';
const good = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const bad = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
let ms;
let authority;
let nextClaims = {};
let srv;
let admin;
let ea;

function sign(claims, key = good.privateKey) {
  const h = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'k1', typ: 'JWT' })).toString('base64url');
  const p = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${h}.${p}.${crypto.sign('RSA-SHA256', Buffer.from(`${h}.${p}`), key).toString('base64url')}`;
}

before(async () => {
  ms = http.createServer((req, res) => {
    if (req.url.endsWith('/discovery/v2.0/keys')) {
      const jwk = good.publicKey.export({ format: 'jwk' });
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ keys: [{ ...jwk, kid: 'k1', alg: 'RS256', use: 'sig' }] }));
    }
    if (req.url.endsWith('/oauth2/v2.0/token')) {
      res.setHeader('Content-Type', 'application/json');
      if (nextClaims.refus) {
        // Réponse de Microsoft quand l'ID du secret a été saisi à la place de sa valeur (recette de la 0.10.0).
        res.statusCode = 401;
        return res.end(JSON.stringify({ error: 'invalid_client', error_description: 'AADSTS7000215: Invalid client secret provided. Trace ID: 00000000-0000-0000-0000-000000000000' }));
      }
      return res.end(JSON.stringify({ id_token: nextClaims.token }));
    }
    res.statusCode = 404; res.end();
  });
  await new Promise((r) => ms.listen(0, '127.0.0.1', r));
  authority = `http://127.0.0.1:${ms.address().port}`;
  process.env.APP_OIDC_AUTHORITY = authority;
  srv = await startServer();
  ({ admin, ea } = await setup(srv.base));
  const r = await admin.put('/api/settings/auth', { mode: 'sso_optional', tenant: TENANT, client_id: CLIENT, client_secret: 'secret-de-test', public_url: 'https://app.exemple.test' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
});
after(async () => { await srv.stop(); ms.close(); });

async function start(next = '/demandes') {
  const res = await fetch(`${srv.base}/api/auth/sso/start?next=${encodeURIComponent(next)}`, { redirect: 'manual' });
  const loc = new URL(res.headers.get('location'));
  return { res, loc, state: loc.searchParams.get('state'), nonce: loc.searchParams.get('nonce') };
}
async function callback(state, cookieState, claims, key) {
  nextClaims.token = sign(claims, key);
  return fetch(`${srv.base}/api/auth/callback?code=code-test&state=${state}`, { redirect: 'manual', headers: { Cookie: `app_oidc=${cookieState}` } });
}
const claimsFor = (nonce, extra = {}) => ({
  iss: `${authority}/${TENANT}/v2.0`, aud: CLIENT, nonce, oid: 'oid-admin', email: 'admin@exemple.test',
  exp: Math.floor(Date.now() / 1000) + 600, ...extra,
});

test('installation : le premier administrateur garde l’accès de secours par mot de passe', async () => {
  const u = (await admin.get('/api/users')).body.data.find((x) => x.email === 'admin@exemple.test');
  assert.equal(u.is_admin_local, 1);
  assert.equal(u.microsoft, 0);
  assert.equal(u.oid, undefined, 'l’identifiant Microsoft n’est jamais rendu');
});

test('adresse d’autorisation : PKCE S256, state, nonce, aucun prompt ni max_age ; cookie d’état Lax sur /api/auth', async () => {
  const { res, loc } = await start();
  assert.equal(res.status, 302);
  assert.equal(loc.pathname, `/${TENANT}/oauth2/v2.0/authorize`);
  assert.equal(loc.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(loc.searchParams.get('state') && loc.searchParams.get('nonce') && loc.searchParams.get('code_challenge'));
  assert.equal(loc.searchParams.get('prompt'), null);
  assert.equal(loc.searchParams.get('max_age'), null);
  assert.equal(loc.searchParams.get('redirect_uri'), 'https://app.exemple.test/api/auth/callback');
  const c = res.headers.get('set-cookie');
  assert.match(c, /app_oidc=/); assert.match(c, /SameSite=Lax/); assert.match(c, /Path=\/api\/auth/); assert.match(c, /HttpOnly/);
});

test('retour valide : session Strict ouverte, retour à l’écran demandé, oid enregistré', async () => {
  const { state, nonce } = await start('/demandes');
  const res = await callback(state, state, claimsFor(nonce));
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/demandes');
  const cookies = res.headers.getSetCookie().join(' | ');
  assert.match(cookies, /app_session=[^;]+; .*SameSite=Strict/);
  // GMAO 0.10.0 : le cookie d'état est effacé au retour, à côté du cookie de session (appendCookie, section 8.6).
  assert.match(cookies, /app_oidc=; Path=\/api\/auth; Max-Age=0/);
  assert.equal(getDb().prepare("SELECT oid FROM users WHERE email = 'admin@exemple.test'").get().oid, 'oid-admin');
});

test('jetons refusés : signature fausse, autre locataire, expiré, nonce différent', async () => {
  const cases = [
    (n) => [claimsFor(n), bad.privateKey],
    (n) => [claimsFor(n, { iss: `${authority}/autre-locataire/v2.0` })],
    (n) => [claimsFor(n, { exp: Math.floor(Date.now() / 1000) - 3600 })],
    () => [claimsFor('nonce-different')],
  ];
  for (const make of cases) {
    const { state, nonce } = await start();
    const [claims, key] = make(nonce);
    const res = await callback(state, state, claims, key);
    assert.equal(res.headers.get('location'), '/login?erreur=SSO_TOKEN');
    assert.doesNotMatch(res.headers.getSetCookie().join(' '), /app_session=[^;]{10,}/);
  }
});

test('échange refusé par Microsoft : code AADSTS gardé au journal avec OIDC_EXCHANGE, sans le reste du message (0.11.0)', async () => {
  const { state, nonce } = await start();
  nextClaims.refus = true;
  let res;
  try { res = await callback(state, state, claimsFor(nonce)); } finally { nextClaims.refus = false; }
  assert.equal(res.headers.get('location'), '/login?erreur=SSO_TOKEN');
  const l = getDb().prepare("SELECT details_json FROM audit_log WHERE action = 'sso.refused' ORDER BY id DESC LIMIT 1").get();
  assert.deepEqual(JSON.parse(l.details_json), { reason: 'OIDC_EXCHANGE', microsoft_code: 'AADSTS7000215' });
  assert.doesNotMatch(l.details_json, /Trace ID|Invalid client/);
});

test('état volé ou inconnu refusé ; compte inconnu refusé', async () => {
  const { state, nonce } = await start();
  assert.equal((await callback(state, 'autre-etat', claimsFor(nonce))).headers.get('location'), '/login?erreur=SSO_STATE');
  const s2 = await start();
  const r = await callback(s2.state, s2.state, claimsFor(s2.nonce, { oid: 'oid-inconnu', email: 'inconnu@exemple.test' }));
  assert.equal(r.headers.get('location'), '/login?erreur=SSO_UNKNOWN_ACCOUNT');
});

test('chemin de retour douteux ramené à /', async () => {
  for (const next of ['https://exemple.com', '//exemple.com', '/\\exemple.com', '/demandes?x=<script>']) assert.equal(safeNext(next), '/', next);
  assert.equal(safeNext('/gestion/demandes'), '/gestion/demandes');
  const { state, nonce } = await start('https://exemple.com');
  assert.equal((await callback(state, state, claimsFor(nonce))).headers.get('location'), '/');
});

test('réglages : secret jamais renvoyé ; mode sso refusé sans administrateur joignable ; mot de passe refusé en mode sso hors secours', async () => {
  const g = await admin.get('/api/settings/auth');
  assert.equal(g.body.data.secret_set, true);
  assert.doesNotMatch(JSON.stringify(g.body), /secret-de-test/);
  const db = getDb();
  db.prepare("UPDATE users SET is_admin_local = 0, oid = NULL WHERE email = 'admin@exemple.test'").run();
  assert.equal((await admin.put('/api/settings/auth', { mode: 'sso' })).body.code, 'SSO_NO_ADMIN');
  db.prepare("UPDATE users SET is_admin_local = 1 WHERE email = 'admin@exemple.test'").run();
  const u = await admin.post('/api/users', { email: 'agent@exemple.test', first_name: 'B', last_name: 'B', entite_id: ea.id });
  assert.equal((await admin.put('/api/settings/auth', { mode: 'sso' })).status, 200);
  const r = await client(srv.base).post('/api/auth/login', { email: 'agent@exemple.test', password: u.body.data.generated_password });
  assert.equal(r.status, 403);
  assert.equal(r.body.code, 'LOCAL_LOGIN_DISABLED');
  assert.equal((await client(srv.base).post('/api/auth/login', { email: 'admin@exemple.test', password: 'mot-de-passe-solide-1' })).status, 200);
  const cfg = await client(srv.base).get('/api/auth/config');
  assert.equal(cfg.body.data.mode, 'sso');
  assert.equal(cfg.body.data.microsoft, true);
});

const parse = (r) => (r.body.result ? JSON.parse(r.body.result.content[0].text) : r.body);
const mcp = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));

test('réglages : ID du secret refusé (API et MCP), réglage gardé ; « Enregistré le … par … » rendu (0.11.0)', async () => {
  const avant = (await admin.get('/api/settings/auth')).body.data;
  assert.ok(avant.enregistre && avant.enregistre.le, JSON.stringify(avant));
  assert.match(avant.enregistre.le, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.equal(avant.enregistre.par, 'Ada Admin');
  const id = '3f2b8c1e-9a4d-4e7b-b1c2-0d5e6f7a8b9c';
  const r = await admin.put('/api/settings/auth', { client_secret: id });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'SECRET_IS_ID');
  assert.match(r.body.message, /colonne Valeur/);
  assert.equal((await admin.put('/api/settings/auth', { client_secret: id.toUpperCase() })).body.code, 'SECRET_IS_ID');
  assert.equal((await mcp(admin, 'prepare_update_auth_settings', { client_secret: id })).code, 'SECRET_IS_ID');
  const { getSetting } = require('../src/settings');
  assert.equal(getSetting('auth.client_secret'), 'secret-de-test');
  const n = getDb().prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'settings.auth' AND details_json LIKE ?").get(`%${id}%`).n;
  assert.equal(n, 0);
  // Une valeur réelle (lettres, chiffres, ~ . _ -) passe ; l'auteur suit le dernier enregistrement.
  assert.equal((await admin.put('/api/settings/auth', { client_secret: 'Ab8Q~exemple.de_valeur-fictive' })).status, 200);
  assert.equal(getSetting('auth.client_secret'), 'Ab8Q~exemple.de_valeur-fictive');
  await admin.put('/api/settings/auth', { client_secret: 'secret-de-test' });
});

test('paramètres publics : le mode de connexion est celui réglé', async () => {
  assert.equal((await client(srv.base).get('/api/settings/public')).body.data.auth.mode, 'sso');
});

test('accès de secours sur la fiche, réglé par l’administrateur ; en mode sso, le dernier accès d’un administrateur ne se retire pas', async () => {
  const adminId = (await admin.get('/api/users')).body.data.find((x) => x.email === 'admin@exemple.test').id;
  const r = await admin.put(`/api/users/${adminId}`, { is_admin_local: 0 });
  assert.equal(r.status, 409);
  assert.equal(r.body.code, 'SSO_NO_ADMIN');
  const agentId = (await admin.get('/api/users')).body.data.find((x) => x.email === 'agent@exemple.test').id;
  const g = await admin.put(`/api/users/${agentId}`, { is_admin_local: 1 });
  assert.equal(g.status, 200);
  assert.equal(g.body.data.is_admin_local, 1);
  assert.equal((await admin.put(`/api/users/${agentId}`, { is_admin_local: 0 })).body.data.is_admin_local, 0);
  assert.equal((await admin.put(`/api/users/${adminId}`, { is_admin_local: 1 })).status, 200);
});

test('mode sso_optional : mot de passe et Microsoft acceptés pour tout compte actif', async () => {
  assert.equal((await admin.put('/api/settings/auth', { mode: 'sso_optional' })).status, 200);
  const u = await admin.post('/api/users', { email: 'agent2@exemple.test', first_name: 'C', last_name: 'C', entite_id: ea.id });
  assert.equal((await client(srv.base).post('/api/auth/login', { email: 'agent2@exemple.test', password: u.body.data.generated_password })).status, 200);
  const { state, nonce } = await start('/');
  const res = await callback(state, state, claimsFor(nonce, { oid: 'oid-agent2', email: 'agent2@exemple.test' }));
  assert.equal(res.headers.get('location'), '/');
  assert.match(res.headers.getSetCookie().join(' '), /app_session=[^;]{10,}/);
});

test('compte désactivé : session fermée et nouvelle connexion Microsoft refusée avec un message qui dit qui contacter', async () => {
  const { state, nonce } = await start('/');
  const res = await callback(state, state, claimsFor(nonce, { oid: 'oid-agent2', email: 'agent2@exemple.test' }));
  const session = res.headers.getSetCookie().find((c) => c.startsWith('app_session=')).split(';')[0];
  assert.equal((await fetch(`${srv.base}/api/auth/me`, { headers: { Cookie: session } })).status, 200);
  const id = (await admin.get('/api/users')).body.data.find((x) => x.email === 'agent2@exemple.test').id;
  assert.equal((await admin.del(`/api/users/${id}`)).status, 200);
  assert.equal((await fetch(`${srv.base}/api/auth/me`, { headers: { Cookie: session } })).status, 401);
  const s2 = await start('/');
  const r2 = await callback(s2.state, s2.state, claimsFor(s2.nonce, { oid: 'oid-agent2', email: 'agent2@exemple.test' }));
  assert.equal(r2.headers.get('location'), '/login?erreur=SSO_UNKNOWN_ACCOUNT');
});

test('MCP : lecture sans secret, réglage en deux appels, refusé à un agent', async () => {
  const l = await mcp(admin, 'get_auth_settings');
  assert.equal(l.data.secret_set, true);
  assert.doesNotMatch(JSON.stringify(l), /secret-de-test/);
  const p = await mcp(admin, 'prepare_update_auth_settings', { mode: 'local', client_secret: 'autre-secret' });
  assert.doesNotMatch(JSON.stringify(p), /autre-secret/);
  const c = await mcp(admin, 'confirm_update_auth_settings', { confirmation_token: p.data.confirmation_token });
  assert.equal(c.data.mode, 'local');
  const res = await fetch(`${srv.base}/api/auth/sso/start?next=/`, { redirect: 'manual' });
  assert.equal(res.headers.get('location'), '/login?erreur=SSO_NOT_CONFIGURED', 'mode local : aucun départ vers Microsoft');
  const u = await admin.post('/api/users', { email: 'agent3@exemple.test', first_name: 'D', last_name: 'D', entite_id: ea.id });
  const agent = client(srv.base);
  await agent.post('/api/auth/login', { email: 'agent3@exemple.test', password: u.body.data.generated_password });
  assert.equal((await mcp(agent, 'get_auth_settings')).code, 'FORBIDDEN');
  assert.equal((await agent.get('/api/settings/auth')).status, 403);
});

test('migration 009_sso sur une base 0.9.1 : accès de secours au premier administrateur réel seulement, pas de relance', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gmao-migr-'));
  const env = { PATH: process.env.PATH, NODE_ENV: 'test', APP_TEST_MODE: '1', DB_PATH: path.join(dir, 'm.db') };
  const run = (code) => spawnSync(process.execPath, ['-e', code], { cwd: path.join(__dirname, '..'), env, encoding: 'utf8' });
  // Base 0.9.1 : migrations 001 à 008 ; un administrateur de démonstration créé avant l'administrateur réel.
  const prep = run(`
    const initSqlJs = require('sql.js'); const fs = require('fs');
    const { MIGRATIONS } = require('./src/database');
    initSqlJs().then((SQL) => {
      const db = new SQL.Database();
      db.run("CREATE TABLE schema_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, applied_at TEXT DEFAULT (datetime('now')))");
      for (const [name, sql] of MIGRATIONS.slice(0, 8)) { for (const s of sql.split(';').map((x) => x.trim()).filter(Boolean)) db.run(s); db.run('INSERT INTO schema_migrations (name) VALUES (?)', [name]); }
      db.run("INSERT INTO entites (code, nom_fr, nom_nl) VALUES ('AA', 'A', 'A')");
      db.run("INSERT INTO users (email, first_name, last_name, user_role, entite_id, is_demo) VALUES ('demo@demo.invalid', 'd', 'd', 'admin', 1, 1)");
      db.run("INSERT INTO users (email, first_name, last_name, user_role, entite_id) VALUES ('premier@exemple.test', 'p', 'p', 'admin', 1)");
      db.run("INSERT INTO users (email, first_name, last_name, user_role, entite_id) VALUES ('second@exemple.test', 's', 's', 'admin', 1)");
      db.run("INSERT INTO users (email, first_name, last_name, user_role, entite_id) VALUES ('agent@exemple.test', 'a', 'a', 'agent', 1)");
      fs.writeFileSync(process.env.DB_PATH, Buffer.from(db.export()));
    });`);
  assert.equal(prep.status, 0, prep.stderr);
  const up = run(`require('./src/database').initDb().then((db) => console.log(JSON.stringify({
    users: db.prepare('SELECT email, is_admin_local, oid FROM users ORDER BY id').all(),
    pending: db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'auth_pending'").get().n,
  })))`);
  assert.equal(up.status, 0, up.stderr);
  assert.match(up.stdout, /\[DB\] Migration 009_sso appliquée/);
  const out = JSON.parse(up.stdout.trim().split('\n').pop());
  assert.deepEqual(out.users.map((u) => [u.email, u.is_admin_local, u.oid]), [
    ['demo@demo.invalid', 0, null], ['premier@exemple.test', 1, null], ['second@exemple.test', 0, null], ['agent@exemple.test', 0, null],
  ]);
  assert.equal(out.pending, 1);
  const again = run("require('./src/database').initDb().then(() => console.log('relance'))");
  assert.equal(again.status, 0, again.stderr);
  assert.doesNotMatch(again.stdout, /Migration 009/, 'migration non rejouée');
});
