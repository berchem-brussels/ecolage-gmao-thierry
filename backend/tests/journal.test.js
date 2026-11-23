/**
 * Journal d'audit lisible (standard v3.2, sections 9.1 et 17.3 ; écart E-12 ; décision du 22/10/2026 : administrateur seul).
 * Lecture seule ; filtres par action, famille, personne, entité, canal et période ; entité notée sur les actions d'une
 * entité ; aucun secret dans le détail ; MCP en lecture.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, client, setup, person } = require('./helpers');
const { getDb } = require('../src/database');
const { collectRoutes } = require('../src/openapi');

let srv;
let admin;
let ea;
let eb;
let resp;
let lieu;
const parse = (r) => JSON.parse(r.body.result.content[0].text);
const tool = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  resp = await person(srv.base, admin, 'j.resp@exemple.test', ea.id, [[ea.id, 'responsable'], [eb.id, 'responsable']]);
  lieu = (await resp.post('/api/lieux', { nature: 'site', code: 'JS1', nom_fr: 'Site', nom_nl: 'Site' })).body.data;
  await resp.put(`/api/lieux/${lieu.id}`, { nom_fr: 'Site renommé' });
  await resp.put('/api/parametres-entite/contact.telephone', { valeur: '02 000 00 00' });
  await resp.put('/api/auth/entite', { entite_id: eb.id });
  await resp.post('/api/lieux', { nature: 'site', code: 'JS2', nom_fr: 'Site B', nom_nl: 'Site B' });
  await admin.put('/api/modules/patrimoine', { actif: 1 });
  await admin.put('/api/parametres/app.support_contact', { valeur: 'Service informatique' });
  await client(srv.base).post('/api/auth/login', { email: 'j.resp@exemple.test', password: 'faux' });
});
after(() => srv.stop());

test('lecture réservée à l’administrateur, même au responsable du service technique', async () => {
  assert.equal((await resp.get('/api/audit')).status, 403);
  assert.equal((await resp.get('/api/audit/1')).status, 403);
  assert.equal((await tool(resp, 'list_audit')).code, 'FORBIDDEN');
});

test('lecture seule : aucune route n’écrit ni n’efface le journal', () => {
  const r = collectRoutes(srv.app).filter((x) => x.path.startsWith('/api/audit'));
  assert.deepEqual(r.map((x) => `${x.method} ${x.path}`).sort(), ['GET /api/audit', 'GET /api/audit/:id']);
});

test('liste : plus récent d’abord, personne, entité, canal, détail ; actions pour le filtre', async () => {
  const r = await admin.get('/api/audit?limit=200');
  assert.equal(r.status, 200);
  const ids = r.body.data.map((a) => a.id);
  assert.deepEqual(ids, [...ids].sort((x, y) => y - x));
  const create = r.body.data.find((a) => a.action === 'lieu.create' && a.entity_id === lieu.id);
  assert.equal(create.user_email, 'j.resp@exemple.test');
  assert.equal(create.entite_code, 'AA');
  assert.equal(create.channel, 'api');
  assert.deepEqual(create.details, { code: 'JS1', nature: 'site' });
  assert.equal(create.details_json, undefined);
  for (const a of ['lieu.create', 'lieu.update', 'parametre_entite.update', 'parametre.update', 'login.failure', 'session.entite']) {
    assert.ok(r.body.meta.actions.includes(a), a);
  }
  assert.equal(r.body.pagination.total, r.body.data.length);
});

test('filtres : famille d’actions, action exacte, entité, personne, canal, période', async () => {
  const fam = (await admin.get('/api/audit?action=lieu')).body.data;
  assert.ok(fam.length >= 3 && fam.every((a) => a.action.startsWith('lieu.')));
  assert.ok((await admin.get('/api/audit?action=lieu.update')).body.data.every((a) => a.action === 'lieu.update'));
  const b = (await admin.get(`/api/audit?entite_id=${eb.id}&action=lieu`)).body.data;
  assert.deepEqual(b.map((a) => a.details.code), ['JS2']);
  const p = (await admin.get(`/api/audit?user_id=${resp.id}`)).body.data;
  assert.ok(p.length >= 4 && p.every((a) => a.user_id === resp.id));
  assert.equal((await admin.get('/api/audit?channel=mcp')).body.data.length, 0);
  const demain = new Date(Date.now() + 86400000).toISOString();
  const hier = new Date(Date.now() - 86400000).toISOString();
  assert.equal((await admin.get(`/api/audit?du=${encodeURIComponent(demain)}`)).body.data.length, 0);
  assert.ok((await admin.get(`/api/audit?du=${encodeURIComponent(hier)}&au=${encodeURIComponent(demain)}`)).body.data.length > 5);
  assert.equal((await admin.get('/api/audit?du=hier')).status, 400);
  assert.equal((await admin.get("/api/audit?action=x' OR 1=1")).status, 400);
});

test('entité notée : actions d’une entité avec son code, actions d’instance sans entité', async () => {
  const row = (action) => getDb().prepare('SELECT entite_id FROM audit_log WHERE action = ? ORDER BY id DESC').get(action);
  assert.equal(row('parametre_entite.update').entite_id, ea.id);
  assert.equal(row('session.entite').entite_id, eb.id);
  assert.equal(row('role.grant').entite_id, eb.id);
  assert.equal(row('entite.create').entite_id, eb.id);
  assert.equal(row('parametre.update').entite_id, null);
  assert.equal(row('login.failure').entite_id, null);
});

test('aucun mot de passe ni secret dans le détail du journal', async () => {
  const all = JSON.stringify((await admin.get('/api/audit?limit=200')).body.data);
  assert.doesNotMatch(all, /mot-de-passe|password|\$2[aby]\$|csrf/i);
});

test('une ligne par identifiant ; 404 si absente ; MCP en lecture avec les actions', async () => {
  const one = (await admin.get('/api/audit?limit=1')).body.data[0];
  assert.equal((await admin.get(`/api/audit/${one.id}`)).body.data.action, one.action);
  assert.equal((await admin.get('/api/audit/999999')).status, 404);
  const m = await tool(admin, 'list_audit', { action: 'lieu', entite_id: ea.id });
  assert.ok(m.data.rows.length >= 2);
  assert.ok(m.data.actions.includes('lieu.create'));
  assert.equal((await tool(admin, 'get_audit', { id: one.id })).data.id, one.id);
});
