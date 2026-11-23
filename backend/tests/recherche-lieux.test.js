/**
 * Recherche d'un lieu (REF-03, LNG-09) : nom FR ou NL, code, adresse, commune, type, et noms des lieux parents ; sans
 * tenir compte des accents, des majuscules ni de la ponctuation. Chaque ligne porte son chemin (racine → lieu).
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { normaliser } = require('../src/services/lieux');

let srv;
let admin;
let ea;
let eb;
let gest;
let agent;
let gestB;
const L = {};
const parse = (r) => JSON.parse(r.body.result.content[0].text);
const codes = async (c, q, extra = '') => (await c.get(`/api/lieux?q=${encodeURIComponent(q)}${extra}`)).body.data.map((l) => l.code);

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  gest = await person(srv.base, admin, 'gest.rech@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  agent = await person(srv.base, admin, 'agent.rech@exemple.test', ea.id);
  gestB = await person(srv.base, admin, 'gestb.rech@exemple.test', eb.id, [[eb.id, 'gestionnaire']]);
  const types = (await gest.get('/api/listes-valeurs?liste=type_lieu')).body.data;
  const bureau = types.find((t) => t.code === 'bureau').id;
  const sanitaires = types.find((t) => t.code === 'sanitaires').id;
  const lieu = async (c, body) => { const r = await c.post('/api/lieux', body); assert.equal(r.status, 201, JSON.stringify(r.body)); return r.body.data.id; };
  L.eglise = await lieu(gest, { nature: 'site', code: 'EGL', nom_fr: 'Église Sainte-Agathe', nom_nl: 'Kerk Sint-Agatha', adresse: 'Place de l’Église 1', commune: 'Fictiveville' });
  L.alc = await lieu(gest, { nature: 'site', code: 'ALC', nom_fr: 'Alcyons', nom_nl: 'Alcyons', adresse: 'Rue des Alcyons 23' });
  L.alcB = await lieu(gest, { nature: 'batiment', parent_id: L.alc, code: 'ALC-23', nom_fr: 'Centre Alcyons', nom_nl: 'Centrum Alcyons' });
  L.s21 = await lieu(gest, { nature: 'local', parent_id: L.alcB, code: 'ALC-21', nom_fr: 'Salle n°21', nom_nl: 'Zaal nr. 21', type_id: bureau });
  L.s22 = await lieu(gest, { nature: 'local', parent_id: L.alcB, code: 'ALC-22', nom_fr: 'Salle n°22', nom_nl: 'Zaal nr. 22', type_id: bureau });
  L.wc = await lieu(gest, { nature: 'local', parent_id: L.alcB, code: 'ALC-WC', nom_fr: 'Toilettes du rez', nom_nl: 'Toiletten gelijkvloers', type_id: sanitaires });
  L.cafe = await lieu(gest, { nature: 'site', code: 'CAF', nom_fr: 'Cafétéria Été', nom_nl: 'Cafetaria Zomer' });
  L.vieux = await lieu(gest, { nature: 'site', code: 'OLD', nom_fr: 'Ancienne école', nom_nl: 'Oude school' });
  assert.equal((await gest.del(`/api/lieux/${L.vieux}`, { motif: 'Cédé' })).status, 200);
  await lieu(gestB, { nature: 'site', code: 'EGL', nom_fr: 'Église de l’autre entité', nom_nl: 'Kerk andere entiteit' });
});
after(() => srv.stop());

test('normaliser : accents, majuscules et ponctuation retirés', () => {
  assert.equal(normaliser('  Église Sainte-Agathe '), 'eglise sainte agathe');
  assert.equal(normaliser('Salle n°21'), 'salle n 21');
  assert.equal(normaliser('Cafétéria ÉTÉ'), 'cafeteria ete');
  assert.equal(normaliser('Place de l’Église'), 'place de l eglise');
  assert.equal(normaliser(null), '');
});

test('sans accents ni majuscules, dans les deux langues (REF-03, LNG-09)', async () => {
  assert.deepEqual(await codes(agent, 'eglise'), ['EGL']);
  assert.deepEqual(await codes(agent, 'ÉGLISE'), ['EGL']);
  assert.deepEqual(await codes(agent, 'kerk'), ['EGL'], 'nom NL');
  assert.deepEqual(await codes(agent, 'cafeteria ete'), ['CAF']);
  assert.deepEqual(await codes(agent, 'zomer'), ['CAF']);
});

test('par code, adresse, commune ou type', async () => {
  assert.equal((await codes(agent, 'alc-21'))[0], 'ALC-21', 'code exact en tête');
  assert.deepEqual(await codes(agent, 'place de l eglise'), ['EGL'], 'adresse');
  assert.deepEqual(await codes(agent, 'fictiveville'), ['EGL'], 'commune');
  assert.deepEqual(await codes(agent, 'sanitaires'), ['ALC-WC'], 'type du local');
});

test('par les noms des lieux parents : « alcyons salle 21 » trouve la salle 21', async () => {
  assert.deepEqual(await codes(agent, 'alcyons salle 21'), ['ALC-21']);
  assert.deepEqual(await codes(agent, 'n°22'), ['ALC-22'], 'ponctuation ignorée');
  const tous = await codes(agent, 'alcyons');
  assert.deepEqual(tous.slice(0, 2).sort(), ['ALC', 'ALC-23'], 'lieux nommés Alcyons avant leurs locaux');
  assert.deepEqual(tous.slice(2).sort(), ['ALC-21', 'ALC-22', 'ALC-WC']);
});

test('chaque ligne porte son chemin, de la racine au lieu', async () => {
  const l = (await agent.get('/api/lieux?q=salle%2021')).body.data[0];
  assert.deepEqual(l.chemin.map((c) => c.code), ['ALC', 'ALC-23', 'ALC-21']);
  assert.ok(l.chemin.every((c) => c.nom_fr && c.nom_nl));
  const sans = (await agent.get('/api/lieux?nature=site')).body.data;
  assert.ok(sans.every((x) => x.chemin.length === 1 && x.chemin[0].id === x.id));
});

test('filtres et pagination combinés à la recherche', async () => {
  assert.deepEqual(await codes(agent, 'ecole'), ['OLD'], 'sans filtre : lieux désactivés compris, comme avant');
  assert.deepEqual(await codes(agent, 'ecole', '&is_active=1'), []);
  assert.deepEqual(await codes(agent, 'alcyons', '&nature=local&is_active=1'), ['ALC-21', 'ALC-22', 'ALC-WC']);
  const p = await agent.get('/api/lieux?q=alcyons&limit=2&offset=2');
  assert.equal(p.body.pagination.total, 5);
  assert.equal(p.body.data.length, 2);
  assert.deepEqual(await codes(agent, '   '), (await codes(agent, '')), 'espaces seuls : pas de filtre');
});

test('cloison : la recherche ne sort jamais de l’entité active ; même résultat par le MCP', async () => {
  const a = (await agent.get('/api/lieux?q=eglise')).body.data;
  assert.ok(a.every((l) => l.entite_id === ea.id));
  const b = (await gestB.get('/api/lieux?q=eglise')).body.data;
  assert.deepEqual(b.map((l) => l.entite_id), [eb.id]);
  const m = parse(await agent.mcp('tools/call', { name: 'list_lieux', arguments: { q: 'Église', is_active: 1 } }));
  assert.deepEqual(m.data.rows.map((l) => l.code), ['EGL']);
});
