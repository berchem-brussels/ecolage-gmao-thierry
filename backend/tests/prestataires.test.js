/**
 * Prestataires externes (0.19.0, étape 15, point 3 ; REF-07, EXT-03) : droits, numéro d'entreprise belge (format, clé
 * modulo 97, unicité dans l'entité), corps de métier de l'entité, cloison, désactivation, journal nommé, MCP.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { getDb } = require('../src/database');
const { numeroEntreprise } = require('../src/services/prestataires');

let srv;
let admin;
let ea;
let eb;
let resp;
let gest;
let chef;
let agent;
let respB;
let presta;

const valeur = async (c, liste, code) => (await c.get(`/api/listes-valeurs?liste=${liste}&limit=200`)).body.data.find((v) => v.code === code).id;
// Numéros fictifs dont la clé modulo 97 est juste (aucune entreprise réelle visée).
const NUM_A = '0123.456.749';
const NUM_B = '0999.999.922';

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  resp = await person(srv.base, admin, 'resp.pr@exemple.test', ea.id, [[ea.id, 'responsable']]);
  gest = await person(srv.base, admin, 'gest.pr@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  chef = await person(srv.base, admin, 'chef.pr@exemple.test', ea.id, [[ea.id, 'chef_equipe']]);
  agent = await person(srv.base, admin, 'agent.pr@exemple.test', ea.id);
  respB = await person(srv.base, admin, 'respb.pr@exemple.test', eb.id, [[eb.id, 'responsable']]);
});
after(() => srv.stop());

test('numéro d’entreprise : dix chiffres, 0 ou 1 en tête, clé modulo 97 ; forme 0123.456.789', () => {
  assert.equal(numeroEntreprise('0123456749'), NUM_A);
  assert.equal(numeroEntreprise('0123 456 749'), NUM_A);
  assert.equal(numeroEntreprise(NUM_B), NUM_B);
  assert.equal(numeroEntreprise(''), null);
  for (const faux of ['0123.456.748', '2123.456.749', '123.456.749', '01234567490']) {
    assert.throws(() => numeroEntreprise(faux), (e) => e.code === 'NUMERO_ENTREPRISE_INVALIDE', faux);
  }
});

test('lecture : gestionnaire et responsable ; chef d’équipe et demandeur refusés (403)', async () => {
  for (const c of [gest, resp]) assert.equal((await c.get('/api/prestataires')).status, 200);
  for (const c of [chef, agent]) assert.equal((await c.get('/api/prestataires')).status, 403);
});

test('création par le responsable : numéro normalisé, corps de métier, langue ; le gestionnaire ne crée pas', async () => {
  const elec = await valeur(resp, 'corps_metier', 'electricite');
  const chauf = await valeur(resp, 'corps_metier', 'chauffage');
  const corps = { nom: ' Électricité Fictive SRL ', numero_entreprise: '0123456749', langue: 'nl', contact_nom: 'Jan Contact', telephone: '+32 2 000 00 00',
    courriel: 'contact@fictif.invalid', reference_marche: 'Marché 2026/017 (maintenance)', corps_metier: [elec, chauf] };
  assert.equal((await gest.post('/api/prestataires', corps)).status, 403);
  const r = await resp.post('/api/prestataires', corps);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  presta = r.body.data;
  assert.equal(presta.nom, 'Électricité Fictive SRL', 'espaces retirés');
  assert.equal(presta.numero_entreprise, NUM_A);
  assert.equal(presta.langue, 'nl');
  assert.deepEqual(presta.corps_metier.map((c) => c.code).sort(), ['chauffage', 'electricite']);
  assert.equal((await resp.post('/api/prestataires', { nom: 'Autre', numero_entreprise: NUM_A })).body.code, 'PRESTATAIRE_EXISTE');
  assert.equal((await resp.post('/api/prestataires', { nom: 'Faux', numero_entreprise: '0123.456.748' })).body.code, 'NUMERO_ENTREPRISE_INVALIDE');
  assert.equal((await resp.post('/api/prestataires', { nom: 'Courriel', courriel: 'pas-une-adresse' })).status, 400);
  assert.equal((await resp.post('/api/prestataires', { nom: '   ' })).status, 400, 'nom fait d’espaces');
  const sans = await resp.post('/api/prestataires', { nom: 'Petit artisan' });
  assert.equal(sans.status, 201, 'numéro facultatif');
  assert.equal(sans.body.data.langue, 'fr', 'français par défaut');
  // Le même numéro est admis dans l'autre entité (registres distincts).
  assert.equal((await respB.post('/api/prestataires', { nom: 'Même société', numero_entreprise: NUM_A })).status, 201);
});

test('corps de métier : valeurs de la liste corps_metier de l’entité seulement', async () => {
  const typeLieu = await valeur(resp, 'type_lieu', 'bureau');
  const elecB = await valeur(respB, 'corps_metier', 'electricite');
  assert.equal((await resp.put(`/api/prestataires/${presta.id}`, { corps_metier: [typeLieu] })).body.code, 'VALEUR_INVALIDE');
  assert.equal((await resp.put(`/api/prestataires/${presta.id}`, { corps_metier: [elecB] })).body.code, 'VALEUR_INVALIDE');
});

test('modification : champs changés et corps de métier au journal, nommés à la lecture ; rien sans changement', async () => {
  const plomb = await valeur(resp, 'corps_metier', 'plomberie');
  const r = await resp.put(`/api/prestataires/${presta.id}`, { telephone: '02 111 11 11', corps_metier: [plomb], numero_entreprise: '0123 456 749' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body.data.corps_metier.map((c) => c.code), ['plomberie']);
  const d = JSON.parse(getDb().prepare("SELECT details_json FROM audit_log WHERE action = 'prestataire.update' ORDER BY id DESC LIMIT 1").get().details_json);
  assert.deepEqual(d.apres, { telephone: '02 111 11 11' }, 'le numéro réécrit autrement ne change pas');
  assert.deepEqual(d.corps_metier.apres, [plomb]);
  const j = (await admin.get('/api/audit?action=prestataire.update&limit=1')).body.data[0];
  assert.equal(j.noms['corps_metier.apres.0'].nom_fr, 'Plomberie et sanitaires');
  const n = () => getDb().prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'prestataire.update'").get().n;
  const avant = n();
  await resp.put(`/api/prestataires/${presta.id}`, { telephone: '02 111 11 11', corps_metier: [plomb] });
  assert.equal(n(), avant);
  assert.equal((await gest.put(`/api/prestataires/${presta.id}`, { nom: 'X' })).status, 403);
});

test('cloison : un prestataire de l’autre entité n’est ni lu, ni modifié, ni désactivé (403)', async () => {
  assert.equal((await respB.get(`/api/prestataires/${presta.id}`)).status, 403);
  assert.equal((await respB.put(`/api/prestataires/${presta.id}`, { nom: 'Pris' })).status, 403);
  assert.equal((await respB.del(`/api/prestataires/${presta.id}`, { motif: 'essai' })).status, 403);
  assert.ok(!(await respB.get('/api/prestataires')).body.data.some((p) => p.id === presta.id));
});

test('liste : recherche, filtre par corps de métier ; désactivation avec motif et réactivation', async () => {
  const plomb = await valeur(gest, 'corps_metier', 'plomberie');
  assert.deepEqual((await gest.get(`/api/prestataires?corps_metier_id=${plomb}`)).body.data.map((p) => p.id), [presta.id]);
  assert.deepEqual((await gest.get('/api/prestataires?q=2026%2F017')).body.data.map((p) => p.id), [presta.id], 'recherche dans la référence du marché');
  const r = await resp.del(`/api/prestataires/${presta.id}`, { motif: 'Marché terminé' });
  assert.equal(r.body.data.is_active, 0);
  assert.equal((await resp.del(`/api/prestataires/${presta.id}`, { motif: 'encore' })).status, 409);
  assert.equal((await gest.get('/api/prestataires?is_active=1')).body.data.some((p) => p.id === presta.id), false);
  assert.equal((await resp.put(`/api/prestataires/${presta.id}`, { is_active: 1 })).body.data.motif_desactivation, null);
});

test('MCP : liste et désactivation en deux appels, même cloison', async () => {
  const appel = async (c, name, args) => (await c.mcp('tools/call', { name, arguments: args })).body.result;
  const l = await appel(gest, 'list_prestataires', {});
  assert.ok(JSON.parse(l.content[0].text).data.rows.some((p) => p.id === presta.id));
  assert.ok((await appel(respB, 'get_prestataire', { id: presta.id })).isError, 'cloison par le MCP');
  const prep = JSON.parse((await appel(resp, 'prepare_deactivate_prestataire', { id: presta.id, motif: 'essai MCP' })).content[0].text).data;
  assert.equal(prep.prestataire.nom, 'Électricité Fictive SRL');
  const conf = JSON.parse((await appel(resp, 'confirm_deactivate_prestataire', { confirmation_token: prep.confirmation_token })).content[0].text).data;
  assert.equal(conf.is_active, 0);
});
