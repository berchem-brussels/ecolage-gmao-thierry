/**
 * Modèles de réponse au demandeur (0.15.0, étape 10, point 4 ; GES-09) : modèles livrés par entité, lecture par le
 * service, écriture par le responsable, variables admises seulement, désactivation avec motif et réactivation, journal
 * des champs changés, trace, MCP en deux appels pour la désactivation, cloison.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { getDb } = require('../src/database');

let srv;
let admin;
let ea;
let eb;
let gest;
let resp;
let agent;
let respB;
const parse = (r) => JSON.parse(r.body.result.content[0].text);
const tool = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  gest = await person(srv.base, admin, 'gest.mod@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  resp = await person(srv.base, admin, 'resp.mod@exemple.test', ea.id, [[ea.id, 'responsable']]);
  agent = await person(srv.base, admin, 'agent.mod@exemple.test', ea.id);
  respB = await person(srv.base, admin, 'resp.modb@exemple.test', eb.id, [[eb.id, 'responsable']]);
});
after(() => srv.stop());

test('modèles livrés dans chaque entité, lus par le service avec les variables ; pas par un demandeur', async () => {
  const r = await gest.get('/api/modeles-reponse?is_active=1');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.data.map((m) => m.code), ['prise_en_charge', 'precision', 'acces', 'termine']);
  assert.deepEqual(r.body.meta.variables, ['numero', 'lieu', 'etat', 'prenom']);
  assert.match(r.body.data[0].texte_nl, /Goedendag \{prenom\}/);
  assert.equal(r.body.data[0].trace.etat, 'livree');
  assert.equal((await respB.get('/api/modeles-reponse')).body.data.length, 4, 'l’autre entité a les siens');
  assert.equal((await agent.get('/api/modeles-reponse')).status, 403);
});

test('écriture : le responsable seul ; variable inconnue refusée en nommant la variable ; trace et journal des champs changés', async () => {
  const corps = { titre_fr: 'Pièce commandée', titre_nl: 'Onderdeel besteld', texte_fr: 'Bonjour {prenom}, la pièce pour {numero} est commandée.', texte_nl: 'Goedendag {prenom}, het onderdeel voor {numero} is besteld.' };
  assert.equal((await gest.post('/api/modeles-reponse', corps)).status, 403);
  const faux = await resp.post('/api/modeles-reponse', { ...corps, texte_nl: 'Goedendag {voornaam}' });
  assert.equal(faux.status, 409);
  assert.equal(faux.body.code, 'MODELE_VARIABLE');
  assert.deepEqual(faux.body.details, ['{voornaam}']);
  assert.match(faux.body.message, /\{voornaam\}/);
  const c = await resp.post('/api/modeles-reponse', corps);
  assert.equal(c.status, 201, JSON.stringify(c.body));
  assert.equal(c.body.data.ordre, 50);
  assert.equal(c.body.data.trace.etat, 'creee');
  const u = await resp.put(`/api/modeles-reponse/${c.body.data.id}`, { titre_fr: 'Pièce en commande' });
  assert.equal(u.body.data.titre_fr, 'Pièce en commande');
  const ligne = getDb().prepare("SELECT details_json FROM audit_log WHERE action = 'modele_reponse.update' ORDER BY id DESC").get();
  assert.deepEqual(JSON.parse(ligne.details_json), { avant: { titre_fr: 'Pièce commandée' }, apres: { titre_fr: 'Pièce en commande' } });
  assert.equal((await gest.put(`/api/modeles-reponse/${c.body.data.id}`, { titre_fr: 'x' })).status, 403);
});

test('désactivation avec motif, puis réactivation ; MCP en deux appels ; cloison', async () => {
  const m = (await resp.get('/api/modeles-reponse')).body.data.find((x) => x.code === 'acces');
  const resume = await tool(resp, 'prepare_deactivate_modele_reponse', { id: m.id, motif: 'Plus utilisé' });
  assert.ok(resume.data.confirmation_token, JSON.stringify(resume));
  assert.equal((await gest.get(`/api/modeles-reponse/${m.id}`)).body.data.is_active, 1, 'rien n’est fait avant la confirmation');
  const d = (await tool(resp, 'confirm_deactivate_modele_reponse', { confirmation_token: resume.data.confirmation_token })).data;
  assert.equal(d.is_active, 0);
  assert.equal(d.motif_desactivation, 'Plus utilisé');
  assert.ok(!(await gest.get('/api/modeles-reponse?is_active=1')).body.data.some((x) => x.id === m.id), 'plus proposé');
  assert.equal((await resp.del(`/api/modeles-reponse/${m.id}`, { motif: 'Encore' })).body.code, 'CANCELLED');
  const re = await resp.put(`/api/modeles-reponse/${m.id}`, { is_active: 1 });
  assert.equal(re.body.data.is_active, 1);
  assert.equal(re.body.data.motif_desactivation, null);
  assert.equal((await respB.get(`/api/modeles-reponse/${m.id}`)).status, 403);
  assert.equal((await respB.put(`/api/modeles-reponse/${m.id}`, { titre_fr: 'Piraté' })).status, 403);
  assert.equal((await gest.get('/api/modeles-reponse/999999')).status, 404);
});

test('nouvelle entité : modèles livrés créés ; jamais recréés après une désactivation', async () => {
  const ec = (await admin.post('/api/entites', { code: 'CC', nom_fr: 'Entité C', nom_nl: 'Entiteit C' })).body.data;
  const n = getDb().prepare('SELECT COUNT(*) AS n FROM modeles_reponse WHERE entite_id = ?').get(ec.id).n;
  assert.equal(n, 4);
  require('../src/services/modeles-reponse').seedAll();
  assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM modeles_reponse WHERE entite_id = ?').get(ec.id).n, 4);
});
