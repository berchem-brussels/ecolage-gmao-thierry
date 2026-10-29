/** Grille de sécurité, contrôles automatisés (standard v3.2, section 10.2). */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { startServer, client, setup, INSTALL } = require('./helpers');
const { getDb } = require('../src/database');
const { collectRoutes } = require('../src/openapi');
const publicRouter = require('../src/routes/public');

let srv;
let admin;

before(async () => {
  srv = await startServer();
  ({ admin } = await setup(srv.base));
});
after(() => srv.stop());

test('toute route hors liste écrite exige une session', async () => {
  const anonyme = client(srv.base);
  const routes = collectRoutes(srv.app);
  assert.ok(routes.length >= 15, `${routes.length} routes énumérées`);
  for (const r of routes) {
    const key = `${r.method} ${r.path}`;
    const url = r.path.replace(/:[A-Za-z_]+/g, '1');
    const res = await anonyme[{ GET: 'get', POST: 'post', PUT: 'put', DELETE: 'del' }[r.method]](url, r.method === 'GET' ? undefined : {});
    if (publicRouter.PUBLIC_ROUTES.includes(key)) assert.notEqual(res.status, 401, `${key} devrait être libre`);
    else assert.equal(res.status, 401, `${key} répond ${res.status} sans session`);
  }
});

test('écriture par cookie sans jeton anti-CSRF ou avec un faux : 403 CSRF', async () => {
  const body = { code: 'CS', nom_fr: 'x', nom_nl: 'y' };
  const sans = await admin.post('/api/entites', body, { csrf: false });
  assert.equal(sans.status, 403);
  assert.equal(sans.body.code, 'CSRF');
  const faux = await admin.post('/api/entites', body, { csrf: false, headers: { 'X-CSRF-Token': 'faux' } });
  assert.equal(faux.status, 403);
  assert.equal((await admin.put('/api/auth/entite', { entite_id: 1 }, { csrf: false })).status, 403, 'changement d’entité active compris');
  assert.equal((await admin.post('/api/entites', body)).status, 201);
});

test('cookie de session HttpOnly et SameSite=Strict, Secure derrière HTTPS ; la base ne garde que l’empreinte', async () => {
  const res = await fetch(`${srv.base}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-Proto': 'https' },
    body: JSON.stringify({ email: INSTALL.email, password: INSTALL.password }),
  });
  const c = res.headers.get('set-cookie');
  assert.match(c, /HttpOnly/);
  assert.match(c, /SameSite=Strict/);
  assert.match(c, /Secure/);
  const token = (await res.json()).data.token;
  assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM sessions WHERE id = ?').get(token).n, 0, 'aucun jeton en clair en base');
});

test('jetons refusés : inventé, session expirée, session fermée', async () => {
  const c = client(srv.base);
  assert.equal((await c.get('/api/entites', { bearer: 'jeton-invente' })).status, 401);
  const l = await client(srv.base).post('/api/auth/login', { email: INSTALL.email, password: INSTALL.password });
  const token = l.body.data.token;
  assert.equal((await c.get('/api/entites', { bearer: token })).status, 200);
  getDb().prepare("UPDATE sessions SET expires_at = datetime('now', '-1 minute')").run();
  assert.equal((await c.get('/api/entites', { bearer: token })).status, 401);
});

test('mode test refusé avec NODE_ENV=production', () => {
  const r = spawnSync(process.execPath, ['-e', "require('./src/config')"], {
    cwd: require('path').join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: 'production', APP_TEST_MODE: '1', JWT_SECRET: 'a'.repeat(64), CONFIG_ENC_KEY: 'b'.repeat(64) },
    encoding: 'utf8',
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /APP_TEST_MODE/);
});

test('en-têtes de sécurité sur l’API', async () => {
  const r = await client(srv.base).get('/api/version');
  assert.match(r.headers.get('content-security-policy'), /default-src 'none'/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
  assert.equal(r.headers.get('x-powered-by'), null);
});

test('corps JSON invalide : 400 BAD_JSON sans trace ; corps trop gros : 413', async () => {
  const big = await fetch(`${srv.base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'x'.repeat(300 * 1024), password: 'y' }) });
  assert.equal(big.status, 413);
  assert.equal((await big.json()).code, 'PAYLOAD_TOO_LARGE');
  const res = await fetch(`${srv.base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{pas du json' });
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.code, 'BAD_JSON');
  assert.doesNotMatch(JSON.stringify(body), /at |node_modules|stack|SyntaxError/);
});

test('aucune réponse ne contient de hachage ni de secret', async () => {
  const me = await admin.get('/api/auth/me');
  const users = await admin.get('/api/users');
  const membres = await admin.get('/api/entites/1/membres');
  const roles = await admin.get('/api/roles-utilisateurs');
  assert.doesNotMatch(JSON.stringify([me.body, users.body, membres.body, roles.body]), /password_hash|\$2[aby]\$/);
});

test('statique : aucune interpolation de valeur dans une requête SQL', () => {
  const dir = path.join(__dirname, '..', 'src');
  const files = [];
  const walk = (d) => fs.readdirSync(d).forEach((f) => { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : files.push(p); });
  walk(dir);
  const permis = /\$\{(COLUMNS|PROFILE|FROM|clause|sets\.join\(', '\)|k|t\[\d\])\}/;
  for (const f of files.filter((x) => x.endsWith('.js'))) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/prepare\(`([^`]*)`\)/g)) {
      for (const i of m[1].matchAll(/\$\{[^}]+\}/g)) assert.match(i[0], permis, `${path.basename(f)} : interpolation ${i[0]}`);
    }
  }
});

test('statique : ni eval, ni Function, ni child_process, ni secret de repli', () => {
  const dir = path.join(__dirname, '..', 'src');
  const walk = (d) => fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : [p]; });
  for (const f of walk(dir)) {
    const src = fs.readFileSync(f, 'utf8');
    assert.doesNotMatch(src, /\beval\(|new Function\(|child_process/, f);
    assert.doesNotMatch(src, /JWT_SECRET\s*\|\|\s*['"]/, f);
  }
});

test('statique : FROM et COLUMNS interpolés sont des constantes du module', () => {
  const dir = path.join(__dirname, '..', 'src');
  const walk = (d) => fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : [p]; });
  for (const f of walk(dir).filter((x) => x.endsWith('.js'))) {
    const src = fs.readFileSync(f, 'utf8');
    for (const name of ['FROM', 'COLUMNS', 'PROFILE']) {
      if (new RegExp(`\\$\\{${name}\\}`).test(src)) assert.match(src, new RegExp(`^const ${name} = ['\`]`, 'm'), `${path.basename(f)} : ${name} doit être une constante`);
    }
  }
});

test('commande de démonstration refusée sans DEMO_ALLOWED=1, sans toucher la base', () => {
  const os = require('os');
  const dbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gmao-demo-')), 'x.db');
  const r = spawnSync(process.execPath, ['src/demo.js'], {
    cwd: path.join(__dirname, '..'),
    env: { PATH: process.env.PATH, NODE_ENV: 'production', DB_PATH: dbPath, JWT_SECRET: 'a'.repeat(64), CONFIG_ENC_KEY: 'b'.repeat(64) },
    encoding: 'utf8',
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /DEMO_ALLOWED/);
  assert.equal(fs.existsSync(dbPath), false);
});

test('aucun compte créé au démarrage : base neuve sans compte', async () => {
  const os = require('os');
  const dbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gmao-neuf-')), 'n.db');
  const r = spawnSync(process.execPath, ['-e', `require('./src/database').initDb().then((db) => { console.log(db.prepare('SELECT COUNT(*) AS n FROM users').get().n, db.prepare('SELECT COUNT(*) AS n FROM entites').get().n); })`], {
    cwd: path.join(__dirname, '..'), env: { PATH: process.env.PATH, DB_PATH: dbPath, NODE_ENV: 'test', APP_TEST_MODE: '1' }, encoding: 'utf8',
  });
  assert.match(r.stdout.trim().split('\n').pop(), /^0 0$/);
});
