/**
 * Vues enregistrées de la liste du service technique (version 0.9.0 ; GES-02 ; DV-93) : création, lecture, mise à
 * jour, suppression, par l'API et par le MCP ; vues de chacun ; cloison entre entités ; plafond et nom unique.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { getDb } = require('../src/database');
const { MAX_VUES } = require('../src/services/vues-demandes');

let srv;
let admin;
let ea;
let eb;
let gest;
let gest2;
let agent;
let gestB;
let multi;
const parse = (r) => JSON.parse(r.body.result.content[0].text);
const call = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  gest = await person(srv.base, admin, 'gest.v@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  gest2 = await person(srv.base, admin, 'gest2.v@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  agent = await person(srv.base, admin, 'agent.v@exemple.test', ea.id);
  gestB = await person(srv.base, admin, 'gestb.v@exemple.test', eb.id, [[eb.id, 'gestionnaire']]);
  multi = await person(srv.base, admin, 'multi.v@exemple.test', ea.id, [[ea.id, 'gestionnaire'], [eb.id, 'gestionnaire']]);
});
after(() => srv.stop());

test('création, lecture, renommage, nouveaux filtres et suppression ; journal', async () => {
  const c = await gest.post('/api/vues-demandes', { nom: 'En retard P1 P2', filtres: { echeance: 'retard', priorites: 'P1,P2' } });
  assert.equal(c.status, 201, JSON.stringify(c.body));
  const v = c.body.data;
  assert.deepEqual(v.filtres, { echeance: 'retard', priorites: 'P1,P2' });
  assert.equal(v.user_id, gest.id);
  assert.equal(v.entite_id, ea.id);
  assert.equal((await gest.get(`/api/vues-demandes/${v.id}`)).body.data.nom, 'En retard P1 P2');
  const u = await gest.put(`/api/vues-demandes/${v.id}`, { nom: 'Urgentes en retard', filtres: { echeance: 'retard', priorites: 'P1' } });
  assert.equal(u.status, 200);
  assert.equal(u.body.data.nom, 'Urgentes en retard');
  assert.deepEqual(u.body.data.filtres, { echeance: 'retard', priorites: 'P1' });
  assert.equal((await gest.get('/api/vues-demandes')).body.data.length, 1);
  const d = await gest.del(`/api/vues-demandes/${v.id}`);
  assert.equal(d.status, 200);
  assert.equal((await gest.get(`/api/vues-demandes/${v.id}`)).status, 404);
  const actions = getDb().prepare("SELECT action FROM audit_log WHERE entity_type = 'vue_demande' AND entity_id = ? ORDER BY id").all(v.id).map((a) => a.action);
  assert.deepEqual(actions, ['vue_demande.create', 'vue_demande.update', 'vue_demande.delete']);
});

test('filtres contrôlés : clé inconnue, valeur hors liste ou nom vide refusés (400)', async () => {
  for (const corps of [
    { nom: 'X', filtres: { inconnu: 1 } },
    { nom: 'X', filtres: { echeance: 'demain' } },
    { nom: 'X', filtres: { priorites: 'P1;DROP' } },
    { nom: '', filtres: {} },
    { nom: 'X'.repeat(61), filtres: {} },
    { nom: 'X' },
  ]) assert.equal((await gest.post('/api/vues-demandes', corps)).status, 400, JSON.stringify(corps));
});

test('nom unique par personne et par entité (409), pas entre deux personnes', async () => {
  assert.equal((await gest.post('/api/vues-demandes', { nom: 'À qualifier', filtres: { etats: 'a_qualifier' } })).status, 201);
  const pris = await gest.post('/api/vues-demandes', { nom: 'à qualifier', filtres: {} });
  assert.equal(pris.status, 409);
  assert.equal(pris.body.code, 'VUE_NOM_PRIS');
  assert.equal((await gest2.post('/api/vues-demandes', { nom: 'À qualifier', filtres: {} })).status, 201, 'autre personne : permis');
});

test('chacun ses vues : celle d’un collègue répond 404, celle de l’autre entité 403 ; agent refusé', async () => {
  const v = (await gest.post('/api/vues-demandes', { nom: 'Ma vue privée', filtres: {} })).body.data;
  assert.equal((await gest2.get(`/api/vues-demandes/${v.id}`)).status, 404);
  assert.equal((await gest2.put(`/api/vues-demandes/${v.id}`, { nom: 'Volée' })).status, 404);
  assert.equal((await gest2.del(`/api/vues-demandes/${v.id}`)).status, 404);
  assert.ok((await gest2.get('/api/vues-demandes')).body.data.every((x) => x.user_id === gest2.id));
  assert.equal((await gestB.get(`/api/vues-demandes/${v.id}`)).status, 403);
  assert.equal((await gestB.del(`/api/vues-demandes/${v.id}`)).status, 403);
  assert.equal((await call(gestB, 'get_vue_demandes', { id: v.id })).code, 'FORBIDDEN');
  assert.equal((await gest.get(`/api/vues-demandes/${v.id}`)).body.data.nom, 'Ma vue privée', 'intacte');
  assert.equal((await agent.get('/api/vues-demandes')).status, 403);
  assert.equal((await agent.post('/api/vues-demandes', { nom: 'X', filtres: {} })).status, 403);
});

test('une personne de deux entités ne voit que les vues de l’entité active', async () => {
  await multi.put('/api/auth/entite', { entite_id: ea.id });
  const va = (await multi.post('/api/vues-demandes', { nom: 'Vue AA', filtres: {} })).body.data;
  await multi.put('/api/auth/entite', { entite_id: eb.id });
  assert.equal((await multi.get('/api/vues-demandes')).body.data.length, 0);
  assert.equal((await multi.get(`/api/vues-demandes/${va.id}`)).status, 403);
  await multi.put('/api/auth/entite', { entite_id: ea.id });
  assert.equal((await multi.get(`/api/vues-demandes/${va.id}`)).status, 200);
});

test(`plafond : ${MAX_VUES} vues au plus par personne et par entité (409 VUES_MAX)`, async () => {
  const p = await person(srv.base, admin, 'plafond.v@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  for (let i = 0; i < MAX_VUES; i += 1) assert.equal((await p.post('/api/vues-demandes', { nom: `Vue ${i}`, filtres: {} })).status, 201);
  const trop = await p.post('/api/vues-demandes', { nom: 'Une de trop', filtres: {} });
  assert.equal(trop.status, 409);
  assert.equal(trop.body.code, 'VUES_MAX');
});

test('MCP : créer, lister, modifier, supprimer en deux appels', async () => {
  const c = await call(gest, 'create_vue_demandes', { nom: 'Par MCP', filtres: { etats: 'a_qualifier', tri: 'echeance' } });
  assert.ok(c.data, JSON.stringify(c));
  const id = c.data.id;
  assert.ok((await call(gest, 'list_vues_demandes')).data.rows.some((v) => v.id === id));
  assert.equal((await call(gest, 'update_vue_demandes', { id, nom: 'Par MCP, renommée' })).data.nom, 'Par MCP, renommée');
  const prep = await call(gest, 'prepare_delete_vue_demandes', { id });
  assert.ok(prep.data.confirmation_token, JSON.stringify(prep));
  const conf = await call(gest, 'confirm_delete_vue_demandes', { confirmation_token: prep.data.confirmation_token });
  assert.equal(conf.data.supprimee, 1, JSON.stringify(conf));
  assert.equal((await gest.get(`/api/vues-demandes/${id}`)).status, 404);
  assert.equal(getDb().prepare("SELECT channel FROM audit_log WHERE action = 'vue_demande.delete' AND entity_id = ?").get(id).channel, 'mcp');
});
