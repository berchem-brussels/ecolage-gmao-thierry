/**
 * Avis des personnes concernées par une demande (0.17.0, étape 13, point 4 ; NOT-01, NOT-02, NOT-04, NOT-06, DEM-04,
 * DEM-07, DEM-12, DEM-15, LNG-05 ; DV-135) : cloche et courriel (mode test : courriels retenus, relus ici) au dépôt,
 * à la décision du chef de service et aux changements d'état ; jamais pour sa propre action ; langue du destinataire ;
 * contenu minimal ; adresse réservée jamais envoyée en envoi réel.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { getDb } = require('../src/database');

let srv;
let admin;
let ea;
let gest;
let agent;
let agentNl;
let collegue;
let suiveur;
let chef;
let suppleant;
let lieu;
let eclairage;
let demenagement;

const jour = (decalage) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date(Date.now() + decalage * 86400000));
const courriels = (userId, demandeId) => getDb().prepare('SELECT * FROM courriels WHERE user_id = ? AND objet_id = ? ORDER BY id').all(userId, demandeId);
const notifs = (userId, demandeId) => getDb().prepare('SELECT * FROM notifications WHERE user_id = ? AND objet_id = ? ORDER BY id').all(userId, demandeId);
const passer = (c, id, body) => c.post(`/api/demandes/${id}/transitions`, body);
const DESCRIPTION = 'Le néon du couloir clignote près de la salle 12.';

async function deposer(c, extra = {}, categorie = eclairage) {
  const r = await c.post('/api/demandes', { lieu_id: lieu, categorie_id: categorie.id, description: DESCRIPTION, ...extra });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.data;
}

before(async () => {
  srv = await startServer();
  ({ admin, ea } = await setup(srv.base));
  gest = await person(srv.base, admin, 'gest.avis@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  agent = await person(srv.base, admin, 'agent.avis@exemple.test', ea.id);
  agentNl = await person(srv.base, admin, 'agent.nl.avis@exemple.test', ea.id);
  collegue = await person(srv.base, admin, 'collegue.avis@exemple.test', ea.id);
  suiveur = await person(srv.base, admin, 'suiveur.avis@exemple.test', ea.id);
  chef = await person(srv.base, admin, 'chef.avis@exemple.test', ea.id, [[ea.id, 'valideur']]);
  suppleant = await person(srv.base, admin, 'suppleant.avis@exemple.test', ea.id, [[ea.id, 'valideur']]);
  assert.equal((await agentNl.put('/api/auth/preferences', { preferred_lang: 'nl' })).status, 200);
  lieu = (await gest.post('/api/lieux', { nature: 'site', code: 'AV', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis' })).body.data.id;
  eclairage = (await agent.get('/api/categories?niveau=nature&q=eclairage')).body.data[0];
  demenagement = (await agent.get('/api/categories?niveau=nature&q=demenagement')).body.data[0];
  const service = (await admin.post('/api/services', { entite_id: ea.id, code: 'AVS', nom_fr: 'Secrétariat', nom_nl: 'Secretariaat', valideur_id: chef.id,
    suppleant_id: suppleant.id, suppleant_du: jour(0), suppleant_au: jour(2) })).body.data;
  for (const c of [agent, agentNl]) assert.equal((await admin.put(`/api/users/${c.id}`, { service_id: service.id })).status, 200);
  assert.equal((await admin.put('/api/settings/courriel', { public_url: 'https://gmao.exemple.test' })).status, 200);
});
after(() => srv.stop());

test('dépôt à l’écran : accusé du demandeur né lu dans la cloche, mais envoyé par courriel (DEM-12) ; le bénéficiaire reçoit cloche et courriel', async () => {
  const d = await deposer(agent, { beneficiaire_id: collegue.id });
  assert.equal(notifs(agent.id, d.id)[0].lue_le !== null, true);
  const a = courriels(agent.id, d.id);
  assert.equal(a.length, 1, 'accusé de réception par courriel, même pour sa propre demande');
  assert.equal(a[0].sujet, `Demande ${d.numero} reçue`);
  assert.match(a[0].corps, /Délai indicatif : /);
  const n = notifs(collegue.id, d.id);
  assert.equal(n[0].variante, 'beneficiaire');
  assert.equal(n[0].lue_le, null);
  const c = courriels(collegue.id, d.id);
  assert.equal(c.length, 1);
  assert.equal(c[0].etat, 'test', 'mode test : retenu');
  assert.equal(c[0].sujet, `Demande ${d.numero} faite pour vous`);
  assert.match(c[0].corps, /État : Reçue par le service technique/);
  assert.match(c[0].corps, new RegExp(`Suivre la demande : https://gmao\\.exemple\\.test/demandes\\?demande=${d.id}`));
  assert.ok(!c[0].corps.includes('néon'), 'jamais la description (NOT-06)');
});

test('demande encodée par le service : accusé en néerlandais à l’agent (LNG-05), numéro, lieu, délai indicatif, lien ; rien pour qui encode', async () => {
  const d = await deposer(gest, { demandeur_id: agentNl.id, canal: 'telephone' });
  const c = courriels(agentNl.id, d.id);
  assert.equal(c.length, 1);
  assert.equal(c[0].langue, 'nl');
  assert.equal(c[0].sujet, `Aanvraag ${d.numero} ontvangen`);
  assert.match(c[0].corps, /Entiteit: Fictief bestuur/);
  assert.match(c[0].corps, /Plaats: Gemeentehuis/);
  assert.match(c[0].corps, /Indicatieve termijn: (uiterlijk op \d{2}\/\d{2}\/\d{4}|datum af te spreken met de technische dienst)/);
  assert.match(c[0].corps, /Automatische e-mail van/);
  assert.equal(notifs(agentNl.id, d.id)[0].lue_le, null);
  assert.equal(courriels(gest.id, d.id).length + notifs(gest.id, d.id).length, 0);
});

test('demande nouvelle (0.21.3, DV-180) : gestionnaire et responsable avertis à l’arrivée au service ; danger en priorité absolue ; validée par le chef ; encodée : les collègues seulement ; jamais l’agent ni le chef', async () => {
  const resp = await person(srv.base, admin, 'resp.avis@exemple.test', ea.id, [[ea.id, 'responsable']]);
  const nouvelles = (userId, id) => notifs(userId, id).filter((x) => x.evenement === 'demande.nouvelle');
  const mails = (userId, id) => courriels(userId, id).filter((x) => x.evenement === 'demande.nouvelle');
  // Dépôt direct.
  const d = await deposer(agent);
  for (const v of [gest, resp]) {
    const n = nouvelles(v.id, d.id);
    assert.equal(n.length, 1);
    assert.equal(n[0].variante, 'defaut');
    assert.equal(n[0].lien, `/demandes-entite?demande=${d.id}`);
    assert.equal(n[0].lue_le, null);
    const c = mails(v.id, d.id);
    assert.equal(c.length, 1);
    assert.equal(c[0].sujet, `Nouvelle demande ${d.numero} à qualifier`);
    assert.match(c[0].corps, /Lieu : Maison communale/);
    assert.match(c[0].corps, /https:\/\/gmao\.exemple\.test\/demandes-entite\?demande=/);
    assert.ok(!c[0].corps.includes('néon'), 'jamais la description (NOT-06)');
  }
  for (const v of [agent, chef, collegue]) assert.equal(nouvelles(v.id, d.id).length, 0);
  // Danger : variante « danger », priorité absolue.
  const g = await deposer(agent, { danger: 1 });
  assert.equal(nouvelles(gest.id, g.id)[0].variante, 'danger');
  assert.equal(mails(resp.id, g.id)[0].sujet, `DANGER signalé : demande ${g.numero}, priorité absolue`);
  assert.match((await gest.get('/api/notifications?limit=50')).body.data.find((x) => x.objet_id === g.id && x.evenement === 'demande.nouvelle').texte_fr, /Danger signalé : demande .*, priorité absolue/);
  // Danger d'une catégorie à valider : part sans le chef, le service est averti aussi.
  const gv = await deposer(agent, { danger: 1 }, demenagement);
  assert.equal(nouvelles(gest.id, gv.id)[0].variante, 'danger');
  // En validation : rien au service ; validée par le chef : avis au service.
  const v = await deposer(agent, {}, demenagement);
  assert.equal(v.etat, 'en_validation');
  assert.equal(nouvelles(gest.id, v.id).length, 0, 'pas avant l’accord du chef');
  assert.equal((await passer(chef, v.id, { etat: 'a_qualifier' })).status, 200);
  assert.equal(nouvelles(gest.id, v.id).length, 1);
  assert.equal(nouvelles(resp.id, v.id).length, 1);
  assert.equal(nouvelles(chef.id, v.id).length, 0);
  // Encodée par un gestionnaire : le responsable est averti, pas qui encode.
  const e = await deposer(gest, { demandeur_id: agentNl.id, canal: 'telephone' });
  assert.equal(nouvelles(resp.id, e.id).length, 1);
  assert.equal(nouvelles(gest.id, e.id).length + mails(gest.id, e.id).length, 0, 'rien pour qui encode');
});

test('demande à valider : « attend l’accord » au demandeur (cloche) ; chef et suppléant en période avertis, lien vers « Demandes à valider »', async () => {
  const d = await deposer(agent, {}, demenagement);
  assert.equal(d.etat, 'en_validation');
  assert.equal(notifs(agent.id, d.id)[0].variante, 'validation');
  assert.equal(courriels(agent.id, d.id)[0].sujet, `Demande ${d.numero} enregistrée`);
  assert.match(courriels(agent.id, d.id)[0].corps, /attend l'accord de votre chef de service/);
  for (const v of [chef, suppleant]) {
    const n = notifs(v.id, d.id);
    assert.equal(n.length, 1);
    assert.equal(n[0].evenement, 'demande.validation_demandee');
    assert.equal(n[0].lien, `/a-valider?demande=${d.id}`);
    const c = courriels(v.id, d.id);
    assert.equal(c[0].sujet, `Demande ${d.numero} à valider`);
    assert.match(c[0].corps, /https:\/\/gmao\.exemple\.test\/a-valider\?demande=/);
  }
  assert.equal((await chef.get('/api/notifications/compteur')).body.data.non_lues >= 1, true);
});

test('danger d’une demande à valider (DV-135) : le chef et le suppléant apprennent qu’elle est partie sans eux', async () => {
  const d = await deposer(agent, { danger: 1 }, demenagement);
  assert.equal(d.etat, 'a_qualifier');
  for (const v of [chef, suppleant]) {
    const n = notifs(v.id, d.id);
    assert.deepEqual(n.map((x) => x.evenement), ['demande.danger_sans_validation']);
    assert.equal(courriels(v.id, d.id)[0].sujet, `Danger signalé : demande ${d.numero}`);
    assert.equal((await v.get(`/api/demandes/${d.id}`)).status, 200, 'le lien ouvre une demande que le chef lit');
  }
});

test('décision du chef : validée ou refusée au demandeur, sans le motif ; rien pour le chef qui décide', async () => {
  const d1 = await deposer(agent, {}, demenagement);
  assert.equal((await passer(chef, d1.id, { etat: 'a_qualifier' })).status, 200);
  const n = notifs(agent.id, d1.id).at(-1);
  assert.equal(n.evenement, 'demande.validee');
  assert.equal(n.lue_le, null);
  const c = courriels(agent.id, d1.id);
  assert.equal(c.at(-1).sujet, `Demande ${d1.numero} validée`);
  assert.match(c.at(-1).corps, /Délai indicatif : (au plus tard le \d{2}\/\d{2}\/\d{4}|date à convenir)/);
  assert.equal(notifs(chef.id, d1.id).filter((x) => x.evenement !== 'demande.validation_demandee').length, 0);
  for (const v of [chef, suppleant]) assert.ok(notifs(v.id, d1.id)[0].lue_le, '« à valider » lue après la décision, chez le chef et le suppléant');
  const d2 = await deposer(agent, {}, demenagement);
  assert.equal((await passer(suppleant, d2.id, { etat: 'refusee_validation', commentaire: 'Budget épuisé cette année.' })).status, 200);
  const r = courriels(agent.id, d2.id).at(-1);
  assert.equal(r.sujet, `Demande ${d2.numero} refusée`);
  assert.ok(!r.corps.includes('Budget'), 'le motif se lit après connexion');
});

test('changements d’état : prise en charge, terminée, annulée au demandeur et aux personnes qui suivent ; « En cours » sans avis', async () => {
  const d = await deposer(agent);
  assert.equal((await suiveur.post(`/api/demandes/${d.id}/suivre`, {})).status, 200);
  const q = await gest.post(`/api/demandes/${d.id}/qualifier`, { categorie_id: eclairage.id, lieu_id: lieu, priorite: eclairage.priorite_effective || 'P3', motif_priorite: 'Essai' });
  assert.equal(q.status, 200, JSON.stringify(q.body));
  for (const c of [agent, suiveur]) {
    const n = notifs(c.id, d.id).at(-1);
    assert.equal(n.evenement, 'demande.etat');
    assert.equal(n.variante, 'qualifiee');
    const cl = (await c.get('/api/notifications')).body.data.find((x) => x.id === n.id);
    assert.equal(cl.texte_fr, `La demande ${d.numero} est prise en charge par le service technique.`);
    assert.equal(courriels(c.id, d.id).at(-1).sujet, `Demande ${d.numero} : Prise en charge`);
  }
  const avant = getDb().prepare('SELECT COUNT(*) AS n FROM courriels').get().n;
  assert.equal((await passer(gest, d.id, { etat: 'en_cours' })).status, 200);
  assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM courriels').get().n, avant, '« En cours » : pas d’avis');
  assert.equal((await passer(gest, d.id, { etat: 'terminee' })).status, 200);
  assert.equal(notifs(agent.id, d.id).at(-1).variante, 'terminee');
  assert.equal(notifs(gest.id, d.id).filter((x) => x.evenement !== 'demande.nouvelle').length, 0, 'le service n’est pas averti de ses propres passages (seulement de l’arrivée, 0.21.3)');
  const d3 = await deposer(agent);
  await suiveur.post(`/api/demandes/${d3.id}/suivre`, {});
  assert.equal((await agent.del(`/api/demandes/${d3.id}`, { motif: 'Réglé seul.' })).status, 200);
  assert.deepEqual(courriels(agent.id, d3.id).map((c) => c.evenement), ['demande.recue'], 'le demandeur qui annule n’est pas averti de l’annulation');
  assert.equal(notifs(suiveur.id, d3.id).at(-1).variante, 'annulee');
  assert.match(courriels(suiveur.id, d3.id).at(-1).corps, /La demande .+ a changé d'état : Annulée\./);
});

test('envoi réel : une adresse d’un domaine réservé (.invalid, comptes de démonstration) n’est pas envoyée ; la cloche reste', async () => {
  const demo = await person(srv.base, admin, 'agent.demo@demo.invalid', ea.id);
  assert.equal((await admin.put('/api/settings/courriel', { mode: 'smtp', host: '127.0.0.1', port: 9, securite: 'aucune', from: 'gmao@exemple.test' })).status, 200);
  try {
    const d = await deposer(gest, { demandeur_id: demo.id, canal: 'telephone' });
    assert.equal(courriels(demo.id, d.id).length, 0);
    assert.equal(notifs(demo.id, d.id).length, 1);
    const d2 = await deposer(gest, { demandeur_id: agent.id, canal: 'telephone' });
    assert.equal(courriels(agent.id, d2.id)[0].mode, 'smtp', 'une adresse ordinaire part en file');
  } finally {
    await admin.put('/api/settings/courriel', { mode: 'test' });
    getDb().prepare("DELETE FROM courriels WHERE mode = 'smtp'").run();
  }
});

test('aucun courriel ne porte une description, un commentaire, un motif ni un nom (NOT-06)', () => {
  for (const c of getDb().prepare("SELECT corps, sujet FROM courriels WHERE evenement LIKE 'demande.%'").all()) {
    for (const interdit of ['néon', 'Budget', 'Réglé seul', 'Prénom', 'Nom ']) assert.ok(!`${c.sujet} ${c.corps}`.includes(interdit), `${interdit} dans ${c.sujet}`);
  }
});

// Point 5 : fil, mentions, tickets.
test('fil : message du demandeur → la personne qui a qualifié (lien du service) ; réponse du service → demandeur et bénéficiaire, pas qui suit', async () => {
  const d = await deposer(agent, { beneficiaire_id: collegue.id });
  await suiveur.post(`/api/demandes/${d.id}/suivre`, {});
  const q = await gest.post(`/api/demandes/${d.id}/qualifier`, { categorie_id: eclairage.id, lieu_id: lieu, priorite: eclairage.priorite_effective || 'P3', motif_priorite: 'Essai' });
  assert.equal(q.status, 200);
  assert.equal((await agent.post(`/api/demandes/${d.id}/messages`, { texte: 'Il clignote aussi le matin, près de la fenêtre.' })).status, 201);
  const n = notifs(gest.id, d.id).filter((x) => x.evenement === 'demande.message');
  assert.equal(n.length, 1);
  assert.equal(n[0].lien, `/demandes-entite?demande=${d.id}`);
  const c = courriels(gest.id, d.id).at(-1);
  assert.equal(c.sujet, `Nouveau message : demande ${d.numero}`);
  assert.ok(!c.corps.includes('fenêtre'), 'le texte du message se lit après connexion');
  assert.equal((await gest.post(`/api/demandes/${d.id}/messages`, { texte: 'Nous passons jeudi.' })).status, 201);
  for (const x of [agent, collegue]) assert.equal(notifs(x.id, d.id).filter((y) => y.evenement === 'demande.message').length, 1, 'demandeur et bénéficiaire');
  assert.equal(notifs(suiveur.id, d.id).filter((y) => y.evenement === 'demande.message').length, 0, 'qui suit ne lit pas le fil');
  assert.equal(notifs(gest.id, d.id).filter((x) => x.evenement === 'demande.message').length, 1, 'pas d’avis de son propre message');
  assert.equal((await agent.post(`/api/demandes/${d.id}/messages/lu`, {})).status, 200);
  assert.ok(notifs(agent.id, d.id).filter((y) => y.evenement === 'demande.message').every((y) => y.lue_le), 'fil lu : avis lu');
});

test('fil : sans personne qui a qualifié ni écrit, tout le service technique de l’entité est averti', async () => {
  const gest2 = await person(srv.base, admin, 'gest2.avis@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  const d = await deposer(agent);
  await agent.post(`/api/demandes/${d.id}/messages`, { texte: 'Pouvez-vous passer avant midi ?' });
  for (const g of [gest, gest2]) assert.equal(notifs(g.id, d.id).filter((x) => x.evenement === 'demande.message').length, 1);
  assert.equal(notifs(chef.id, d.id).length, 0, 'le valideur ne fait pas partie du service technique');
});

test('note interne : seuls les collègues mentionnés sont avertis ; jamais le demandeur', async () => {
  const gest3 = await person(srv.base, admin, 'gest3.avis@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  const d = await deposer(agent);
  const r = await gest.post(`/api/demandes/${d.id}/messages`, { texte: 'Prévoir l’échelle.', interne: true, mentions: [gest3.id] });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const n = notifs(gest3.id, d.id);
  assert.deepEqual(n.map((x) => x.evenement), ['demande.nouvelle', 'demande.mention'], 'l’arrivée (0.21.3), puis la mention');
  assert.equal(courriels(gest3.id, d.id).at(-1).sujet, `Note interne : demande ${d.numero}`);
  assert.equal(notifs(agent.id, d.id).filter((x) => x.evenement !== 'demande.recue').length, 0);
  assert.equal((await gest3.get('/api/notifications')).body.data.find((x) => x.objet_id === d.id && x.evenement === 'demande.mention').texte_fr, `Un collègue vous mentionne dans une note interne de la demande ${d.numero}.`);
});

test('ticket : accusé à l’auteur (cloche lue, courriel), avis aux personnes qui traitent ; réponse publique à l’auteur, note interne sans avis', async () => {
  const t = (await agent.post('/api/tickets', { type: 'question', title: 'Comment suivre une demande ?' })).body.data;
  assert.ok(t.reference);
  const nA = getDb().prepare("SELECT * FROM notifications WHERE objet = 'ticket' AND objet_id = ? AND user_id = ?").get(t.id, agent.id);
  assert.ok(nA.lue_le, 'accusé lu dans la cloche');
  assert.equal(nA.lien, `/tickets?id=${t.id}`);
  const cA = getDb().prepare("SELECT * FROM courriels WHERE objet = 'ticket' AND objet_id = ? AND user_id = ?").all(t.id, agent.id);
  assert.equal(cA[0].sujet, `Signalement ${t.reference} enregistré`);
  // File métier : rôles livrés « responsable, gestionnaire » de l'entité du ticket.
  const cG = getDb().prepare("SELECT * FROM courriels WHERE objet = 'ticket' AND objet_id = ? AND user_id = ?").get(t.id, gest.id);
  assert.equal(cG.sujet, `Nouveau signalement ${t.reference} à traiter`);
  const nG = getDb().prepare("SELECT * FROM notifications WHERE objet = 'ticket' AND objet_id = ? AND user_id = ?").get(t.id, gest.id);
  assert.equal(nG.variante, 'traiter');
  assert.equal(nG.lue_le, null);
  assert.equal(getDb().prepare("SELECT COUNT(*) AS n FROM courriels WHERE objet = 'ticket' AND objet_id = ? AND user_id = ?").get(t.id, chef.id).n, 0, 'le valideur ne traite pas la file');
  assert.equal((await gest.post(`/api/tickets/${t.id}/messages`, { body: 'Note interne.', is_internal: true })).status, 201);
  assert.equal(getDb().prepare("SELECT COUNT(*) AS n FROM courriels WHERE objet = 'ticket' AND objet_id = ? AND evenement = 'ticket.reponse'").get(t.id).n, 0);
  assert.equal((await gest.post(`/api/tickets/${t.id}/messages`, { body: 'Dans « Mes demandes ».' })).status, 201);
  const rep = getDb().prepare("SELECT * FROM courriels WHERE objet = 'ticket' AND objet_id = ? AND evenement = 'ticket.reponse'").all(t.id);
  assert.equal(rep.length, 1);
  assert.equal(rep[0].user_id, agent.id);
  assert.ok(!rep[0].corps.includes('Mes demandes'), 'le texte de la réponse se lit après connexion');
  assert.equal((await agent.post(`/api/tickets/${t.id}/messages`, { body: 'Merci.' })).status, 201);
  assert.equal(getDb().prepare("SELECT COUNT(*) AS n FROM courriels WHERE objet = 'ticket' AND objet_id = ? AND evenement = 'ticket.reponse'").get(t.id).n, 1, 'l’auteur qui écrit n’est pas averti');
});

// Point 6 : échéance proche et retard.
test('échéance proche d’une demande à qualifier : tout le service technique, une seule fois ; jamais le demandeur', async () => {
  const { verifierEcheances } = require('../src/services/avis');
  const d = await deposer(agent);
  getDb().prepare("UPDATE demandes SET prise_en_charge_le = datetime('now', '+1 hour') WHERE id = ?").run(d.id);
  verifierEcheances();
  const n = notifs(gest.id, d.id).filter((x) => x.evenement === 'demande.echeance_proche');
  assert.equal(n.length, 1);
  assert.equal(n[0].lien, `/demandes-entite?demande=${d.id}`);
  const c = courriels(gest.id, d.id).filter((x) => x.evenement === 'demande.echeance_proche');
  assert.equal(c[0].sujet, `Échéance proche : demande ${d.numero}`);
  assert.match(c[0].corps, /approche : le \d{2}\/\d{2}\/\d{4} à \d{2}:\d{2}\./);
  assert.equal(notifs(agent.id, d.id).filter((x) => x.evenement.startsWith('demande.echeance') || x.evenement === 'demande.retard').length, 0);
  verifierEcheances();
  assert.equal(notifs(gest.id, d.id).filter((x) => x.evenement === 'demande.echeance_proche').length, 1, 'pas deux fois');
});

test('retard d’une demande qualifiée : la personne qui l’a qualifiée seulement ; une échéance qui change refait une alerte', async () => {
  const { verifierEcheances } = require('../src/services/avis');
  const gestB = await person(srv.base, admin, 'gestb.avis@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  const d = await deposer(agent);
  const q = await gestB.post(`/api/demandes/${d.id}/qualifier`, { categorie_id: eclairage.id, lieu_id: lieu, priorite: eclairage.priorite_effective || 'P3', motif_priorite: 'Essai' });
  assert.equal(q.status, 200);
  getDb().prepare("UPDATE demandes SET echeance_le = datetime('now', '-2 hours') WHERE id = ?").run(d.id);
  verifierEcheances();
  assert.equal(notifs(gestB.id, d.id).filter((x) => x.evenement === 'demande.retard').length, 1);
  assert.equal(notifs(gest.id, d.id).filter((x) => x.evenement === 'demande.retard').length, 0, 'les autres gestionnaires ne sont pas avertis');
  const c = courriels(gestB.id, d.id).filter((x) => x.evenement === 'demande.retard')[0];
  assert.equal(c.sujet, `En retard : demande ${d.numero}`);
  assert.match(c.corps, /Échéance dépassée : le \d{2}\/\d{2}\/\d{4} à \d{2}:\d{2}/);
  verifierEcheances();
  assert.equal(notifs(gestB.id, d.id).filter((x) => x.evenement === 'demande.retard').length, 1);
  getDb().prepare("UPDATE demandes SET echeance_le = datetime('now', '-1 hours') WHERE id = ?").run(d.id);
  verifierEcheances();
  assert.equal(notifs(gestB.id, d.id).filter((x) => x.evenement === 'demande.retard').length, 2, 'nouvelle échéance, nouvelle alerte');
  // La personne qui a qualifié perd son rôle : tout le service technique est averti.
  const role = getDb().prepare("SELECT id FROM user_roles WHERE user_id = ? AND role = 'gestionnaire'").get(gestB.id).id;
  assert.equal((await admin.del(`/api/roles-utilisateurs/${role}`, { motif: 'Mutation' })).status, 200);
  getDb().prepare("UPDATE demandes SET echeance_le = datetime('now', '-30 minutes') WHERE id = ?").run(d.id);
  verifierEcheances();
  assert.equal(notifs(gest.id, d.id).filter((x) => x.evenement === 'demande.retard').length, 1);
});

test('pas d’alerte pour une attente qui suspend le délai, une demande terminée ou fermée', async () => {
  const { verifierEcheances } = require('../src/services/avis');
  const ids = [];
  for (const etat of ['terminee', 'cloturee', 'annulee']) {
    const d = await deposer(agent);
    getDb().prepare("UPDATE demandes SET etat = ?, echeance_le = datetime('now', '-1 hour'), prise_en_charge_le = datetime('now', '-1 hour') WHERE id = ?").run(etat, d.id);
    ids.push(d.id);
  }
  const s = await deposer(agent);
  getDb().prepare("UPDATE demandes SET etat = 'en_attente', attente_suspend = 1, echeance_le = datetime('now', '-1 hour') WHERE id = ?").run(s.id);
  ids.push(s.id);
  verifierEcheances();
  for (const id of ids) assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM demande_alertes WHERE demande_id = ?').get(id).n, 0, `demande ${id}`);
});

test('passage en 0.17.0 : les retards déjà là sont notés comme signalés, sans avis ; un nouveau retard fait une alerte', async () => {
  const { verifierEcheances, rattraper } = require('../src/services/avis');
  const db = getDb();
  const vieux = await deposer(agent);
  db.prepare("UPDATE demandes SET prise_en_charge_le = datetime('now', '-20 days') WHERE id = ?").run(vieux.id);
  const avant = db.prepare('SELECT COUNT(*) AS n FROM notifications').get().n;
  assert.ok(db.transaction(() => rattraper(db))() >= 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM notifications').get().n, avant, 'aucun avis au rattrapage');
  verifierEcheances();
  assert.equal(notifs(gest.id, vieux.id).filter((x) => x.evenement === 'demande.retard').length, 0, 'retard ancien : pas d’alerte');
  const neuf = await deposer(agent);
  db.prepare("UPDATE demandes SET prise_en_charge_le = datetime('now', '-5 minutes') WHERE id = ?").run(neuf.id);
  verifierEcheances();
  assert.equal(notifs(gest.id, neuf.id).filter((x) => x.evenement === 'demande.retard').length, 1);
});
