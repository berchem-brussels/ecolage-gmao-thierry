/**
 * Photo de l'endroit sur la fiche d'une demande (0.13.0, étape 8 ter, DV-101) : rendue au seul service technique ;
 * photo du lieu choisi, sinon du plus proche lieu au-dessus (bâtiment, site), dite comme telle ; rien sans photo dans le
 * chemin ; jamais au demandeur ; fichier lu avec la cloison des lieux ; même réponse par l'API et par le MCP.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { jpeg } = require('./fixtures');

let srv;
let admin;
let ea;
let eb;
let agent;
let gest;
let gestB;
const L = {};
let demande;

async function upload(c, id) {
  const body = new FormData();
  body.append('fichier', new Blob([jpeg()], { type: 'image/jpeg' }), 'photo');
  const res = await fetch(`${srv.base}/api/lieux/${id}/photo`, { method: 'POST', headers: { Cookie: c.cookie, 'X-CSRF-Token': c.csrf }, body });
  assert.equal(res.status, 200, await res.text());
}
const parse = (r) => JSON.parse(r.body.result.content[0].text);

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  agent = await person(srv.base, admin, 'agent.pl@exemple.test', ea.id);
  gest = await person(srv.base, admin, 'gest.pl@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  gestB = await person(srv.base, admin, 'gestb.pl@exemple.test', eb.id, [[eb.id, 'gestionnaire']]);
  const lieu = async (body) => { const r = await gest.post('/api/lieux', body); assert.equal(r.status, 201, JSON.stringify(r.body)); return r.body.data.id; };
  L.site = await lieu({ nature: 'site', code: 'PL', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis' });
  L.bat = await lieu({ nature: 'batiment', parent_id: L.site, code: 'PL-A', nom_fr: 'Aile A', nom_nl: 'Vleugel A' });
  const type = (await gest.get('/api/listes-valeurs?liste=type_lieu')).body.data[0].id;
  L.local = await lieu({ nature: 'local', parent_id: L.bat, code: 'PL-A-01', nom_fr: 'Accueil', nom_nl: 'Onthaal', type_id: type });
  const cat = (await agent.get('/api/categories?niveau=nature&q=eclairage')).body.data[0];
  const d = await agent.post('/api/demandes', { lieu_id: L.local, categorie_id: cat.id, description: 'La lampe de l’accueil clignote.' });
  assert.equal(d.status, 201, JSON.stringify(d.body));
  demande = d.body.data.id;
});
after(() => srv.stop());

test('aucune photo dans le chemin : photo_lieu nulle pour le service', async () => {
  const f = (await gest.get(`/api/demandes/${demande}`)).body.data;
  assert.equal(f.photo_lieu, null);
});

test('le local n’a pas de photo : celle du bâtiment, dite comme telle ; puis celle du local quand il en a une', async () => {
  await upload(gest, L.site);
  let f = (await gest.get(`/api/demandes/${demande}`)).body.data;
  assert.equal(f.photo_lieu.lieu_id, L.site);
  assert.equal(f.photo_lieu.nature, 'site');
  assert.equal(f.photo_lieu.du_lieu, 0);
  await upload(gest, L.bat);
  f = (await gest.get(`/api/demandes/${demande}`)).body.data;
  assert.deepEqual({ ...f.photo_lieu, photo_at: undefined }, { lieu_id: L.bat, nature: 'batiment', code: 'PL-A', nom_fr: 'Aile A', nom_nl: 'Vleugel A', photo_at: undefined, du_lieu: 0 });
  assert.ok(f.photo_lieu.photo_at);
  await upload(gest, L.local);
  f = (await gest.get(`/api/demandes/${demande}`)).body.data;
  assert.equal(f.photo_lieu.lieu_id, L.local);
  assert.equal(f.photo_lieu.du_lieu, 1);
  const img = await fetch(`${srv.base}/api/lieux/${f.photo_lieu.lieu_id}/photo?v=${encodeURIComponent(f.photo_lieu.photo_at)}`, { headers: { Cookie: gest.cookie } });
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/jpeg');
});

test('jamais au demandeur ; même réponse par le MCP pour le service', async () => {
  const f = (await agent.get(`/api/demandes/${demande}`)).body.data;
  assert.equal(f.photo_lieu, undefined);
  const viaMcp = parse(await gest.mcp('tools/call', { name: 'get_demande', arguments: { id: demande } }));
  assert.equal(viaMcp.data.photo_lieu.lieu_id, L.local);
  const agentMcp = parse(await agent.mcp('tools/call', { name: 'get_demande', arguments: { id: demande } }));
  assert.ok(agentMcp.data);
  assert.equal(agentMcp.data.photo_lieu, undefined);
});

test('cloison : le service de l’autre entité ne lit ni la demande ni la photo', async () => {
  assert.equal((await gestB.get(`/api/demandes/${demande}`)).status, 403);
  const img = await fetch(`${srv.base}/api/lieux/${L.local}/photo`, { headers: { Cookie: gestB.cookie } });
  assert.equal(img.status, 403);
});

// 0.13.0 (point 6) : filtre des lieux avec ou sans photo, par l'API et par le MCP, dans l'entité active seulement.
test('liste des lieux : has_photo=0 rend les lieux sans photo, has_photo=1 ceux qui en ont ; même chose par le MCP', async () => {
  const sans = (await gest.get('/api/lieux?has_photo=0&limit=200')).body.data.map((l) => l.code);
  const avec = (await gest.get('/api/lieux?has_photo=1&limit=200')).body.data.map((l) => l.code);
  assert.deepEqual(avec.sort(), ['PL', 'PL-A', 'PL-A-01']);
  assert.ok(!sans.some((c) => avec.includes(c)));
  const rien = await gest.post('/api/lieux', { nature: 'site', code: 'PL2', nom_fr: 'Dépôt', nom_nl: 'Depot' });
  assert.equal(rien.status, 201);
  assert.ok((await gest.get('/api/lieux?has_photo=0&limit=200')).body.data.some((l) => l.code === 'PL2'));
  assert.equal((await gest.get('/api/lieux?has_photo=2')).status, 400);
  const viaMcp = parse(await gest.mcp('tools/call', { name: 'list_lieux', arguments: { has_photo: 0, limit: 200 } }));
  assert.ok(viaMcp.data.rows.some((l) => l.code === 'PL2'));
  assert.ok(!viaMcp.data.rows.some((l) => l.code === 'PL'));
  const autre = (await gestB.get('/api/lieux?has_photo=0&limit=200')).body.data;
  assert.ok(!autre.some((l) => l.code.startsWith('PL')), 'cloison : rien de l’autre entité');
});
