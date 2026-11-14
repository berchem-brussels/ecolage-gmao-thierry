/**
 * Fil de messages d'une demande (0.15.0, étape 10, point 1 ; SUI-04, SEC-02, SUI-07) : lecture par le demandeur, le
 * bénéficiaire et le service, pas par qui suit seulement ; commentaires internes du service jamais rendus au demandeur ;
 * écriture seulement sur une demande ouverte ; pièces en attente du message, rattachées à l'envoi, lues selon le
 * message ; plafond par message ; journal sans texte ; MCP ; migration 013 sur une base 0.14.0.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { jpeg } = require('./fixtures');
const { getDb } = require('../src/database');

let srv;
let admin;
let ea;
let eb;
let gest;
let agent;
let benef;
let suiveur;
let collegue;
let gestB;
let lieu;
let categorie;
const parse = (r) => JSON.parse(r.body.result.content[0].text);
const tool = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));
/** Résultat d'un outil réussi : son contenu « data ». */
const donnees = async (c, name, args = {}) => (await tool(c, name, args)).data;

async function deposer(description = 'La lampe du couloir ne s’allume plus.', extra = {}) {
  const r = await agent.post('/api/demandes', { lieu_id: lieu, categorie_id: categorie.id, description, ...extra });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.data;
}

/** Photo jointe en attente du prochain message, comme le navigateur (formulaire multipart). */
async function joindre(c, demandeId) {
  const body = new FormData();
  body.append('fichier', new Blob([jpeg()], { type: 'image/jpeg' }), 'photo.jpg');
  const res = await fetch(`${srv.base}/api/demandes/${demandeId}/messages/pieces`, { method: 'POST', headers: { Cookie: c.cookie, 'X-CSRF-Token': c.csrf }, body });
  return { status: res.status, body: await res.json() };
}

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  gest = await person(srv.base, admin, 'gest.msg@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  agent = await person(srv.base, admin, 'agent.msg@exemple.test', ea.id);
  benef = await person(srv.base, admin, 'benef.msg@exemple.test', ea.id);
  suiveur = await person(srv.base, admin, 'suiveur.msg@exemple.test', ea.id);
  collegue = await person(srv.base, admin, 'collegue.msg@exemple.test', ea.id);
  gestB = await person(srv.base, admin, 'gest.msgb@exemple.test', eb.id, [[eb.id, 'gestionnaire']]);
  lieu = (await gest.post('/api/lieux', { nature: 'site', code: 'MS', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis' })).body.data.id;
  categorie = (await agent.get('/api/categories?niveau=nature&q=eclairage')).body.data[0];
});
after(() => srv.stop());

test('fil public : le demandeur écrit, le service lit avec le nom ; le service répond, le demandeur lit sans le nom de l’agent', async () => {
  const d = await deposer();
  const m1 = await agent.post(`/api/demandes/${d.id}/messages`, { texte: 'Elle clignote aussi le matin.', langue: 'fr' });
  assert.equal(m1.status, 201, JSON.stringify(m1.body));
  assert.equal(m1.body.data.auteur, 'demandeur');
  assert.equal(m1.body.data.interne, 0);
  assert.equal(m1.body.data.de_moi, 1);
  const r = await gest.post(`/api/demandes/${d.id}/messages`, { texte: 'Nous passons jeudi matin.' });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.auteur, 'service');
  const vuService = (await gest.get(`/api/demandes/${d.id}/messages`)).body.data;
  assert.deepEqual(vuService.map((m) => m.texte), ['Elle clignote aussi le matin.', 'Nous passons jeudi matin.']);
  assert.equal(vuService[0].auteur_nom, 'Nom');
  assert.equal(vuService[1].de_moi, 1);
  const vuDemandeur = (await agent.get(`/api/demandes/${d.id}/messages`)).body.data;
  assert.equal(vuDemandeur.length, 2);
  assert.equal(vuDemandeur[1].auteur, 'service');
  assert.equal(vuDemandeur[1].auteur_nom, null, 'SUI-07 : pas de nom d’agent pour le demandeur');
  assert.equal(vuDemandeur[1].auteur_prenom, null);
  assert.equal(vuDemandeur[1].user_id, undefined);
  assert.equal(vuDemandeur[1].de_moi, 0);
});

test('commentaire interne : écrit et lu par le service seul, jamais rendu au demandeur (API et MCP)', async () => {
  const d = await deposer();
  assert.equal((await agent.post(`/api/demandes/${d.id}/messages`, { texte: 'Je tente l’interne', interne: true })).status, 403);
  const i = await gest.post(`/api/demandes/${d.id}/messages`, { texte: 'Prévoir l’échelle de 3 m.', interne: true });
  assert.equal(i.status, 201);
  assert.equal(i.body.data.interne, 1);
  await gest.post(`/api/demandes/${d.id}/messages`, { texte: 'Bien reçu.' });
  assert.deepEqual((await gest.get(`/api/demandes/${d.id}/messages`)).body.data.map((m) => m.interne), [1, 0]);
  const lu = (await agent.get(`/api/demandes/${d.id}/messages`)).body.data;
  assert.deepEqual(lu.map((m) => m.texte), ['Bien reçu.']);
  assert.deepEqual((await donnees(agent, 'list_messages_demande', { id: d.id })).map((m) => m.texte), ['Bien reçu.']);
  assert.equal((await donnees(gest, 'list_messages_demande', { id: d.id })).length, 2);
});

test('lecture : bénéficiaire oui ; qui suit seulement (« Moi aussi ») et un autre agent de l’entité non (403)', async () => {
  const d = await deposer('Prise arrachée dans le bureau 12.', { beneficiaire_id: benef.id });
  await agent.post(`/api/demandes/${d.id}/messages`, { texte: 'Pour mon collègue.' });
  const b = await benef.post(`/api/demandes/${d.id}/messages`, { texte: 'C’est la prise près de la fenêtre.' });
  assert.equal(b.status, 201);
  assert.equal(b.body.data.auteur, 'beneficiaire');
  assert.equal((await benef.get(`/api/demandes/${d.id}/messages`)).body.data.length, 2);
  assert.equal((await suiveur.post(`/api/demandes/${d.id}/suivre`, { remarque: 'Chez moi aussi.' })).status, 200);
  assert.equal((await suiveur.get(`/api/demandes/${d.id}`)).status, 200, 'qui suit lit la fiche');
  assert.equal((await suiveur.get(`/api/demandes/${d.id}/messages`)).status, 403, 'mais pas le fil');
  assert.equal((await suiveur.post(`/api/demandes/${d.id}/messages`, { texte: 'Et moi ?' })).status, 403);
  assert.equal((await tool(suiveur, 'list_messages_demande', { id: d.id })).code, 'FORBIDDEN');
  assert.equal((await collegue.get(`/api/demandes/${d.id}/messages`)).status, 403);
  assert.equal((await collegue.post(`/api/demandes/${d.id}/messages`, { texte: 'Intrus' })).status, 403);
});

test('cloison : l’autre entité ne lit ni n’écrit (403) ; demande inconnue 404', async () => {
  const d = await deposer();
  assert.equal((await gestB.get(`/api/demandes/${d.id}/messages`)).status, 403);
  assert.equal((await gestB.post(`/api/demandes/${d.id}/messages`, { texte: 'Piraté' })).status, 403);
  assert.equal((await gestB.post(`/api/demandes/${d.id}/messages`, { texte: 'Piraté', interne: true })).status, 403);
  assert.equal((await gest.get('/api/demandes/999999/messages')).status, 404);
  assert.equal((await gest.get(`/api/demandes/${d.id}/messages`)).body.data.length, 0);
});

test('demande fermée : plus d’écriture (409 DEMANDE_FERMEE), le fil reste lisible', async () => {
  const d = await deposer();
  await agent.post(`/api/demandes/${d.id}/messages`, { texte: 'Merci.' });
  assert.equal((await agent.del(`/api/demandes/${d.id}`, { motif: 'Réglé tout seul.' })).status, 200);
  const r = await agent.post(`/api/demandes/${d.id}/messages`, { texte: 'Encore un mot.' });
  assert.equal(r.status, 409);
  assert.equal(r.body.code, 'DEMANDE_FERMEE');
  assert.equal((await gest.post(`/api/demandes/${d.id}/messages`, { texte: 'Note', interne: true })).body.code, 'DEMANDE_FERMEE');
  assert.equal((await joindre(agent, d.id)).body.code, 'DEMANDE_FERMEE');
  assert.equal((await agent.get(`/api/demandes/${d.id}/messages`)).body.data.length, 1);
});

test('message vide refusé (409 MESSAGE_VIDE) ; texte trop long refusé (400)', async () => {
  const d = await deposer();
  const vide = await agent.post(`/api/demandes/${d.id}/messages`, { texte: '   ' });
  assert.equal(vide.status, 409);
  assert.equal(vide.body.code, 'MESSAGE_VIDE');
  assert.equal((await agent.post(`/api/demandes/${d.id}/messages`, {})).body.code, 'MESSAGE_VIDE');
  assert.equal((await agent.post(`/api/demandes/${d.id}/messages`, { texte: 'x'.repeat(4001) })).status, 400);
});

test('pièces : en attente lues par leur seul auteur, rattachées à l’envoi, hors des pièces de la demande ; photo seule permise', async () => {
  const d = await deposer();
  const p = await joindre(agent, d.id);
  assert.equal(p.status, 201, JSON.stringify(p.body));
  assert.equal((await gest.get(`/api/pieces/${p.body.data.id}`)).status, 403, 'pas encore envoyée : son auteur seul');
  assert.equal((await gest.get(`/api/pieces/${p.body.data.id}/fichier`)).status, 403);
  const attente = (await agent.get(`/api/demandes/${d.id}/messages/pieces`)).body.data;
  assert.deepEqual(attente.pieces.map((x) => x.id), [p.body.data.id]);
  assert.equal(attente.plafonds.nombre, 5);
  assert.equal((await gest.get(`/api/demandes/${d.id}/messages/pieces`)).body.data.pieces.length, 0, 'chacun ses pièces en attente');
  const m = await agent.post(`/api/demandes/${d.id}/messages`, {});
  assert.equal(m.status, 201, 'une photo seule fait un message');
  assert.equal(m.body.data.texte, null);
  assert.deepEqual(m.body.data.pieces.map((x) => x.id), [p.body.data.id]);
  assert.equal((await agent.get(`/api/demandes/${d.id}/messages/pieces`)).body.data.pieces.length, 0);
  assert.equal((await gest.get(`/api/pieces/${p.body.data.id}`)).status, 200, 'envoyée : le service la lit');
  assert.equal((await gest.get(`/api/pieces/${p.body.data.id}/fichier`)).status, 200);
  assert.deepEqual((await gest.get(`/api/demandes/${d.id}`)).body.data.pieces, [], 'pas parmi les pièces de la demande');
  assert.deepEqual((await gest.get(`/api/demandes/${d.id}/messages`)).body.data[0].pieces.map((x) => x.nom), ['photo.jpg']);
});

test('pièce d’un commentaire interne : le demandeur ne la lit pas (403) ; une pièce envoyée ne se retire que par le service', async () => {
  const d = await deposer();
  const pi = await joindre(gest, d.id);
  const i = await gest.post(`/api/demandes/${d.id}/messages`, { texte: 'Photo de l’armoire électrique.', interne: true });
  assert.equal(i.body.data.pieces.length, 1);
  assert.equal((await agent.get(`/api/pieces/${pi.body.data.id}`)).status, 403);
  assert.equal((await agent.get(`/api/pieces/${pi.body.data.id}/fichier`)).status, 403);
  // Pièce publique du demandeur : il la retire tant qu'elle attend, plus après l'envoi.
  const a1 = await joindre(agent, d.id);
  assert.equal((await agent.del(`/api/pieces/${a1.body.data.id}`, {})).status, 200);
  const a2 = await joindre(agent, d.id);
  await agent.post(`/api/demandes/${d.id}/messages`, { texte: 'Voici la photo.' });
  assert.equal((await agent.del(`/api/pieces/${a2.body.data.id}`, {})).status, 403);
  assert.equal((await gest.del(`/api/pieces/${a2.body.data.id}`, {})).status, 200, 'le service retire une photo envoyée (RGPD-02)');
  assert.equal((await gest.get(`/api/demandes/${d.id}/messages`)).body.data.find((m) => m.texte === 'Voici la photo.').pieces.length, 0);
});

test('plafond par message : la sixième pièce en attente est refusée (409 PIECES_PLAFOND_MESSAGE) ; l’envoi libère le plafond', async () => {
  const d = await deposer();
  for (let i = 0; i < 5; i += 1) assert.equal((await joindre(agent, d.id)).status, 201);
  const sixieme = await joindre(agent, d.id);
  assert.equal(sixieme.status, 409);
  assert.equal(sixieme.body.code, 'PIECES_PLAFOND_MESSAGE');
  await agent.post(`/api/demandes/${d.id}/messages`, { texte: 'Cinq photos.' });
  assert.equal((await joindre(agent, d.id)).status, 201, 'le message suivant a son propre plafond');
  assert.equal((await agent.get(`/api/demandes/${d.id}`)).body.data.pieces.length, 0, 'le plafond de la demande n’est pas entamé');
});

test('journal : demande.message sans texte (numéro, message, interne, longueur, pièces)', async () => {
  const d = await deposer();
  const m = (await gest.post(`/api/demandes/${d.id}/messages`, { texte: 'Texte confidentiel du service.', interne: true })).body.data;
  const ligne = getDb().prepare("SELECT details_json AS details, channel FROM audit_log WHERE action = 'demande.message' AND entity_id = ? ORDER BY id DESC").get(d.id);
  const details = JSON.parse(ligne.details);
  assert.deepEqual(details, { numero: d.numero, message_id: m.id, interne: 1, longueur: 30, pieces: 0 });
  assert.doesNotMatch(ligne.details, /confidentiel/);
});

test('MCP : add_message_demande écrit au canal MCP, dans la langue donnée ; refus codés', async () => {
  const d = await deposer();
  const m = await donnees(agent, 'add_message_demande', { id: d.id, texte: 'Het lampje knippert.', langue: 'nl' });
  assert.equal(m.auteur, 'demandeur');
  assert.equal(m.langue, 'nl');
  assert.equal(getDb().prepare('SELECT canal FROM demande_messages WHERE id = ?').get(m.id).canal, 'mcp');
  assert.equal((await tool(agent, 'add_message_demande', { id: d.id, texte: 'x', interne: true })).code, 'FORBIDDEN');
  assert.equal((await tool(gestB, 'add_message_demande', { id: d.id, texte: 'Piraté' })).code, 'FORBIDDEN');
  assert.deepEqual((await donnees(agent, 'list_pieces_message', { id: d.id })).pieces, []);
});

// 0.15.0, point 2 : non lu, marquage, filtre et compteur du tableau de bord.
test('non lu : chaque personne a son repère ; ses propres messages ne comptent pas ; l’interne seulement pour le service', async () => {
  const d = await deposer('Store bloqué dans la salle 3.');
  await agent.post(`/api/demandes/${d.id}/messages`, { texte: 'Il est bloqué à mi-hauteur.' });
  assert.equal((await agent.get(`/api/demandes/${d.id}`)).body.data.messages_non_lus, 0, 'son propre message n’est pas « non lu »');
  const g = (await gest.get(`/api/demandes/${d.id}`)).body.data;
  assert.equal(g.messages_non_lus, 1);
  assert.deepEqual(g.fil, { lecture: 1, ecriture: 1, interne: 1 });
  assert.deepEqual((await agent.get(`/api/demandes/${d.id}`)).body.data.fil, { lecture: 1, ecriture: 1, interne: 0 });
  assert.equal((await gest.get(`/api/demandes/${d.id}/messages`)).body.data[0].non_lu, 1, 'lire le fil ne le marque pas lu');
  const bord1 = (await gest.get('/api/demandes/tableau-bord')).body.data.messages_a_lire;
  const liste = (await gest.get('/api/demandes?perimetre=entite&messages=non_lus&limit=200')).body;
  assert.equal(liste.pagination.total, bord1, 'même total que le compteur');
  assert.ok(liste.data.some((x) => x.id === d.id && x.messages_non_lus === 1));
  const lu = await gest.post(`/api/demandes/${d.id}/messages/lu`, {});
  assert.equal(lu.status, 200);
  assert.equal(lu.body.data.non_lus, 0);
  assert.equal((await gest.get('/api/demandes/tableau-bord')).body.data.messages_a_lire, bord1 - 1);
  assert.equal((await gest.get(`/api/demandes/${d.id}/messages`)).body.data[0].non_lu, 0);
  // Une note interne d'un collègue est non lue pour le service, jamais pour le demandeur.
  const resp = await person(srv.base, admin, `resp.msg.${d.id}@exemple.test`, ea.id, [[ea.id, 'responsable']]);
  await resp.post(`/api/demandes/${d.id}/messages`, { texte: 'Commander la manivelle.', interne: true });
  assert.equal((await gest.get(`/api/demandes/${d.id}`)).body.data.messages_non_lus, 1);
  assert.equal((await agent.get(`/api/demandes/${d.id}`)).body.data.messages_non_lus, 0);
  await gest.post(`/api/demandes/${d.id}/messages`, { texte: 'Nous passons demain.' });
  const mes = (await agent.get('/api/demandes?messages=non_lus')).body;
  assert.equal(mes.data.find((x) => x.id === d.id)?.messages_non_lus, 1, 'le demandeur retrouve la demande qui a une réponse');
  assert.ok(mes.data.every((x) => x.messages_non_lus > 0), 'seulement des demandes avec un message non lu');
  // Marquer jusqu'à un message donné, jamais en arrière.
  const fil = (await agent.get(`/api/demandes/${d.id}/messages`)).body.data;
  assert.equal((await agent.post(`/api/demandes/${d.id}/messages/lu`, { jusqu_a: fil[1].id })).body.data.non_lus, 0);
  assert.equal((await agent.post(`/api/demandes/${d.id}/messages/lu`, { jusqu_a: 1 })).body.data.dernier_lu, fil[1].id);
});

test('non lu : qui suit seulement n’a jamais de message non lu ni le droit de marquer ; demande fermée : plus d’écriture', async () => {
  const d = await deposer('Radiateur froid au 2e étage.');
  await suiveur.post(`/api/demandes/${d.id}/suivre`, {});
  await gest.post(`/api/demandes/${d.id}/messages`, { texte: 'Purge prévue.' });
  const vu = (await suiveur.get(`/api/demandes/${d.id}`)).body.data;
  assert.equal(vu.messages_non_lus, 0);
  assert.deepEqual(vu.fil, { lecture: 0, ecriture: 0, interne: 0 });
  assert.equal((await suiveur.get('/api/demandes?messages=non_lus')).body.data.some((x) => x.id === d.id), false);
  assert.equal((await suiveur.post(`/api/demandes/${d.id}/messages/lu`, {})).status, 403);
  assert.equal((await gestB.post(`/api/demandes/${d.id}/messages/lu`, {})).status, 403);
  await agent.del(`/api/demandes/${d.id}`, { motif: 'Ça chauffe à nouveau.' });
  assert.deepEqual((await agent.get(`/api/demandes/${d.id}`)).body.data.fil, { lecture: 1, ecriture: 0, interne: 0 });
  assert.deepEqual((await gest.get(`/api/demandes/${d.id}`)).body.data.fil, { lecture: 1, ecriture: 0, interne: 0 });
});

// 0.15.0, point 3 (GES-08) : mentions d'un collègue dans une note interne.
test('mentions : collègues du service mentionnables, dans une note interne seulement ; refus codés', async () => {
  const d = await deposer('Chasse d’eau qui coule sans arrêt.');
  const resp = await person(srv.base, admin, `resp.mention.${d.id}@exemple.test`, ea.id, [[ea.id, 'responsable']]);
  const liste = (await gest.get(`/api/demandes/${d.id}/messages/mentionnables`)).body.data;
  assert.ok(liste.some((p) => p.user_id === resp.id), 'le responsable est mentionnable');
  assert.ok(!liste.some((p) => p.user_id === gest.id), 'pas soi-même');
  assert.ok(!liste.some((p) => p.user_id === agent.id), 'pas un demandeur');
  assert.ok(!liste.some((p) => p.user_id === gestB.id), 'pas le service de l’autre entité');
  assert.equal((await agent.get(`/api/demandes/${d.id}/messages/mentionnables`)).status, 403);
  const publique = await gest.post(`/api/demandes/${d.id}/messages`, { texte: 'Pour info', mentions: [resp.id] });
  assert.equal(publique.body.code, 'MENTION_INTERNE');
  const horsService = await gest.post(`/api/demandes/${d.id}/messages`, { texte: 'Pour info', interne: true, mentions: [agent.id] });
  assert.equal(horsService.body.code, 'MENTION_INVALIDE');
  assert.equal((await gest.post(`/api/demandes/${d.id}/messages`, { texte: 'x', interne: true, mentions: [gestB.id] })).body.code, 'MENTION_INVALIDE');
  assert.equal((await gest.get(`/api/demandes/${d.id}/messages`)).body.data.length, 0, 'rien n’a été écrit');
});

test('mentions : « à voir » jusqu’à la lecture du fil ; compteur et filtre ; noms pour le service ; journal sans nom', async () => {
  const d = await deposer('Porte du local vélo qui ne ferme plus.');
  const resp = await person(srv.base, admin, `resp.vue.${d.id}@exemple.test`, ea.id, [[ea.id, 'responsable']]);
  const avant = (await resp.get('/api/demandes/tableau-bord')).body.data.mentions;
  const m = await gest.post(`/api/demandes/${d.id}/messages`, { texte: 'Peux-tu commander la gâche ?', interne: true, mentions: [resp.id] });
  assert.equal(m.status, 201, JSON.stringify(m.body));
  assert.deepEqual(m.body.data.mentions.map((x) => x.user_id), [resp.id]);
  assert.equal((await resp.get('/api/demandes/tableau-bord')).body.data.mentions, avant + 1);
  const filtre = (await resp.get('/api/demandes?perimetre=entite&mentions=a_voir&limit=200')).body;
  assert.equal(filtre.pagination.total, avant + 1, 'même total que le compteur');
  assert.ok(filtre.data.some((x) => x.id === d.id));
  assert.equal((await gest.get('/api/demandes?perimetre=entite&mentions=a_voir')).body.data.some((x) => x.id === d.id), false, 'l’auteur n’est pas mentionné');
  assert.equal((await resp.get(`/api/demandes/${d.id}/messages`)).body.data[0].mentions[0].nom, 'Nom');
  await resp.post(`/api/demandes/${d.id}/messages/lu`, {});
  assert.equal((await resp.get('/api/demandes/tableau-bord')).body.data.mentions, avant);
  const ligne = getDb().prepare("SELECT details_json FROM audit_log WHERE action = 'demande.message' AND entity_id = ? ORDER BY id DESC").get(d.id);
  assert.equal(JSON.parse(ligne.details_json).mentions, 1);
  assert.doesNotMatch(ligne.details_json, /Nom|resp\./);
  const mcp = await donnees(gest, 'list_mentionnables_demande', { id: d.id });
  assert.ok(mcp.some((p) => p.user_id === resp.id));
  const viaMcp = await donnees(gest, 'add_message_demande', { id: d.id, texte: 'Relance', interne: true, mentions: [resp.id] });
  assert.equal(viaMcp.mentions.length, 1);
});

// 0.15.0, point 5 (SUI-09) : abonnement et « Ne plus suivre ».
test('abonnement : le service suit une demande vue, sans remarque ; elle arrive dans ses demandes ; source lue par le service', async () => {
  const d = await deposer('Volet roulant coincé salle 7.');
  assert.equal((await agent.get(`/api/demandes/${d.id}`)).body.data.suivable, 0, 'pas sa propre demande');
  const g = (await gest.get(`/api/demandes/${d.id}`)).body.data;
  assert.equal(g.suivable, 1);
  assert.equal(g.suivie, 0);
  assert.equal((await gest.post(`/api/demandes/${d.id}/suivre`, { source: 'abonnement', remarque: 'x' })).body.code, 'REMARQUE_ABONNEMENT');
  const r = await gest.post(`/api/demandes/${d.id}/suivre`, { source: 'abonnement' });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.suivie, 1);
  assert.equal(r.body.data.suivi_source, 'abonnement');
  assert.equal(r.body.data.suivable, 0);
  assert.ok((await gest.get('/api/demandes?limit=200')).body.data.some((x) => x.id === d.id), 'dans « Mes demandes »');
  await suiveur.post(`/api/demandes/${d.id}/suivre`, { remarque: 'Chez moi aussi.' });
  const liste = (await gest.get(`/api/demandes/${d.id}`)).body.data.suiveurs;
  assert.deepEqual(liste.map((x) => x.source).sort(), ['abonnement', 'moi_aussi']);
  const ligne = getDb().prepare("SELECT details_json FROM audit_log WHERE action = 'demande.suivre' AND entity_id = ? ORDER BY id").get(d.id);
  assert.equal(JSON.parse(ligne.details_json).source, 'abonnement');
});

test('ne plus suivre : suivi retiré, remarque effacée, plus de lecture pour un agent ; le service garde la fiche ; journal sans texte', async () => {
  const d = await deposer('Robinet qui goutte cuisine 2.');
  await suiveur.post(`/api/demandes/${d.id}/suivre`, { remarque: 'Ça goutte aussi chez nous.' });
  const r = await suiveur.del(`/api/demandes/${d.id}/suivre`, {});
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.data, { id: d.id, numero: d.numero, suivie: 0 });
  assert.equal((await suiveur.get(`/api/demandes/${d.id}`)).status, 403, 'il ne lit plus la demande d’un autre');
  assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM demande_suiveurs WHERE demande_id = ?').get(d.id).n, 0);
  const ligne = getDb().prepare("SELECT details_json FROM audit_log WHERE action = 'demande.ne_plus_suivre' AND entity_id = ?").get(d.id);
  assert.deepEqual(JSON.parse(ligne.details_json), { numero: d.numero, source: 'moi_aussi', remarque: 1 });
  assert.doesNotMatch(ligne.details_json, /goutte/);
  assert.equal((await suiveur.del(`/api/demandes/${d.id}/suivre`, {})).status, 403, 'sans suivi ni droit : rien à faire');
  await gest.post(`/api/demandes/${d.id}/suivre`, { source: 'abonnement' });
  await agent.del(`/api/demandes/${d.id}`, { motif: 'Réparé par le concierge.' });
  assert.equal((await gest.get(`/api/demandes/${d.id}`)).body.data.suivable, 0, 'fermée : plus d’abonnement');
  const g = await gest.del(`/api/demandes/${d.id}/suivre`, {});
  assert.equal(g.body.data.suivie, 0, 'même fermée, on arrête de suivre ; le service garde la fiche');
  assert.equal(g.body.data.numero, d.numero);
  assert.equal((await gestB.del(`/api/demandes/${d.id}/suivre`, {})).status, 403);
});

test('ne plus suivre par le MCP : deux appels, effet décrit avant ; rien sans suivi', async () => {
  const d = await deposer('Ampoule grillée escalier B.');
  await suiveur.post(`/api/demandes/${d.id}/suivre`, { remarque: 'Idem au 3e.' });
  const p = await tool(suiveur, 'prepare_ne_plus_suivre_demande', { id: d.id });
  assert.equal(p.data.source, 'moi_aussi');
  assert.equal(p.data.remarque_effacee, 1, 'la personne est prévenue que sa remarque partira');
  assert.ok(p.data.confirmation_token);
  assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM demande_suiveurs WHERE demande_id = ?').get(d.id).n, 1, 'rien avant la confirmation');
  const c = await tool(suiveur, 'confirm_ne_plus_suivre_demande', { confirmation_token: p.data.confirmation_token });
  assert.equal(c.data.suivie, 0);
  assert.equal((await tool(suiveur, 'prepare_ne_plus_suivre_demande', { id: d.id })).code, 'PAS_SUIVIE');
});

test('migration 013 sur une base 0.14.0 : table des messages, colonnes des pièces, pièces existantes restées à la demande', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { spawnSync } = require('child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gmao-m013-'));
  const env = { PATH: process.env.PATH, NODE_ENV: 'test', APP_TEST_MODE: '1', DB_PATH: path.join(dir, 'm.db') };
  const run = (code) => spawnSync(process.execPath, ['-e', code], { cwd: path.join(__dirname, '..'), env, encoding: 'utf8' });
  const prep = run(`
    const initSqlJs = require('sql.js'); const fs = require('fs');
    const { MIGRATIONS } = require('./src/database');
    initSqlJs().then((SQL) => {
      const db = new SQL.Database();
      db.run("CREATE TABLE schema_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, applied_at TEXT DEFAULT (datetime('now')))");
      for (const [name, sql] of MIGRATIONS.slice(0, 12)) { for (const s of sql.split(';').map((x) => x.trim()).filter(Boolean)) db.run(s); db.run('INSERT INTO schema_migrations (name) VALUES (?)', [name]); }
      db.run("INSERT INTO entites (code, nom_fr, nom_nl) VALUES ('AC', 'AC', 'GB')");
      db.run("INSERT INTO users (email, first_name, last_name) VALUES ('a@exemple.test', 'A', 'B')");
      db.run("INSERT INTO lieux (entite_id, nature, code, nom_fr, nom_nl) VALUES (1, 'site', 'AC-S', 'Site', 'Site')");
      db.run("INSERT INTO categories (entite_id, code, libelle_fr, libelle_nl) VALUES (1, 'eclairage', 'Éclairage', 'Verlichting')");
      db.run("INSERT INTO demandes (entite_id, numero, annee, sequence, lieu_id, categorie_id, description, demandeur_id, created_at) VALUES (1, 'AC-DI-2026-00001', 2026, 1, 1, 1, 'Lampe en panne au couloir', 1, '2026-11-01 08:00:00')");
      db.run("INSERT INTO pieces_jointes (entite_id, demande_id, auteur_id, fichier, nom, type, octets) VALUES (1, 1, 1, '0123456789abcdef0123456789abcdef.jpg', 'photo.jpg', 'image/jpeg', 10)");
      fs.writeFileSync(process.env.DB_PATH, Buffer.from(db.export()));
    });`);
  assert.equal(prep.status, 0, prep.stderr);
  const up = run(`require('./src/database').initDb().then((db) => {
    console.log(JSON.stringify({
      migration: db.prepare('SELECT name FROM schema_migrations ORDER BY id DESC').get().name,
      piece: db.prepare('SELECT demande_id, message_id, attente_message FROM pieces_jointes').get(),
      messages: db.prepare('SELECT COUNT(*) AS n FROM demande_messages').get().n,
    }));
  })`);
  assert.equal(up.status, 0, up.stderr);
  assert.match(up.stdout, /\[DB\] Migration 013_messages appliquée/);
  const out = JSON.parse(up.stdout.trim().split('\n').pop());
  assert.equal(out.migration, '014_validation', 'les migrations suivantes passent aussi (0.16.0)');
  assert.deepEqual(out.piece, { demande_id: 1, message_id: null, attente_message: 0 });
  assert.equal(out.messages, 0);
  const again = run("require('./src/database').initDb().then((db) => console.log(db.prepare('SELECT COUNT(*) AS n FROM schema_migrations').get().n))");
  assert.equal(again.status, 0, again.stderr);
  assert.doesNotMatch(again.stdout, /Migration 013_messages appliquée/, 'appliquée une seule fois');
});

// 0.16.0, point 0 (R2 de la recette de la 0.15.0) : un message garde la langue de son texte, pas celle de l'écran.
test('R2 : langue donnée gardée même si l’écran de l’auteur est dans l’autre langue ; sans langue, celle de l’auteur', async () => {
  const d = await deposer('Le store de la salle 3 est bloqué en bas.');
  assert.equal((await gest.put('/api/auth/preferences', { preferred_lang: 'nl' })).status, 200);
  try {
    const fr = await gest.post(`/api/demandes/${d.id}/messages`, { texte: 'Bonjour, nous passons jeudi.', langue: 'fr' });
    assert.equal(fr.status, 201);
    assert.equal(fr.body.data.langue, 'fr', 'modèle français inséré par un gestionnaire en NL : reste fr');
    const sans = await gest.post(`/api/demandes/${d.id}/messages`, { texte: 'Wij komen donderdag.' });
    assert.equal(sans.body.data.langue, 'nl', 'sans langue : celle de l’auteur');
    const lus = (await agent.get(`/api/demandes/${d.id}/messages`)).body.data;
    assert.deepEqual(lus.map((m) => m.langue), ['fr', 'nl']);
  } finally {
    await gest.put('/api/auth/preferences', { preferred_lang: 'fr' });
  }
});
