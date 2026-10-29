/**
 * Banc d'essai : base de test dans un dossier temporaire, jamais sur le chemin de production (standard v3.2, section 14.2).
 * Démarre l'application réelle sur un port libre et fournit un client qui garde le cookie de session.
 */
const os = require('os');
const path = require('path');
const fs = require('fs');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gmao-test-'));
process.env.DB_PATH = path.join(dir, 'test.db');
process.env.NODE_ENV = 'test';
process.env.APP_TEST_MODE = '1';

const { initDb } = require('../src/database');
const { buildApp } = require('../src/app');

async function startServer() {
  // Garde-fou : si un module a chargé la configuration avant ce fichier, la base de test pointerait sur la vraie base.
  const { DB_PATH } = require('../src/config');
  if (DB_PATH !== process.env.DB_PATH || !DB_PATH.startsWith(os.tmpdir())) {
    throw new Error(`Base de test hors du dossier temporaire (${DB_PATH}) : require('./helpers') doit précéder tout require de src/`);
  }
  await initDb();
  const app = buildApp();
  const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  return { app, server, base, stop: () => new Promise((r) => server.close(r)) };
}

function client(base) {
  let cookie = null;
  let csrfToken = null;
  const call = async (method, url, body, { csrf = true, bearer = null, headers = {} } = {}) => {
    const h = { ...headers };
    if (body !== undefined) h['Content-Type'] = 'application/json';
    if (cookie) h.Cookie = cookie;
    if (bearer) h.Authorization = `Bearer ${bearer}`;
    if (csrf && csrfToken && method !== 'GET') h['X-CSRF-Token'] = csrfToken;
    const res = await fetch(base + url, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0].endsWith('=') ? null : set.split(';')[0];
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { json = text; }
    if (json && json.data && json.data.csrf_token) csrfToken = json.data.csrf_token;
    return { status: res.status, body: json, headers: res.headers };
  };
  return {
    get: (u, o) => call('GET', u, undefined, o),
    post: (u, b, o) => call('POST', u, b, o),
    put: (u, b, o) => call('PUT', u, b, o),
    del: (u, b, o) => call('DELETE', u, b, o),
    mcp: (method, params, o) => call('POST', '/api/mcp', { jsonrpc: '2.0', id: 1, method, params }, o),
    get cookie() { return cookie; },
    get csrf() { return csrfToken; },
  };
}

/** Corps de l'assistant d'installation : premier administrateur et première entité, valeurs fictives. */
const INSTALL = {
  email: 'admin@exemple.test', first_name: 'Ada', last_name: 'Admin', password: 'mot-de-passe-solide-1',
  organisation_fr: 'Commune fictive', organisation_nl: 'Fictieve gemeente',
  entite_code: 'AA', entite_nom_fr: 'Administration fictive', entite_nom_nl: 'Fictief bestuur',
};

/** Installe, crée une seconde entité et rend le client administrateur avec les identifiants des deux entités. */
async function setup(base) {
  const admin = client(base);
  const r = await admin.post('/api/install', INSTALL);
  if (r.status !== 201) throw new Error(`installation : ${r.status} ${JSON.stringify(r.body)}`);
  const ea = (await admin.get('/api/entites')).body.data[0];
  const eb = (await admin.post('/api/entites', { code: 'BB', nom_fr: 'Centre fictif', nom_nl: 'Fictief centrum' })).body.data;
  return { admin, ea, eb };
}

/** Crée un compte rattaché à une entité, lui ajoute des rôles et rend un client connecté. */
async function person(base, admin, email, entiteId, roles = []) {
  const r = await admin.post('/api/users', { email, first_name: 'Prénom', last_name: 'Nom', entite_id: entiteId });
  if (r.status !== 201) throw new Error(`compte ${email} : ${r.status} ${JSON.stringify(r.body)}`);
  for (const [ent, role] of roles) {
    const g = await admin.post('/api/roles-utilisateurs', { user_id: r.body.data.id, entite_id: ent, role });
    if (g.status !== 201) throw new Error(`rôle ${role} : ${g.status} ${JSON.stringify(g.body)}`);
  }
  const c = client(base);
  const l = await c.post('/api/auth/login', { email, password: r.body.data.generated_password });
  if (l.status !== 200) throw new Error(`connexion ${email} : ${l.status}`);
  c.id = r.body.data.id;
  c.password = r.body.data.generated_password;
  return c;
}

module.exports = { startServer, client, setup, person, INSTALL };
