/** Serveur MCP : authentification, parité avec l'API, droits, confirmation en deux appels (standard v3.2, section 7.4). */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, client, setup, person } = require('./helpers');
const { collectRoutes } = require('../src/openapi');
const { TOOLS } = require('../src/mcp');

let srv;
let admin;
let agent;
let ea;
let eb;
const parse = (r) => JSON.parse(r.body.result.content[0].text);
const call = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  agent = await person(srv.base, admin, 'a@exemple.test', ea.id, [[eb.id, 'lecteur']]);
});
after(() => srv.stop());

test('sans session : 401', async () => {
  assert.equal((await client(srv.base).mcp('initialize', {})).status, 401);
});

test('initialize et liste des outils, descriptions FR et NL', async () => {
  const init = await agent.mcp('initialize', {});
  assert.equal(init.status, 200);
  assert.equal(init.body.result.serverInfo.name, 'gmao');
  assert.match(init.body.result.instructions, /get_profile/);
  const list = await agent.mcp('tools/list', {});
  for (const t of list.body.result.tools) assert.match(t.description, / \/ NL : /, t.name);
});

/**
 * Routes binaires hors du MCP (écart E-17) : le dépôt et la lecture d'un fichier (photo d'un lieu, pièce jointe d'une
 * demande, 0.8.0), que le corps JSON-RPC limité à 256 ko ne porte pas. Les effacements ont leur outil
 * (delete_lieu_photo, delete_piece) ; la fiche et la liste des pièces aussi (get_piece, list_pieces_brouillon).
 */
const HORS_MCP = new Set(['POST /api/lieux/:id/photo', 'GET /api/lieux/:id/photo', 'POST /api/demandes/brouillon/pieces', 'GET /api/pieces/:id/fichier']);

test('parité : chaque route de ressource a son outil ; chaque outil a sa route', () => {
  const routes = collectRoutes(srv.app)
    .filter((r) => /^\/api\/(entites|roles|roles-utilisateurs|users|listes-valeurs|lieux|categories|questions-categorie|priorites|horaires|jours-non-ouvres|jours-feries|echeances|demandes|pieces|parametres|modules|parametres-entite|audit|notes-version)(\/|$)/.test(r.path) || ['/api/auth/me', '/api/auth/entite', '/api/auth/nouveautes', '/api/auth/lieu-habituel'].includes(r.path))
    .map((r) => `${r.method} ${r.path}`)
    .filter((r) => !HORS_MCP.has(r));
  assert.equal(HORS_MCP.size, 4, 'la liste des exceptions ne grandit pas sans écart consigné (E-17)');
  const covered = TOOLS.map((t) => t.route);
  for (const r of routes) assert.ok(covered.includes(r), `route sans outil MCP : ${r}`);
  for (const c of covered) assert.ok(routes.includes(c), `outil sans route : ${c}`);
});

test('profil et changement d’entité active par MCP', async () => {
  const p = await call(agent, 'get_profile');
  assert.equal(p.data.entite_active_id, ea.id);
  const s = await call(agent, 'select_entite', { entite_id: eb.id });
  assert.equal(s.data.entite_active_id, eb.id);
  assert.equal((await call(agent, 'select_entite', { entite_id: 999 })).code, 'FORBIDDEN');
  await call(agent, 'select_entite', { entite_id: ea.id });
});

test('lecture des entités et du catalogue des rôles par MCP', async () => {
  const l = await call(agent, 'list_entites');
  assert.deepEqual(l.data.rows.map((e) => e.code), ['AA', 'BB']);
  assert.equal((await call(agent, 'get_role', { code: 'ouvrier' })).data.label_nl, 'Arbeider');
  assert.equal((await call(agent, 'list_roles')).data.length, 11);
});

test('mêmes droits que l’API : un agent ne crée ni entité, ni rôle, ni compte', async () => {
  for (const [name, args] of [
    ['list_users', {}], ['create_entite', { code: 'ZZ', nom_fr: 'x', nom_nl: 'y' }],
    ['create_role_utilisateur', { user_id: agent.id, entite_id: ea.id, role: 'responsable' }], ['list_roles_utilisateurs', {}],
  ]) assert.equal((await call(agent, name, args)).code, 'FORBIDDEN', name);
});

test('administration par MCP : entité et rôle créés sous l’identité de l’administrateur, canal journalisé', async () => {
  const e = await call(admin, 'create_entite', { code: 'MC', nom_fr: 'Par MCP', nom_nl: 'Via MCP' });
  assert.equal(e.data.code, 'MC');
  const g = await call(admin, 'create_role_utilisateur', { user_id: agent.id, entite_id: ea.id, role: 'ouvrier' });
  assert.equal(g.data.role, 'ouvrier');
  const { getDb } = require('../src/database');
  assert.equal(getDb().prepare("SELECT channel FROM audit_log WHERE action = 'role.grant' AND entity_id = ?").get(g.data.id).channel, 'mcp');
});

test('validation des arguments : champ inconnu refusé', async () => {
  assert.equal((await call(admin, 'create_entite', { code: 'XX', nom_fr: 'x', nom_nl: 'y', is_active: 0 })).code, 'VALIDATION');
});

test('désactivation et retrait en deux appels ; appel direct refusé ; jeton à usage unique', async () => {
  const id = (await call(admin, 'create_entite', { code: 'DX', nom_fr: 'À désactiver', nom_nl: 'Te deactiveren' })).data.id;
  const direct = await admin.mcp('tools/call', { name: 'deactivate_entite', arguments: { id, motif: 'test' } });
  assert.equal(direct.body.result.isError, true);
  const p = await call(admin, 'prepare_deactivate_entite', { id, motif: 'Essai' });
  assert.ok(p.data.confirmation_token);
  assert.equal(p.data.entite.is_active, 1);
  const c = await call(admin, 'confirm_deactivate_entite', { confirmation_token: p.data.confirmation_token });
  assert.equal(c.data.is_active, 0);
  assert.equal((await call(admin, 'confirm_deactivate_entite', { confirmation_token: p.data.confirmation_token })).code, 'CONFIRMATION');
  const role = (await call(admin, 'list_roles_utilisateurs', { user_id: agent.id, role: 'ouvrier' })).data.rows[0];
  const pr = await call(admin, 'prepare_retirer_role_utilisateur', { id: role.id, motif: 'Essai' });
  assert.equal((await call(admin, 'confirm_retirer_role_utilisateur', { confirmation_token: pr.data.confirmation_token })).data.is_active, 0);
});

test('le jeton de confirmation est lié à la personne qui l’a demandé', async () => {
  const z = await admin.post('/api/users', { email: 'z@exemple.test', first_name: 'Z', last_name: 'Z', entite_id: ea.id });
  const p = await call(admin, 'prepare_deactivate_user', { id: z.body.data.id });
  assert.equal((await call(agent, 'confirm_deactivate_user', { confirmation_token: p.data.confirmation_token })).code, 'CONFIRMATION');
});
