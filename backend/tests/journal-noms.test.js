/**
 * Journal d'audit : noms du lieu et de la catégorie à la place des identifiants (0.7.4, DV-50).
 * Les noms sont trouvés à la lecture (« noms »), le détail enregistré ne change pas ; lecture réservée à
 * l'administrateur ; identifiant introuvable signalé ; bénéficiaire laissé en identifiant ; API et MCP identiques.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { getDb } = require('../src/database');

let srv;
let admin;
let ea;
let gest;
let resp;
let agent;
let collegue;
const L = {};
const C = {};
const parse = (r) => JSON.parse(r.body.result.content[0].text);
const tool = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));
const ligne = async (action, entityId) => {
  const r = await admin.get(`/api/audit?action=${action}&limit=200`);
  assert.equal(r.status, 200);
  return r.body.data.find((a) => a.action === action && (entityId === undefined || a.entity_id === entityId));
};

before(async () => {
  srv = await startServer();
  ({ admin, ea } = await setup(srv.base));
  gest = await person(srv.base, admin, 'gest.jn@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  resp = await person(srv.base, admin, 'resp.jn@exemple.test', ea.id, [[ea.id, 'responsable']]);
  agent = await person(srv.base, admin, 'agent.jn@exemple.test', ea.id);
  collegue = await person(srv.base, admin, 'collegue.jn@exemple.test', ea.id);
  const lieu = async (body) => { const r = await gest.post('/api/lieux', body); assert.equal(r.status, 201, JSON.stringify(r.body)); return r.body.data.id; };
  L.site = await lieu({ nature: 'site', code: 'JN', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis' });
  L.site2 = await lieu({ nature: 'site', code: 'JN2', nom_fr: 'Bibliothèque', nom_nl: 'Bibliotheek' });
  L.bat = await lieu({ nature: 'batiment', parent_id: L.site, code: 'JN-A', nom_fr: 'Aile A', nom_nl: 'Vleugel A' });
  const type = (await gest.get('/api/listes-valeurs?liste=type_lieu')).body.data[0].id;
  L.local = await lieu({ nature: 'local', parent_id: L.bat, code: 'JN-A-12', nom_fr: 'Bureau 12', nom_nl: 'Kantoor 12', type_id: type });
  C.nature = (await agent.get('/api/categories?niveau=nature&q=eclairage')).body.data[0];
  const domaines = (await agent.get('/api/categories?niveau=domaine&limit=200')).body.data;
  C.autreDomaine = domaines.find((d) => d.id !== C.nature.parent_id);
});
after(() => srv.stop());

test('dépôt d’une demande : lieu et catégorie nommés, détail inchangé, bénéficiaire en identifiant', async () => {
  const d = await agent.post('/api/demandes', { lieu_id: L.local, categorie_id: C.nature.id, description: 'La lampe du bureau ne s’allume plus.', beneficiaire_id: collegue.id });
  assert.equal(d.status, 201, JSON.stringify(d.body));
  const a = await ligne('demande.create', d.body.data.id);
  assert.equal(a.details.lieu_id, L.local);
  assert.equal(a.details.categorie_id, C.nature.id);
  assert.deepEqual(a.noms.lieu_id, { type: 'lieu', id: L.local, code: 'JN-A-12', nom_fr: 'Bureau 12', nom_nl: 'Kantoor 12', entite_code: 'AA' });
  assert.equal(a.noms.categorie_id.type, 'categorie');
  assert.equal(a.noms.categorie_id.code, C.nature.code);
  assert.equal(a.noms.categorie_id.nom_fr, C.nature.libelle_fr);
  assert.equal(a.noms.categorie_id.nom_nl, C.nature.libelle_nl);
  assert.equal(a.details.beneficiaire_id, collegue.id);
  assert.equal(a.noms.beneficiaire_id, undefined);
  const brut = getDb().prepare('SELECT details_json FROM audit_log WHERE id = ?').get(a.id).details_json;
  assert.doesNotMatch(brut, /Bureau 12|nom_fr/);
});

test('lieu habituel : lieu quitté et lieu choisi nommés ; choix par l’administrateur aussi', async () => {
  assert.equal((await agent.put('/api/auth/lieu-habituel', { lieu_id: L.local })).status, 200);
  assert.equal((await agent.put('/api/auth/lieu-habituel', { lieu_id: L.bat })).status, 200);
  const r = await admin.get('/api/audit?action=user.lieu_habituel&limit=200');
  const a = r.body.data.find((x) => x.details.apres === L.bat);
  assert.equal(a.noms.avant.code, 'JN-A-12');
  assert.equal(a.noms.apres.nom_fr, 'Aile A');
  const premier = r.body.data.find((x) => x.details.apres === L.local && x.details.avant === null);
  assert.equal(premier.noms.avant, undefined);
  assert.equal((await admin.put(`/api/users/${collegue.id}`, { lieu_habituel_id: L.site })).status, 200);
  const u = (await admin.get('/api/audit?action=user.update&limit=200')).body.data.find((x) => x.entity_id === collegue.id && x.details.lieu_habituel_id === L.site);
  assert.equal(u.noms.lieu_habituel_id.nom_nl, 'Gemeentehuis');
});

test('déplacement d’un lieu et d’une catégorie : parent avant et après nommés, dans le bon référentiel', async () => {
  assert.equal((await gest.put(`/api/lieux/${L.bat}`, { parent_id: L.site2 })).status, 200);
  const a = await ligne('lieu.update', L.bat);
  assert.equal(a.noms['avant.parent_id'].code, 'JN');
  assert.equal(a.noms['apres.parent_id'].code, 'JN2');
  assert.equal(a.noms['apres.parent_id'].type, 'lieu');

  const nat = await resp.post('/api/categories', { code: 'jn_nature', libelle_fr: 'Nature JN', libelle_nl: 'Aard JN', parent_id: C.nature.parent_id });
  assert.equal(nat.status, 201, JSON.stringify(nat.body));
  assert.equal((await resp.put(`/api/categories/${nat.body.data.id}`, { parent_id: C.autreDomaine.id })).status, 200);
  const c = await ligne('categorie.update', nat.body.data.id);
  assert.equal(c.noms['avant.parent_id'].type, 'categorie');
  assert.equal(c.noms['apres.parent_id'].code, C.autreDomaine.code);
});

test('identifiant qui ne correspond plus à aucune fiche : introuvable, le reste du détail intact', async () => {
  const id = getDb().prepare(`INSERT INTO audit_log (user_id, action, entity_type, entity_id, channel, details_json, entite_id)
    VALUES (NULL, 'demande.create', 'demande', 999999, 'cli', ?, ?)`).run(JSON.stringify({ numero: 'X', lieu_id: 987654, categorie_id: 'abc' }), ea.id).lastInsertRowid;
  const r = await admin.get(`/api/audit/${id}`);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.data.noms, { lieu_id: { type: 'lieu', id: 987654, introuvable: 1 } });
  assert.equal(r.body.data.details.categorie_id, 'abc');
});

test('ligne sans référence : noms vide ; lecture toujours réservée à l’administrateur', async () => {
  const a = await ligne('login.success');
  assert.deepEqual(a.noms, {});
  assert.equal((await resp.get('/api/audit')).status, 403);
  assert.equal((await tool(resp, 'get_audit', { id: a.id })).code, 'FORBIDDEN');
});

test('MCP : get_audit et list_audit rendent les mêmes noms que l’API', async () => {
  const a = await ligne('demande.create');
  const m = (await tool(admin, 'get_audit', { id: a.id })).data;
  assert.deepEqual(m.noms, a.noms);
  const l = (await tool(admin, 'list_audit', { action: 'demande.create', limit: 200 })).data;
  assert.deepEqual(l.rows.find((y) => y.id === a.id).noms, a.noms);
});
