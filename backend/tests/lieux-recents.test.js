/**
 * Lieux récents du profil (0.7.5, DV-74) : derniers lieux distincts des demandes de la personne dans l'entité active,
 * du plus récent au plus ancien, lieux actifs seulement, cinq au plus, sans le lieu proposé d'office ; jamais les
 * demandes d'une autre personne ni d'une autre entité ; mêmes données par le MCP.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');

let srv;
let admin;
let ea;
let eb;
let agent;
let autre;
let gestA;
let gestB;
const L = {};
let cat;
let catB;
const parse = (r) => JSON.parse(r.body.result.content[0].text);
const deposer = async (c, lieu, categorie = cat) => {
  const r = await c.post('/api/demandes', { lieu_id: lieu, categorie_id: categorie, description: 'Une lampe ne s’allume plus.' });
  assert.equal(r.status, 201, JSON.stringify(r.body));
};
const recents = async (c) => (await c.get('/api/auth/me')).body.data.lieux_recents.map((l) => l.code);

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  agent = await person(srv.base, admin, 'agent.rec@exemple.test', ea.id, [[eb.id, 'agent']]);
  autre = await person(srv.base, admin, 'autre.rec@exemple.test', ea.id);
  gestA = await person(srv.base, admin, 'gest.rec@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  gestB = await person(srv.base, admin, 'gestb.rec@exemple.test', eb.id, [[eb.id, 'gestionnaire']]);
  const lieu = async (c, body) => { const r = await c.post('/api/lieux', body); assert.equal(r.status, 201, JSON.stringify(r.body)); return r.body.data.id; };
  L.site = await lieu(gestA, { nature: 'site', code: 'RC', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis' });
  for (const n of [1, 2, 3, 4, 5, 6, 7]) L[`s${n}`] = await lieu(gestA, { nature: 'site', code: `RC${n}`, nom_fr: `Site ${n}`, nom_nl: `Site ${n}` });
  L.b = await lieu(gestB, { nature: 'site', code: 'RCB', nom_fr: 'Site du CPAS', nom_nl: 'Site van het OCMW' });
  cat = (await agent.get('/api/categories?niveau=nature&q=eclairage')).body.data[0].id;
  await agent.put('/api/auth/entite', { entite_id: eb.id });
  catB = (await agent.get('/api/categories?niveau=nature&q=eclairage')).body.data[0].id;
  await agent.put('/api/auth/entite', { entite_id: ea.id });
});
after(() => srv.stop());

test('sans demande : aucune proposition, liste vide', async () => {
  const me = (await agent.get('/api/auth/me')).body.data;
  assert.equal(me.lieu_propose, null);
  assert.deepEqual(me.lieux_recents, []);
});

test('lieux distincts, du plus récent au plus ancien, sans le lieu proposé d’office ; chemin rendu', async () => {
  await deposer(agent, L.s1);
  await deposer(agent, L.s2);
  await deposer(agent, L.s1);
  await deposer(agent, L.s3);
  const me = (await agent.get('/api/auth/me')).body.data;
  assert.equal(me.lieu_propose.code, 'RC3');
  assert.equal(me.lieu_propose.source, 'derniere_demande');
  assert.deepEqual(me.lieux_recents.map((l) => l.code), ['RC1', 'RC2']);
  const l = me.lieux_recents[0];
  assert.deepEqual(Object.keys(l).sort(), ['chemin', 'code', 'id', 'nature', 'nom_fr', 'nom_nl']);
  assert.deepEqual(l.chemin.map((e) => e.code), ['RC1']);
});

test('avec un lieu habituel : celui-ci est retiré de la liste, la dernière demande y revient', async () => {
  assert.equal((await agent.put('/api/auth/lieu-habituel', { lieu_id: L.s1 })).status, 200);
  assert.deepEqual(await recents(agent), ['RC3', 'RC2']);
  assert.equal((await agent.put('/api/auth/lieu-habituel', { lieu_id: null })).status, 200);
});

test('cinq lieux au plus', async () => {
  for (const n of [4, 5, 6, 7]) await deposer(agent, L[`s${n}`]);
  const r = await recents(agent);
  assert.equal(r.length, 5);
  assert.deepEqual(r, ['RC6', 'RC5', 'RC4', 'RC3', 'RC1']);
});

test('un lieu désactivé disparaît de la liste', async () => {
  assert.equal((await gestA.del(`/api/lieux/${L.s6}`, { motif: 'Fermé' })).status, 200);
  assert.ok(!(await recents(agent)).includes('RC6'));
});

test('jamais les demandes d’une autre personne', async () => {
  await deposer(autre, L.site);
  assert.ok(!(await recents(agent)).includes('RC'));
  assert.deepEqual(await recents(autre), []);
});

test('cloison : la liste suit l’entité active', async () => {
  await agent.put('/api/auth/entite', { entite_id: eb.id });
  assert.deepEqual(await recents(agent), []);
  await deposer(agent, L.b, catB);
  assert.deepEqual(await recents(agent), []);
  assert.equal((await agent.get('/api/auth/me')).body.data.lieu_propose.code, 'RCB');
  await agent.put('/api/auth/entite', { entite_id: ea.id });
  assert.ok(!(await recents(agent)).includes('RCB'));
});

test('MCP : get_profile rend les mêmes lieux récents que l’API', async () => {
  const api = (await agent.get('/api/auth/me')).body.data.lieux_recents;
  const m = parse(await agent.mcp('tools/call', { name: 'get_profile', arguments: {} })).data;
  assert.deepEqual(m.lieux_recents, api);
});
