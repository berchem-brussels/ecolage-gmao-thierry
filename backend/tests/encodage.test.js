/**
 * Demande encodée par le service technique pour un agent (0.16.0, étape 12, point 3 ; GES-05) : appel téléphonique
 * ou courriel, demandeur choisi parmi les comptes de l'entité, canal noté ; la demande est celle de l'agent (lecture,
 * circuit de validation de son service, langue) ; brouillon de qui encode intact ; refus codés ; cloison ; MCP ; journal.
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
let agent;
let agentB;
let chef;
let lieu;
let nature;
let natureValider;

const parse = (r) => JSON.parse(r.body.result.content[0].text);
const tool = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));
const journal = (id) => JSON.parse(getDb().prepare("SELECT details_json FROM audit_log WHERE action = 'demande.create' AND entity_id = ?").get(id).details_json);
const corps = (extra = {}) => ({ lieu_id: lieu, categorie_id: nature.id, description: 'Fuite au plafond du bureau 3, appel de 9 h.', ...extra });

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  gest = await person(srv.base, admin, 'gest.enc@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  agent = await person(srv.base, admin, 'agent.enc@exemple.test', ea.id);
  agentB = await person(srv.base, admin, 'agent.encb@exemple.test', eb.id);
  chef = await person(srv.base, admin, 'chef.enc@exemple.test', ea.id, [[ea.id, 'valideur']]);
  await admin.put(`/api/users/${agent.id}`, { preferred_lang: 'nl' });
  lieu = (await gest.post('/api/lieux', { nature: 'site', code: 'EN', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis' })).body.data.id;
  nature = (await gest.get('/api/categories?niveau=nature&q=eclairage')).body.data[0];
  natureValider = (await gest.get('/api/categories?niveau=nature&q=demenagement')).body.data[0];
});
after(() => srv.stop());

test('le gestionnaire encode un appel : demande de l’agent, canal téléphone, langue de l’agent, encodée par le gestionnaire', async () => {
  const r = await gest.post('/api/demandes', corps({ demandeur_id: agent.id, canal: 'telephone' }));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const d = r.body.data;
  assert.equal(d.demandeur_id, agent.id);
  assert.equal(d.canal, 'telephone');
  assert.equal(d.langue, 'nl', 'sans langue donnée : celle de l’agent');
  assert.equal(d.encodee_par_nom, 'Nom', 'le service lit qui a encodé');
  assert.equal(d.created_by, gest.id);
  const vue = (await agent.get(`/api/demandes/${d.id}`)).body.data;
  assert.equal(vue.demandeur_id, agent.id);
  assert.equal(vue.encodee_par_nom, undefined, 'le demandeur ne reçoit pas le nom de l’agent du service');
  assert.ok((await agent.get('/api/demandes')).body.data.some((x) => x.id === d.id), 'dans « Mes demandes » de l’agent');
  assert.ok(!(await gest.get('/api/demandes')).body.data.some((x) => x.id === d.id), 'pas dans « Mes demandes » du gestionnaire');
  const h = (await agent.get(`/api/demandes/${d.id}/historique`)).body.data;
  assert.equal(h[0].auteur, 'service');
  const j = journal(d.id);
  assert.deepEqual([j.demandeur_id, j.canal], [agent.id, 'telephone']);
  const ligne = (await admin.get('/api/audit?action=demande.create&limit=200')).body.data.find((l) => l.entity_id === d.id);
  assert.equal(ligne.noms.demandeur_id.code, 'agent.enc@exemple.test');
  assert.equal((await gest.get(`/api/demandes?perimetre=entite&canal=telephone`)).body.data.length, 1, 'filtre du service par canal');
});

test('courriel avec la langue du texte ; un brouillon du gestionnaire et ses pièces restent à lui', async () => {
  await gest.put('/api/demandes/brouillon', { contenu: { description: 'Mon propre brouillon' } });
  const r = await gest.post('/api/demandes', corps({ demandeur_id: agent.id, canal: 'courriel', langue: 'fr' }));
  assert.equal(r.status, 201);
  assert.equal(r.body.data.canal, 'courriel');
  assert.equal(r.body.data.langue, 'fr');
  assert.equal((await gest.get('/api/demandes/brouillon')).body.data.contenu.description, 'Mon propre brouillon');
});

test('refus : agent sans permission, champs incomplets, demandeur d’une autre entité ou inactif', async () => {
  const sans = await agent.post('/api/demandes', corps({ demandeur_id: chef.id, canal: 'telephone' }));
  assert.equal(sans.status, 403, 'un agent n’encode pas pour un autre');
  assert.equal((await gest.post('/api/demandes', corps({ demandeur_id: agent.id }))).body.code, 'ENCODAGE_INCOMPLET');
  assert.equal((await gest.post('/api/demandes', corps({ canal: 'courriel' }))).body.code, 'ENCODAGE_INCOMPLET');
  assert.equal((await gest.post('/api/demandes', corps({ demandeur_id: agentB.id, canal: 'telephone' }))).body.code, 'DEMANDEUR_HORS_ENTITE', 'cloison');
  assert.equal((await gest.post('/api/demandes', corps({ demandeur_id: 99999, canal: 'telephone' }))).body.code, 'DEMANDEUR_HORS_ENTITE');
  assert.equal((await gest.post('/api/demandes', corps({ demandeur_id: agent.id, canal: 'grc' }))).status, 400, 'canal hors des deux admis');
  const n = getDb().prepare('SELECT COUNT(*) AS n FROM demandes').get().n;
  assert.equal(n, 2, 'rien d’écrit par les refus');
});

test('circuit : le service de l’agent décide ; une demande d’aménagement encodée attend son chef', async () => {
  const s = (await admin.post('/api/services', { entite_id: ea.id, code: 'POP', nom_fr: 'Population', nom_nl: 'Bevolking', valideur_id: chef.id })).body.data;
  await admin.put(`/api/users/${agent.id}`, { service_id: s.id });
  const r = await gest.post('/api/demandes', corps({ categorie_id: natureValider.id, demandeur_id: agent.id, canal: 'telephone', description: 'Déplacer deux armoires, appel de l’agent.' }));
  assert.equal(r.body.data.etat, 'en_validation');
  assert.equal(r.body.data.service_id, s.id);
  assert.ok((await chef.get('/api/demandes/a-valider')).body.data.some((x) => x.id === r.body.data.id));
  const parLeChef = await gest.post('/api/demandes', corps({ categorie_id: natureValider.id, demandeur_id: chef.id, canal: 'courriel', description: 'Le chef demande un déménagement.' }));
  assert.equal(parLeChef.body.data.etat, 'a_qualifier', 'demande du chef lui-même');
  assert.equal(journal(parLeChef.body.data.id).validation, 'sans_valideur', 'le chef n’est membre d’aucun service');
});

test('MCP : create_demande encode pour un agent avec les mêmes contrôles', async () => {
  const d = await tool(gest, 'create_demande', corps({ demandeur_id: agent.id, canal: 'courriel', description: 'Courriel : lampe du hall grillée.' }));
  assert.equal(d.data.demandeur_id, agent.id);
  assert.equal(d.data.canal, 'courriel');
  assert.equal((await tool(agent, 'create_demande', corps({ demandeur_id: chef.id, canal: 'courriel' }))).code, 'FORBIDDEN');
});
