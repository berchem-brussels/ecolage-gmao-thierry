/**
 * Fusion de doublons (0.16.0, étape 12, point 4 ; GES-06) : la demande regroupée passe « Fusionnée » et renvoie vers
 * la principale ; abonnés, demandeur et bénéficiaire reportés ; refus codés ; route des transitions fermée à ce
 * passage ; cloison ; MCP en deux appels ; journal sans texte libre.
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
let gestB;
let agent;
let collegue;
let voisin;
let lieu;
let lieuB;
let nature;
let natureB;

const parse = (r) => JSON.parse(r.body.result.content[0].text);
const tool = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));
async function deposer(c, description, extra = {}) {
  const r = await c.post('/api/demandes', { lieu_id: lieu, categorie_id: nature.id, description, ...extra });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.data;
}
const suiveurs = (id) => getDb().prepare('SELECT user_id, source, remarque FROM demande_suiveurs WHERE demande_id = ? ORDER BY user_id').all(id);

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  gest = await person(srv.base, admin, 'gest.fus@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  gestB = await person(srv.base, admin, 'gest.fusb@exemple.test', eb.id, [[eb.id, 'gestionnaire']]);
  agent = await person(srv.base, admin, 'agent.fus@exemple.test', ea.id);
  collegue = await person(srv.base, admin, 'collegue.fus@exemple.test', ea.id);
  voisin = await person(srv.base, admin, 'voisin.fus@exemple.test', ea.id);
  lieu = (await gest.post('/api/lieux', { nature: 'site', code: 'FU', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis' })).body.data.id;
  lieuB = (await gestB.post('/api/lieux', { nature: 'site', code: 'FB', nom_fr: 'Centre', nom_nl: 'Centrum' })).body.data.id;
  nature = (await gest.get('/api/categories?niveau=nature&q=eclairage')).body.data[0];
  natureB = (await gestB.get('/api/categories?niveau=nature&q=eclairage')).body.data[0];
});
after(() => srv.stop());

test('fusion : « Fusionnée », renvoi vers la principale, abonnés, demandeur et bénéficiaire reportés ; historique et journal', async () => {
  const principale = await deposer(agent, 'Le néon du hall clignote depuis ce matin.');
  const doublon = await deposer(collegue, 'Lumière du hall qui clignote, très gênant.', { beneficiaire_id: voisin.id });
  await gest.post(`/api/demandes/${doublon.id}/suivre`, { source: 'abonnement' });
  const sans = await gest.post(`/api/demandes/${doublon.id}/transitions`, { etat: 'fusionnee' });
  assert.equal(sans.status, 409, 'pas par la route des transitions');
  assert.equal(sans.body.code, 'TRANSITION_PAR_ROUTE');
  const fiche = (await gest.get(`/api/demandes/${doublon.id}`)).body.data;
  assert.ok(fiche.transitions.some((t) => t.vers === 'fusionnee' && t.via === 'fusionner'), 'bouton rendu par le serveur');
  const r = await gest.post(`/api/demandes/${doublon.id}/fusionner`, { principale_id: principale.id, commentaire: 'Même néon que la demande principale.' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.etat, 'fusionnee');
  assert.equal(r.body.data.ouverte, 0);
  assert.equal(r.body.data.fusionnee_dans, principale.id);
  assert.equal(r.body.data.fusionnee_dans_numero, principale.numero);
  assert.deepEqual(suiveurs(doublon.id), [], 'plus personne ne suit la demande regroupée');
  assert.deepEqual(suiveurs(principale.id).map((s) => [s.user_id, s.source]),
    [[gest.id, 'abonnement'], [collegue.id, 'moi_aussi'], [voisin.id, 'moi_aussi']].sort((a, b) => a[0] - b[0]));
  // Le demandeur de la demande regroupée lit les deux : la sienne (« Regroupée ») et la principale, qu'il suit.
  const siennes = (await collegue.get('/api/demandes')).body.data.map((x) => x.id);
  assert.ok(siennes.includes(doublon.id) && siennes.includes(principale.id));
  const h = (await collegue.get(`/api/demandes/${doublon.id}/historique`)).body.data.at(-1);
  assert.deepEqual([h.vers_etat, h.commentaire, h.auteur], ['fusionnee', 'Même néon que la demande principale.', 'service']);
  assert.equal((await collegue.get(`/api/demandes/${doublon.id}`)).body.data.etat_libelle_fr, 'Regroupée avec une autre demande');
  const vueService = (await gest.get(`/api/demandes/${principale.id}`)).body.data;
  assert.deepEqual(vueService.regroupees.map((x) => x.numero), [doublon.numero]);
  assert.equal((await agent.get(`/api/demandes/${principale.id}`)).body.data.regroupees, undefined, 'liste réservée au service');
  const j = JSON.parse(getDb().prepare("SELECT details_json FROM audit_log WHERE action = 'demande.fusion' AND entity_id = ?").get(doublon.id).details_json);
  assert.deepEqual(j, { numero: doublon.numero, de: 'a_qualifier', principale_id: principale.id, principale_numero: principale.numero, personnes_reportees: 3, commentaire_donne: 1 });
});

test('refus : demandeur, elle-même, principale fermée ou en validation, demande déjà fusionnée ; cloison', async () => {
  const a = await deposer(agent, 'Robinet qui goutte au deuxième.');
  const b = await deposer(agent, 'Robinet du deuxième qui goutte.');
  assert.equal((await agent.post(`/api/demandes/${b.id}/fusionner`, { principale_id: a.id })).status, 403, 'le demandeur ne fusionne pas');
  assert.equal((await gest.post(`/api/demandes/${b.id}/fusionner`, { principale_id: b.id })).body.code, 'FUSION_ELLE_MEME');
  assert.equal((await gest.post(`/api/demandes/${b.id}/fusionner`, { principale_id: 99999 })).status, 404);
  const ferme = await deposer(agent, 'Ancienne demande déjà annulée.');
  await agent.del(`/api/demandes/${ferme.id}`, { motif: 'Réglé.' });
  assert.equal((await gest.post(`/api/demandes/${b.id}/fusionner`, { principale_id: ferme.id })).body.code, 'FUSION_PRINCIPALE_FERMEE');
  const autre = (await gestB.post('/api/demandes', { lieu_id: lieuB, categorie_id: natureB.id, description: 'Demande de l’autre entité.' })).body.data;
  assert.equal((await gest.post(`/api/demandes/${b.id}/fusionner`, { principale_id: autre.id })).status, 403, 'principale de l’autre entité');
  assert.equal((await gestB.post(`/api/demandes/${b.id}/fusionner`, { principale_id: autre.id })).status, 403, 'demande de l’autre entité');
  await gest.post(`/api/demandes/${b.id}/fusionner`, { principale_id: a.id });
  const deux = await gest.post(`/api/demandes/${b.id}/fusionner`, { principale_id: a.id });
  assert.equal(deux.body.code, 'TRANSITION_INTERDITE', 'déjà fusionnée');
  assert.equal((await gest.post(`/api/demandes/${a.id}/fusionner`, { principale_id: b.id })).body.code, 'FUSION_PRINCIPALE_FERMEE', 'pas dans une demande regroupée');
});

test('MCP : deux appels, effet décrit avant, rien écrit avant la confirmation', async () => {
  const a = await deposer(agent, 'Porte du garage bloquée ouverte.');
  const b = await deposer(collegue, 'La porte du garage ne ferme plus.');
  const p = await tool(gest, 'prepare_fusionner_demande', { id: b.id, principale_id: a.id });
  assert.deepEqual([p.data.demande.numero, p.data.principale.numero, p.data.personnes_reportees], [b.numero, a.numero, 1]);
  assert.equal(getDb().prepare('SELECT etat FROM demandes WHERE id = ?').get(b.id).etat, 'a_qualifier');
  const c = await tool(gest, 'confirm_fusionner_demande', { confirmation_token: p.data.confirmation_token });
  assert.equal(c.data.etat, 'fusionnee');
  assert.equal(getDb().prepare("SELECT canal FROM demande_historique WHERE demande_id = ? AND vers_etat = 'fusionnee'").get(b.id).canal, 'mcp');
});
