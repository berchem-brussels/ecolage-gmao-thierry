/**
 * Tâches d'une demande (0.20.0, étape 16, point 1 ; CYC-03, GES-04, DV-160) : droits, cloison, corps de métier proposé,
 * passages d'une tâche, effet sur la demande par la table des passages, « Travaux terminés » refusé avec une tâche
 * ouverte, annulation des tâches quand la demande se ferme, demandeur sans tâches, journal sans texte, MCP.
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
let ouvrier;
let gestB;
let lieu;
let categorie;
const V = {};
const parse = (r) => JSON.parse(r.body.result.content[0].text);
const tool = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));
const valeur = async (c, liste, code) => (await c.get(`/api/listes-valeurs?liste=${liste}&limit=200`)).body.data.find((v) => v.code === code).id;

async function deposer(description = 'La lampe du couloir ne s’allume plus.') {
  const r = await agent.post('/api/demandes', { lieu_id: lieu, categorie_id: categorie.id, description });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.data;
}
async function qualifiee(corps = V.elec) {
  const d = await deposer();
  const r = await gest.post(`/api/demandes/${d.id}/qualifier`, { categorie_id: categorie.id, lieu_id: lieu, priorite: categorie.priorite_effective || 'P3', motif_priorite: 'Essai', corps_metier_id: corps });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.data;
}
const ajouter = (c, id, body) => c.post(`/api/demandes/${id}/taches`, body);
const passer = (c, id, body) => c.post(`/api/taches/${id}/etat`, body);
const etatDemande = (id) => getDb().prepare('SELECT etat FROM demandes WHERE id = ?').get(id).etat;

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  gest = await person(srv.base, admin, 'gest.ta@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  resp = await person(srv.base, admin, 'resp.ta@exemple.test', ea.id, [[ea.id, 'responsable']]);
  agent = await person(srv.base, admin, 'agent.ta@exemple.test', ea.id);
  ouvrier = await person(srv.base, admin, 'ouvrier.ta@exemple.test', ea.id, [[ea.id, 'ouvrier']]);
  gestB = await person(srv.base, admin, 'gest.tab@exemple.test', eb.id, [[eb.id, 'gestionnaire']]);
  lieu = (await gest.post('/api/lieux', { nature: 'site', code: 'TA', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis' })).body.data.id;
  categorie = (await agent.get('/api/categories?niveau=nature&q=eclairage')).body.data[0];
  V.elec = await valeur(gest, 'corps_metier', 'electricite');
  V.plomb = await valeur(gest, 'corps_metier', 'plomberie');
  V.plombB = await valeur(gestB, 'corps_metier', 'plomberie');
});
after(() => srv.stop());

test('création : rang suivant, corps de métier de la demande proposé, « à faire » ; lecture par le service', async () => {
  const d = await qualifiee();
  const a = await ajouter(gest, d.id, { titre: 'Remplacer le luminaire', consignes: 'Couper le disjoncteur 4.', duree_estimee_min: 60 });
  assert.equal(a.status, 201, JSON.stringify(a.body));
  assert.equal(a.body.data.rang, 1);
  assert.equal(a.body.data.etat, 'a_faire');
  assert.equal(a.body.data.corps_metier_id, V.elec, 'corps de métier de la demande proposé');
  assert.equal(a.body.data.corps_metier_code, 'electricite');
  assert.deepEqual(a.body.data.passages, ['en_cours', 'terminee', 'annulee']);
  assert.ok(a.body.data.trace, 'trace de création');
  const b = await ajouter(resp, d.id, { titre: 'Reboucher le plafond', corps_metier_id: V.plomb });
  assert.equal(b.body.data.rang, 2);
  assert.equal(b.body.data.corps_metier_id, V.plomb, 'valeur explicite');
  const c = await ajouter(gest, d.id, { titre: 'Nettoyer', corps_metier_id: null });
  assert.equal(c.body.data.corps_metier_id, null, 'null explicite : aucun corps');
  const l = await gest.get(`/api/demandes/${d.id}/taches`);
  assert.deepEqual(l.body.data.map((t) => t.rang), [1, 2, 3]);
  const f = (await gest.get(`/api/demandes/${d.id}`)).body.data;
  assert.equal(f.taches.length, 3);
  assert.equal(f.taches_modifiables, 1);
  assert.equal((await gest.get(`/api/taches/${a.body.data.id}`)).body.data.titre, 'Remplacer le luminaire');
});

test('droits : demandeur et ouvrier ne lisent ni n’écrivent (403) ; le demandeur ne reçoit pas les tâches sur sa fiche', async () => {
  const d = await qualifiee();
  const t = (await ajouter(gest, d.id, { titre: 'Contrôler le tableau' })).body.data;
  for (const c of [agent, ouvrier]) {
    assert.equal((await c.get(`/api/demandes/${d.id}/taches`)).status, 403);
    assert.equal((await ajouter(c, d.id, { titre: 'Essai refusé' })).status, 403);
    assert.equal((await c.get(`/api/taches/${t.id}`)).status, 403);
    assert.equal((await c.put(`/api/taches/${t.id}`, { titre: 'Essai refusé' })).status, 403);
    assert.equal((await passer(c, t.id, { etat: 'en_cours' })).status, 403);
  }
  const vue = (await agent.get(`/api/demandes/${d.id}`)).body.data;
  assert.equal(vue.taches, undefined, 'pas de tâches pour le demandeur');
  assert.equal(vue.taches_modifiables, undefined);
});

test('cloison : une demande ou une tâche d’une autre entité rend 403 ; corps de métier d’une autre entité refusé', async () => {
  const d = await qualifiee();
  const t = (await ajouter(gest, d.id, { titre: 'Vérifier la prise' })).body.data;
  assert.equal((await gestB.get(`/api/demandes/${d.id}/taches`)).status, 403);
  assert.equal((await ajouter(gestB, d.id, { titre: 'Intrusion' })).status, 403);
  assert.equal((await gestB.get(`/api/taches/${t.id}`)).status, 403);
  assert.equal((await gestB.put(`/api/taches/${t.id}`, { titre: 'Intrusion' })).status, 403);
  assert.equal((await passer(gestB, t.id, { etat: 'terminee' })).status, 403);
  const r = await ajouter(gest, d.id, { titre: 'Corps étranger', corps_metier_id: V.plombB });
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal((await gest.get('/api/demandes/999999/taches')).status, 404);
  assert.equal((await gest.get('/api/taches/999999')).status, 404);
});

test('validation : titre de 3 à 200 caractères, durée de 15 à 10080 minutes, champ inconnu refusé', async () => {
  const d = await qualifiee();
  assert.equal((await ajouter(gest, d.id, { titre: 'ab' })).status, 400);
  assert.equal((await ajouter(gest, d.id, { titre: 'x'.repeat(201) })).status, 400);
  assert.equal((await ajouter(gest, d.id, { titre: 'Durée trop courte', duree_estimee_min: 10 })).status, 400);
  assert.equal((await ajouter(gest, d.id, { titre: 'Durée trop longue', duree_estimee_min: 10081 })).status, 400);
  assert.equal((await ajouter(gest, d.id, { titre: 'Champ inconnu', ouvrier_id: 3 })).status, 400);
});

test('modification : champs changés seulement, au journal sans les textes ; tâche fermée à rouvrir d’abord', async () => {
  const d = await qualifiee();
  const t = (await ajouter(gest, d.id, { titre: 'Changer la serrure', consignes: 'Code du local : 1234.' })).body.data;
  const r = await gest.put(`/api/taches/${t.id}`, { titre: 'Changer le cylindre', duree_estimee_min: 45, corps_metier_id: V.plomb });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.titre, 'Changer le cylindre');
  const j = getDb().prepare("SELECT details_json AS details FROM audit_log WHERE action = 'tache.update' AND entity_id = ? ORDER BY id DESC").get(t.id);
  const det = JSON.parse(j.details);
  assert.equal(det.titre_modifie, 1);
  assert.deepEqual(det.avant, { duree_estimee_min: null, corps_metier_id: V.elec });
  assert.deepEqual(det.apres, { duree_estimee_min: 45, corps_metier_id: V.plomb });
  const tout = getDb().prepare("SELECT details_json AS details FROM audit_log WHERE action LIKE 'tache.%' AND entity_id = ?").all(t.id).map((x) => x.details).join(' ');
  assert.ok(!/serrure|cylindre|1234/.test(tout), 'aucun texte de la tâche au journal (DV-116)');
  const n = getDb().prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'tache.update' AND entity_id = ?").get(t.id).n;
  await gest.put(`/api/taches/${t.id}`, { titre: 'Changer le cylindre' });
  assert.equal(getDb().prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'tache.update' AND entity_id = ?").get(t.id).n, n, 'rien de changé, rien d’écrit');
  await passer(gest, t.id, { etat: 'annulee', motif: 'Fait par le concierge.' });
  assert.equal((await gest.put(`/api/taches/${t.id}`, { titre: 'Encore' })).body.code, 'TACHE_FERMEE');
});

test('passages d’une tâche : permis, interdits, motif obligatoire pour annuler et seulement pour annuler', async () => {
  const d = await qualifiee();
  await ajouter(gest, d.id, { titre: 'Tâche témoin qui reste ouverte' });
  const t = (await ajouter(gest, d.id, { titre: 'Tâche à faire passer' })).body.data;
  assert.equal((await passer(gest, t.id, { etat: 'a_faire' })).body.code, 'TACHE_PASSAGE_INTERDIT');
  assert.equal((await passer(gest, t.id, { etat: 'annulee' })).body.code, 'TACHE_MOTIF_REQUIS');
  assert.equal((await passer(gest, t.id, { etat: 'annulee', motif: '   ' })).body.code, 'TACHE_MOTIF_REQUIS');
  assert.equal((await passer(gest, t.id, { etat: 'terminee', motif: 'Inutile' })).body.code, 'TACHE_MOTIF_INUTILE');
  const a = await passer(gest, t.id, { etat: 'annulee', motif: 'Doublon de la tâche 1.' });
  assert.equal(a.status, 200, JSON.stringify(a.body));
  assert.equal(a.body.data.etat, 'annulee');
  assert.equal(a.body.data.motif_annulation, 'Doublon de la tâche 1.');
  assert.deepEqual(a.body.data.passages, ['a_faire']);
  assert.equal((await passer(gest, t.id, { etat: 'terminee' })).body.code, 'TACHE_PASSAGE_INTERDIT');
  const r = await passer(gest, t.id, { etat: 'a_faire' });
  assert.equal(r.body.data.etat, 'a_faire');
  assert.equal(r.body.data.motif_annulation, null, 'motif effacé à la réouverture');
  const j = getDb().prepare("SELECT details_json AS details FROM audit_log WHERE action = 'tache.etat' AND entity_id = ? ORDER BY id").all(t.id).map((x) => JSON.parse(x.details));
  assert.deepEqual(j.map((x) => [x.de, x.vers, x.motif_donne]), [['a_faire', 'annulee', 1], ['annulee', 'a_faire', 0]]);
  assert.ok(!JSON.stringify(j).includes('Doublon'), 'motif jamais au journal');
});

test('effet sur la demande : une tâche démarre → « En cours » ; la dernière se termine → « Travaux terminés »', async () => {
  const d = await qualifiee();
  const t1 = (await ajouter(gest, d.id, { titre: 'Première tâche' })).body.data;
  const t2 = (await ajouter(gest, d.id, { titre: 'Deuxième tâche' })).body.data;
  const r = await passer(gest, t1.id, { etat: 'en_cours' });
  assert.equal(r.body.data.demande_etat, 'en_cours');
  assert.equal(r.body.data.demande_passage_auto, 'en_cours');
  const h = getDb().prepare('SELECT de_etat, vers_etat, user_id, canal FROM demande_historique WHERE demande_id = ? ORDER BY id DESC').get(d.id);
  assert.deepEqual([h.de_etat, h.vers_etat, h.user_id, h.canal], ['qualifiee', 'en_cours', gest.id, 'ecran']);
  const jt = JSON.parse(getDb().prepare("SELECT details_json AS details FROM audit_log WHERE action = 'demande.transition' AND entity_id = ? ORDER BY id DESC").get(d.id).details);
  assert.equal(jt.auto, 'taches');
  assert.equal((await passer(gest, t1.id, { etat: 'terminee' })).body.data.demande_etat, 'en_cours', 'une tâche encore ouverte');
  const f = await passer(gest, t2.id, { etat: 'terminee' });
  assert.equal(f.body.data.demande_etat, 'terminee');
  assert.equal(f.body.data.demande_passage_auto, 'terminee');
  assert.equal((await ajouter(gest, d.id, { titre: 'Trop tard' })).body.code, 'TACHES_FIGEES');
  assert.equal((await passer(gest, t2.id, { etat: 'a_faire' })).body.code, 'TACHES_FIGEES');
  assert.equal((await gest.get(`/api/demandes/${d.id}`)).body.data.taches_modifiables, 0);
});

test('effet sur la demande : toutes annulées → rien ; démarrage depuis « À qualifier » → rien (aucun passage dans la table)', async () => {
  const d = await qualifiee();
  const t = (await ajouter(gest, d.id, { titre: 'Seule tâche' })).body.data;
  const r = await passer(gest, t.id, { etat: 'annulee', motif: 'Plus nécessaire.' });
  assert.equal(r.body.data.demande_etat, 'qualifiee', 'aucune tâche terminée : pas de « Travaux terminés »');
  assert.equal(r.body.data.demande_passage_auto, null);
  const a = await deposer('Prise arrachée dans la salle du conseil.');
  const ta = (await ajouter(gest, a.id, { titre: 'Remplacer la prise' })).body.data;
  const s = await passer(gest, ta.id, { etat: 'en_cours' });
  assert.equal(s.status, 200);
  assert.equal(s.body.data.demande_etat, 'a_qualifier', 'la qualification reste à faire');
});

test('« Travaux terminés » à la main refusé tant qu’une tâche est ouverte, et pas proposé ; permis une fois les tâches finies', async () => {
  const d = await qualifiee();
  const t = (await ajouter(gest, d.id, { titre: 'Tâche ouverte' })).body.data;
  const r = await gest.post(`/api/demandes/${d.id}/transitions`, { etat: 'terminee' });
  assert.equal(r.status, 409);
  assert.equal(r.body.code, 'TACHES_OUVERTES');
  assert.ok(r.body.message.includes('Travaux terminés'));
  assert.ok(!(await gest.get(`/api/demandes/${d.id}`)).body.data.transitions.some((x) => x.vers === 'terminee'), 'pas proposé');
  assert.equal((await tool(gest, 'prepare_change_etat_demande', { id: d.id, etat: 'terminee' })).code, 'TACHES_OUVERTES');
  await passer(gest, t.id, { etat: 'annulee', motif: 'Inutile.' });
  assert.ok((await gest.get(`/api/demandes/${d.id}`)).body.data.transitions.some((x) => x.vers === 'terminee'), 'proposé de nouveau');
  assert.equal((await gest.post(`/api/demandes/${d.id}/transitions`, { etat: 'terminee' })).status, 200);
  // Une demande sans tâche garde le passage manuel.
  const s = await qualifiee();
  assert.equal((await gest.post(`/api/demandes/${s.id}/transitions`, { etat: 'terminee' })).status, 200);
});

test('demande annulée par le service : tâches ouvertes annulées automatiquement, journal auto ; terminée gardée', async () => {
  const d = await qualifiee();
  const t1 = (await ajouter(gest, d.id, { titre: 'Faite avant l’annulation' })).body.data;
  const t2 = (await ajouter(gest, d.id, { titre: 'Encore à faire' })).body.data;
  const t3 = (await ajouter(gest, d.id, { titre: 'Démarrée' })).body.data;
  await passer(gest, t1.id, { etat: 'terminee' });
  await passer(gest, t3.id, { etat: 'en_cours' });
  assert.equal(etatDemande(d.id), 'en_cours');
  const r = await gest.post(`/api/demandes/${d.id}/transitions`, { etat: 'annulee', commentaire: 'Regroupée par téléphone.' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const l = (await gest.get(`/api/demandes/${d.id}/taches`)).body.data;
  assert.deepEqual(l.map((t) => [t.rang, t.etat, t.annulation_auto]), [[t1.rang, 'terminee', null], [t2.rang, 'annulee', 'annulee'], [t3.rang, 'annulee', 'annulee']]);
  const auto = getDb().prepare("SELECT details_json AS details FROM audit_log WHERE action = 'tache.etat' AND entity_id IN (?, ?) ORDER BY id").all(t2.id, t3.id).map((x) => JSON.parse(x.details));
  assert.ok(auto.some((x) => x.auto === 'annulee' && x.vers === 'annulee' && x.de === 'a_faire'));
  assert.ok(auto.some((x) => x.auto === 'annulee' && x.de === 'en_cours'));
  assert.equal((await passer(gest, t2.id, { etat: 'a_faire' })).body.code, 'TACHES_FIGEES', 'demande fermée : tâches figées');
});

test('MCP : liste, création, modification, passage en deux appels (rien d’écrit à la préparation)', async () => {
  const d = await qualifiee();
  const c = await tool(gest, 'create_tache', { id: d.id, titre: 'Créée par le MCP', duree_estimee_min: 30 });
  assert.equal(c.data.rang, 1);
  assert.equal(getDb().prepare("SELECT channel FROM audit_log WHERE action = 'tache.create' AND entity_id = ?").get(c.data.id).channel, 'mcp');
  assert.equal((await tool(gest, 'list_taches_demande', { id: d.id })).data.length, 1);
  assert.equal((await tool(gest, 'update_tache', { id: c.data.id, titre: 'Renommée par le MCP' })).data.titre, 'Renommée par le MCP');
  assert.equal((await tool(gest, 'get_tache', { id: c.data.id })).data.titre, 'Renommée par le MCP');
  const p = await tool(gest, 'prepare_change_etat_tache', { id: c.data.id, etat: 'terminee' });
  assert.equal(p.data.de, 'a_faire');
  assert.equal(p.data.vers, 'terminee');
  assert.equal(p.data.taches_encore_ouvertes, 0);
  assert.equal(getDb().prepare('SELECT etat FROM demande_taches WHERE id = ?').get(c.data.id).etat, 'a_faire', 'rien d’écrit à la préparation');
  const f = await tool(gest, 'confirm_change_etat_tache', { confirmation_token: p.data.confirmation_token });
  assert.equal(f.data.etat, 'terminee');
  assert.equal(f.data.demande_etat, 'terminee');
  assert.equal(getDb().prepare('SELECT canal FROM demande_historique WHERE demande_id = ? ORDER BY id DESC').get(d.id).canal, 'mcp');
  assert.equal((await tool(agent, 'list_taches_demande', { id: d.id })).code, 'FORBIDDEN');
  assert.equal((await tool(gestB, 'create_tache', { id: d.id, titre: 'Intrusion' })).code, 'FORBIDDEN');
});

// ============================== Point 2 : affectation (PLA-01, DV-161) ==============================

const jour = (decalage = 0) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date(Date.now() + decalage * 86400000));
const affecter = (c, id, body) => c.put(`/api/taches/${id}/affectation`, body);
let o2;
let oB;
let equipeA;
let equipeB;
async function preparerAffectation() {
  if (equipeA) return;
  o2 = await person(srv.base, admin, 'o2.ta@exemple.test', ea.id, [[ea.id, 'ouvrier']]);
  oB = await person(srv.base, admin, 'ob.ta@exemple.test', eb.id, [[eb.id, 'ouvrier']]);
  const respB = await person(srv.base, admin, 'respb.ta@exemple.test', eb.id, [[eb.id, 'responsable']]);
  equipeA = (await resp.post('/api/equipes', { code: 'BAT-TA', nom_fr: 'Bâtiment', nom_nl: 'Gebouw', membres: [ouvrier.id, o2.id] })).body.data;
  equipeB = (await respB.post('/api/equipes', { code: 'BAT-TB', nom_fr: 'Bâtiment B', nom_nl: 'Gebouw B', membres: [oB.id] })).body.data;
  assert.ok(equipeA && equipeB);
}

test('affectation : ouvriers ou équipe, date et heure ; la demande passe « Planifiée », revient « Qualifiée » sans date', async () => {
  await preparerAffectation();
  const d = await qualifiee();
  const t = (await ajouter(gest, d.id, { titre: 'Remplacer le luminaire' })).body.data;
  const r = await affecter(gest, t.id, { ouvriers: [o2.id, ouvrier.id], date_prevue: jour(1), heure_debut: '08:30', duree_estimee_min: 90 });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body.data.ouvriers.map((o) => o.id).sort(), [ouvrier.id, o2.id].sort());
  assert.equal(r.body.data.date_prevue, jour(1));
  assert.equal(r.body.data.heure_debut, '08:30');
  assert.equal(r.body.data.duree_estimee_min, 90);
  assert.equal(r.body.data.demande_etat, 'planifiee');
  assert.equal(r.body.data.demande_passage_auto, 'planifiee');
  const h = getDb().prepare('SELECT de_etat, vers_etat FROM demande_historique WHERE demande_id = ? ORDER BY id DESC').get(d.id);
  assert.deepEqual([h.de_etat, h.vers_etat], ['qualifiee', 'planifiee']);
  // Le demandeur lit la date prévue, jamais le nom des ouvriers ; le libellé de l'état est le sien.
  const vue = (await agent.get(`/api/demandes/${d.id}`)).body.data;
  assert.equal(vue.etat, 'planifiee');
  assert.equal(vue.intervention_prevue_le, jour(1));
  assert.ok(!JSON.stringify(vue).includes('o2.ta@'), 'aucun ouvrier pour le demandeur');
  assert.equal(vue.etat_libelle_fr, 'Intervention prévue');
  // Équipe à la place des ouvriers.
  const e = await affecter(gest, t.id, { equipe_id: equipeA.id, date_prevue: jour(1) });
  assert.equal(e.body.data.equipe_id, equipeA.id);
  assert.equal(e.body.data.equipe_code, 'BAT-TA');
  assert.deepEqual(e.body.data.ouvriers, []);
  assert.equal(e.body.data.heure_debut, null, 'l’affectation envoyée remplace la précédente');
  assert.equal(e.body.data.demande_passage_auto, null, 'déjà planifiée');
  // Plus de date : retour à « Qualifiée ».
  const v = await affecter(gest, t.id, { equipe_id: equipeA.id });
  assert.equal(v.body.data.demande_etat, 'qualifiee');
  assert.equal(v.body.data.demande_passage_auto, 'qualifiee');
  assert.equal((await agent.get(`/api/demandes/${d.id}`)).body.data.intervention_prevue_le, null);
});

test('affectation : refus (équipe et ouvriers, ouvrier sans rôle ou d’une autre entité, équipe d’une autre entité, heure sans date, date passée) ; date déjà notée gardée', async () => {
  await preparerAffectation();
  const d = await qualifiee();
  const t = (await ajouter(gest, d.id, { titre: 'Contrôle des refus' })).body.data;
  assert.equal((await affecter(gest, t.id, { ouvriers: [ouvrier.id], equipe_id: equipeA.id })).body.code, 'AFFECTATION_DOUBLE');
  assert.equal((await affecter(gest, t.id, { ouvriers: [agent.id] })).body.code, 'OUVRIER_INVALIDE');
  assert.equal((await affecter(gest, t.id, { ouvriers: [oB.id] })).body.code, 'OUVRIER_INVALIDE');
  assert.equal((await affecter(gest, t.id, { equipe_id: equipeB.id })).body.code, 'EQUIPE_INVALIDE');
  assert.equal((await affecter(gest, t.id, { heure_debut: '09:00' })).body.code, 'HEURE_SANS_DATE');
  assert.equal((await affecter(gest, t.id, { date_prevue: jour(-1) })).body.code, 'DATE_PASSEE');
  assert.equal((await affecter(gest, t.id, { date_prevue: '2026-02-30' })).status, 400);
  assert.equal((await affecter(gest, t.id, { heure_debut: '24:00', date_prevue: jour(1) })).status, 400);
  assert.equal((await affecter(gest, t.id, { ouvriers: Array.from({ length: 11 }, (_, i) => i + 1) })).status, 400);
  assert.equal(etatDemande(d.id), 'qualifiee', 'rien d’écrit');
  // Une date déjà notée (devenue passée) se garde quand on change autre chose.
  await affecter(gest, t.id, { ouvriers: [ouvrier.id], date_prevue: jour(1) });
  getDb().prepare('UPDATE demande_taches SET date_prevue = ? WHERE id = ?').run(jour(-3), t.id);
  const g = await affecter(gest, t.id, { ouvriers: [ouvrier.id, o2.id], date_prevue: jour(-3) });
  assert.equal(g.status, 200, JSON.stringify(g.body));
  // Droits et cloison.
  assert.equal((await affecter(agent, t.id, { ouvriers: [ouvrier.id] })).status, 403);
  assert.equal((await affecter(ouvrier, t.id, { ouvriers: [ouvrier.id] })).status, 403);
  assert.equal((await affecter(gestB, t.id, { ouvriers: [oB.id] })).status, 403);
  // Tâche fermée.
  await passer(gest, t.id, { etat: 'annulee', motif: 'Essai.' });
  assert.equal((await affecter(gest, t.id, { ouvriers: [ouvrier.id] })).body.code, 'TACHE_FERMEE');
});

test('planification : tâche fermée ou démarrée, requalification, passages depuis « Planifiée » ; « Planifiée » jamais à la main', async () => {
  await preparerAffectation();
  const d = await qualifiee();
  const t1 = (await ajouter(gest, d.id, { titre: 'Première' })).body.data;
  const t2 = (await ajouter(gest, d.id, { titre: 'Deuxième' })).body.data;
  await affecter(gest, t1.id, { ouvriers: [ouvrier.id], date_prevue: jour(2) });
  assert.equal(etatDemande(d.id), 'planifiee');
  // La seule tâche datée annulée : plus de date ouverte, retour à « Qualifiée ».
  const a = await passer(gest, t1.id, { etat: 'annulee', motif: 'Reportée.' });
  assert.equal(a.body.data.demande_etat, 'qualifiee');
  const b = await passer(gest, t1.id, { etat: 'a_faire' });
  assert.equal(b.body.data.demande_etat, 'planifiee', 'rouverte avec sa date');
  // Requalification sans changer d'état ; boutons du service sans « Planifiée ».
  const q = await gest.post(`/api/demandes/${d.id}/qualifier`, { categorie_id: categorie.id, lieu_id: lieu, priorite: 'P2', motif_priorite: 'Plus urgent' });
  assert.equal(q.status, 200, JSON.stringify(q.body));
  assert.equal(q.body.data.etat, 'planifiee');
  const f = (await gest.get(`/api/demandes/${d.id}`)).body.data;
  assert.ok(f.transitions.some((x) => x.vers === 'en_attente'));
  assert.ok(f.transitions.some((x) => x.vers === 'qualifiee' && x.via === 'affecter'), 'rendu avec via pour être filtré par l’écran');
  assert.equal((await gest.post(`/api/demandes/${d.id}/transitions`, { etat: 'qualifiee' })).body.code, 'TRANSITION_PAR_ROUTE');
  const s = await qualifiee();
  assert.equal((await gest.post(`/api/demandes/${s.id}/transitions`, { etat: 'planifiee' })).body.code, 'TRANSITION_PAR_ROUTE');
  // Démarrage depuis « Planifiée » ; fin des tâches → « Travaux terminés ».
  assert.equal((await passer(gest, t2.id, { etat: 'en_cours' })).body.data.demande_etat, 'en_cours');
  await passer(gest, t2.id, { etat: 'terminee' });
  assert.equal((await passer(gest, t1.id, { etat: 'terminee' })).body.data.demande_etat, 'terminee');
  // Le demandeur annule une demande planifiée (passage du demandeur copié de « Qualifiée »).
  const p = await qualifiee();
  const tp = (await ajouter(gest, p.id, { titre: 'À annuler' })).body.data;
  await affecter(gest, tp.id, { date_prevue: jour(3) });
  assert.equal((await agent.del(`/api/demandes/${p.id}`, { motif: 'Réglé par le concierge.' })).status, 200);
  assert.equal((await gest.get(`/api/taches/${tp.id}`)).body.data.annulation_auto, 'annulee');
});

test('affectation : journal des champs changés avec ouvriers et équipe nommés ; rien de changé, rien d’écrit ; MCP', async () => {
  await preparerAffectation();
  const d = await qualifiee();
  const t = (await ajouter(gest, d.id, { titre: 'Journal' })).body.data;
  await affecter(gest, t.id, { ouvriers: [ouvrier.id], date_prevue: jour(1) });
  await affecter(gest, t.id, { equipe_id: equipeA.id, date_prevue: jour(1) });
  const n = getDb().prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'tache.affecter' AND entity_id = ?").get(t.id).n;
  assert.equal(n, 2);
  await affecter(gest, t.id, { equipe_id: equipeA.id, date_prevue: jour(1) });
  assert.equal(getDb().prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'tache.affecter' AND entity_id = ?").get(t.id).n, 2, 'rien de changé');
  const j = (await admin.get('/api/audit?action=tache.affecter&limit=50')).body.data.find((l) => l.entity_id === t.id && l.details.apres.equipe_id);
  assert.deepEqual(j.details.avant, { ouvriers: [ouvrier.id], equipe_id: null });
  assert.equal(j.noms['avant.ouvriers.0'].type, 'personne');
  assert.equal(j.noms['apres.equipe_id'].code, 'BAT-TA');
  const m = await tool(gest, 'affecter_tache', { id: t.id, ouvriers: [o2.id], date_prevue: jour(2), heure_debut: '13:00' });
  assert.equal(m.data.heure_debut, '13:00');
  assert.equal(getDb().prepare("SELECT channel FROM audit_log WHERE action = 'tache.affecter' AND entity_id = ? ORDER BY id DESC").get(t.id).channel, 'mcp');
  assert.equal((await tool(gestB, 'affecter_tache', { id: t.id, ouvriers: [oB.id] })).code, 'FORBIDDEN');
});

// ============================== Point 3 : suggestion d'affectation (PLA-02, DV-162) ==============================

/** Prochain jour (à partir de demain) du jour de semaine voulu (1 = lundi … 7 = dimanche), hors jour férié belge. */
function prochain(jourSemaine) {
  const feries = require('../src/services/calendrier');
  for (let i = 1; i < 60; i += 1) {
    const iso = jour(i);
    const js = ((new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
    if (js === jourSemaine && !feries.feries(Number(iso.slice(0, 4))).some((f) => f.date === iso)) return iso;
  }
  throw new Error('aucun jour');
}

test('suggestion : même corps en tête, puis disponibles, puis charge croissante ; horaire d’équipe (week-end) ; filtre par compétence ; rien d’écrit', async () => {
  await preparerAffectation();
  const respC = resp;
  // Profils : ouvrier = plombier, o2 = électricien sans charge, o3 = électricien chargé, o4 = électricien de l'équipe du week-end.
  const o3 = await person(srv.base, admin, 'o3.ta@exemple.test', ea.id, [[ea.id, 'ouvrier']]);
  const o4 = await person(srv.base, admin, 'o4.ta@exemple.test', ea.id, [[ea.id, 'ouvrier']]);
  const vca = await valeur(gest, 'competence', 'vca');
  for (const [o, corps, comp] of [[ouvrier, V.plomb, []], [o2, V.elec, [vca]], [o3, V.elec, []], [o4, V.elec, [vca]]]) {
    const r = await respC.put(`/api/ouvriers/${o.id}`, { corps_metier_id: corps, competences: comp });
    assert.equal(r.status, 200, JSON.stringify(r.body));
  }
  const we = (await respC.post('/api/equipes', { code: 'WE-TA', nom_fr: 'Week-end', nom_nl: 'Weekend', membres: [o4.id], horaire: [{ jour: 6, debut: '07:00', fin: '13:00' }, { jour: 7, debut: '07:00', fin: '13:00' }] })).body.data;
  assert.ok(we);
  const mercredi = prochain(3);
  const samedi = prochain(6);
  // Charge de o3 le mercredi : une autre tâche de 2 h.
  const autre = await qualifiee();
  const ta = (await ajouter(gest, autre.id, { titre: 'Autre travail', duree_estimee_min: 120 })).body.data;
  await affecter(gest, ta.id, { ouvriers: [o3.id], date_prevue: mercredi });
  const d = await qualifiee();
  const t = (await ajouter(gest, d.id, { titre: 'À confier' })).body.data;
  const r = await gest.get(`/api/taches/${t.id}/suggestions?date=${mercredi}`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.date, mercredi);
  assert.equal(r.body.data.jour_ouvre_entite, 1);
  const ids = r.body.data.ouvriers.map((o) => o.id);
  const ligne = (o) => r.body.data.ouvriers.find((x) => x.id === o.id);
  assert.deepEqual([ligne(o2).meme_corps, ligne(o2).disponible, ligne(o2).charge_min], [1, 1, 0]);
  assert.deepEqual([ligne(o3).meme_corps, ligne(o3).disponible, ligne(o3).charge_min, ligne(o3).nb_taches], [1, 1, 120, 1]);
  assert.deepEqual([ligne(o4).meme_corps, ligne(o4).disponible], [1, 0], 'équipe du week-end : pas le mercredi');
  assert.equal(ligne(ouvrier).meme_corps, 0);
  assert.ok(ids.indexOf(o2.id) < ids.indexOf(o3.id), 'charge croissante');
  assert.ok(ids.indexOf(o3.id) < ids.indexOf(o4.id), 'disponibles avant les indisponibles');
  assert.ok(ids.indexOf(o4.id) < ids.indexOf(ouvrier.id), 'même corps de métier en tête');
  assert.ok(!ids.includes(oB.id) && !ids.includes(agent.id), 'ouvriers de l’entité seulement');
  // Le samedi : seule l'équipe du week-end travaille ; l'entité est fermée.
  const s2 = (await gest.get(`/api/taches/${t.id}/suggestions?date=${samedi}`)).body.data;
  assert.equal(s2.jour_ouvre_entite, 0);
  assert.deepEqual(s2.ouvriers.filter((o) => o.disponible).map((o) => o.id), [o4.id]);
  // Date par défaut : celle de la tâche.
  await affecter(gest, t.id, { ouvriers: [o2.id], date_prevue: samedi });
  const s3 = (await gest.get(`/api/taches/${t.id}/suggestions`)).body.data;
  assert.equal(s3.date, samedi);
  assert.equal(s3.ouvriers.find((o) => o.id === o2.id).deja_affecte, 1);
  // Filtre par compétence.
  const f = (await gest.get(`/api/taches/${t.id}/suggestions?date=${mercredi}&competence_id=${vca}`)).body.data;
  assert.deepEqual(f.ouvriers.map((o) => o.id).sort(), [o2.id, o4.id].sort());
  // Droits, cloison, validation, MCP.
  assert.equal((await agent.get(`/api/taches/${t.id}/suggestions`)).status, 403);
  assert.equal((await ouvrier.get(`/api/taches/${t.id}/suggestions`)).status, 403);
  assert.equal((await gestB.get(`/api/taches/${t.id}/suggestions`)).status, 403);
  assert.equal((await gest.get(`/api/taches/${t.id}/suggestions?date=2026-02-30`)).status, 400);
  const m = await tool(gest, 'suggerer_affectation_tache', { id: t.id, date: mercredi });
  assert.equal(m.data.ouvriers[0].id, o2.id);
  const n = getDb().prepare("SELECT COUNT(*) AS n FROM audit_log WHERE entity_id = ? AND entity_type = 'tache'").get(t.id).n;
  await gest.get(`/api/taches/${t.id}/suggestions?date=${mercredi}`);
  assert.equal(getDb().prepare("SELECT COUNT(*) AS n FROM audit_log WHERE entity_id = ? AND entity_type = 'tache'").get(t.id).n, n, 'rien d’écrit');
});

test('filtres équipe et ouvrier (DV-163) : tâches directes ou par l’équipe, annulées exclues ; export et vue enregistrée ; cloison', async () => {
  await preparerAffectation();
  const o3 = await person(srv.base, admin, 'filtre.ta@exemple.test', ea.id, [[ea.id, 'ouvrier']]);
  const creer = async (titre, affectation) => {
    const d = await qualifiee();
    const t = (await ajouter(gest, d.id, { titre })).body.data;
    const r = await affecter(gest, t.id, affectation);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    return { d, t };
  };
  const parEquipe = await creer('Par l’équipe', { equipe_id: equipeA.id });
  const parMembre = await creer('Par un membre', { ouvriers: [o2.id] });
  const horsEquipe = await creer('Hors équipe', { ouvriers: [o3.id] });
  const annulee = await creer('Annulée', { ouvriers: [o3.id] });
  await passer(gest, annulee.t.id, { etat: 'annulee', motif: 'Essai.' });
  const annuleeEquipe = await creer('Annulée (équipe)', { equipe_id: equipeA.id });
  await passer(gest, annuleeEquipe.t.id, { etat: 'annulee', motif: 'Essai.' });
  const ids = async (c, filtres) => {
    const r = await c.get(`/api/demandes?perimetre=entite&limit=200&${new URLSearchParams(filtres)}`);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    return r.body.data.map((x) => x.id);
  };
  const eq = await ids(gest, { equipe_id: equipeA.id });
  assert.ok(eq.includes(parEquipe.d.id), 'tâche confiée à l’équipe');
  assert.ok(eq.includes(parMembre.d.id), 'tâche confiée à un membre');
  assert.ok(!eq.includes(horsEquipe.d.id) && !eq.includes(annulee.d.id), 'ouvrier hors équipe');
  assert.ok(!eq.includes(annuleeEquipe.d.id), 'tâche de l’équipe annulée exclue');
  const ouv = await ids(gest, { ouvrier_id: ouvrier.id });
  assert.ok(ouv.includes(parEquipe.d.id), 'par son équipe');
  assert.ok(!ouv.includes(parMembre.d.id), 'tâche d’un collègue');
  const o3ids = await ids(gest, { ouvrier_id: o3.id });
  assert.ok(o3ids.includes(horsEquipe.d.id), 'tâche directe');
  assert.ok(!o3ids.includes(annulee.d.id), 'tâche annulée exclue');
  assert.ok(!o3ids.includes(parEquipe.d.id));
  // Combiné aux autres filtres (ET).
  assert.deepEqual(await ids(gest, { equipe_id: equipeA.id, ouvrier_id: o3.id }), []);
  // Export avec le filtre : même contenu que la liste.
  const res = await fetch(`${srv.base}/api/demandes/export?format=csv&perimetre=entite&ouvrier_id=${o3.id}`, { headers: { Cookie: gest.cookie } });
  assert.equal(res.status, 200);
  const csv = Buffer.from(await res.arrayBuffer()).toString('utf8');
  assert.ok(csv.includes(horsEquipe.d.numero) && !csv.includes(annulee.d.numero) && !csv.includes(parEquipe.d.numero), csv);
  // Vue enregistrée : les deux filtres se gardent.
  const v = await gest.post('/api/vues-demandes', { nom: 'Équipe bâtiment', filtres: { equipe_id: equipeA.id, ouvrier_id: ouvrier.id } });
  assert.equal(v.status, 201, JSON.stringify(v.body));
  assert.deepEqual([v.body.data.filtres.equipe_id, v.body.data.filtres.ouvrier_id], [equipeA.id, ouvrier.id]);
  // Valeurs refusées ; cloison : l’équipe ou l’ouvrier d’une autre entité ne fait rien voir.
  assert.equal((await gest.get('/api/demandes?perimetre=entite&equipe_id=0')).status, 400);
  assert.equal((await gest.get('/api/demandes?perimetre=entite&ouvrier_id=abc')).status, 400);
  assert.deepEqual(await ids(gestB, { equipe_id: equipeA.id }), []);
  assert.deepEqual(await ids(gestB, { ouvrier_id: o3.id }), []);
  // MCP : même filtre.
  const m = await tool(gest, 'list_demandes', { perimetre: 'entite', ouvrier_id: o3.id, limit: 200 });
  assert.ok(m.data.rows.map((x) => x.id).includes(horsEquipe.d.id) && !m.data.rows.map((x) => x.id).includes(annulee.d.id), JSON.stringify(m).slice(0, 300));
});

test('migration 017 sur une base de la 0.19.0 : table des tâches créée, demandes intactes, pas de relance', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { spawnSync } = require('child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gmao-017-'));
  const env = { PATH: process.env.PATH, NODE_ENV: 'test', APP_TEST_MODE: '1', DB_PATH: path.join(dir, 'd.db') };
  const run = (code) => spawnSync(process.execPath, ['-e', code], { cwd: path.join(__dirname, '..'), env, encoding: 'utf8' });
  // Base 0.19.0 : migrations 001 à 016 (SQL), une entité, un compte, une demande qualifiée.
  const prep = run(`
    const initSqlJs = require('sql.js'); const fs = require('fs');
    const { MIGRATIONS } = require('./src/database');
    initSqlJs().then((SQL) => {
      const db = new SQL.Database();
      db.run("CREATE TABLE schema_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, applied_at TEXT DEFAULT (datetime('now')))");
      for (const [name, sql] of MIGRATIONS.slice(0, 16)) { for (const s of sql.split(';').map((x) => x.trim()).filter(Boolean)) db.run(s); db.run('INSERT INTO schema_migrations (name) VALUES (?)', [name]); }
      db.run("INSERT INTO entites (code, nom_fr, nom_nl) VALUES ('AC', 'A', 'A')");
      db.run("INSERT INTO users (email, first_name, last_name, user_role, entite_id) VALUES ('a@exemple.test', 'A', 'A', 'agent', 1)");
      db.run("INSERT INTO lieux (entite_id, nature, code, nom_fr, nom_nl) VALUES (1, 'site', 'S', 'S', 'S')");
      db.run("INSERT INTO categories (entite_id, code, libelle_fr, libelle_nl, icone) VALUES (1, 'electricite', 'É', 'E', 'eclair')");
      db.run("INSERT INTO demandes (entite_id, numero, annee, sequence, lieu_id, categorie_id, description, demandeur_id, canal, etat) VALUES (1, 'AC-DI-2026-00001', 2026, 1, 1, 1, 'Lampe du couloir', 1, 'ecran', 'qualifiee')");
      db.run("INSERT INTO demande_transitions (de_etat, vers_etat, permission, via, is_active, ordre) VALUES ('qualifiee', 'en_cours', 'demandes:traiter', NULL, 0, 30)");
      db.run("INSERT INTO demande_transitions (de_etat, vers_etat, permission, via, ordre) VALUES ('a_qualifier', 'qualifiee', 'demandes:qualifier', 'qualifier', 10)");
      fs.writeFileSync(process.env.DB_PATH, Buffer.from(db.export()));
    });`);
  assert.equal(prep.status, 0, prep.stderr);
  const lire = `require('./src/database').initDb().then((d) => console.log(JSON.stringify({
    migrations: d.prepare('SELECT name FROM schema_migrations ORDER BY id').all().map((m) => m.name),
    colonnes: d.prepare('PRAGMA table_info(demande_taches)').all().map((c) => c.name),
    taches: d.prepare('SELECT COUNT(*) AS n FROM demande_taches').get().n,
    ouvriers: d.prepare("SELECT 1 FROM sqlite_master WHERE name = 'tache_ouvriers'").get() ? 1 : 0,
    passages: d.prepare('SELECT de_etat, vers_etat, via, is_active FROM demande_transitions ORDER BY id').all(),
    viaAffecter: /'affecter'/.test(d.prepare("SELECT sql FROM sqlite_master WHERE name = 'demande_transitions'").get().sql),
    demande: d.prepare('SELECT numero, etat, description FROM demandes').get() })))`;
  const out = run(lire);
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /\[DB\] Migration 017_taches appliquée/);
  const r = JSON.parse(out.stdout.trim().split('\n').pop());
  assert.equal(r.migrations.at(-1), '017_taches');
  for (const c of ['demande_id', 'entite_id', 'rang', 'titre', 'consignes', 'corps_metier_id', 'duree_estimee_min', 'etat', 'motif_annulation', 'annulation_auto',
    'equipe_id', 'date_prevue', 'heure_debut']) assert.ok(r.colonnes.includes(c), c);
  assert.ok(r.ouvriers, 'table des ouvriers d’une tâche');
  assert.ok(r.viaAffecter, 'table des passages refaite : via « affecter » admis');
  assert.deepEqual(r.passages.slice(0, 2), [{ de_etat: 'qualifiee', vers_etat: 'en_cours', via: null, is_active: 0 }, { de_etat: 'a_qualifier', vers_etat: 'qualifiee', via: 'qualifier', is_active: 1 }],
    'passages repris à l’identique, le passage désactivé reste désactivé');
  assert.ok(r.passages.some((x) => x.de_etat === 'qualifiee' && x.vers_etat === 'planifiee' && x.via === 'affecter' && x.is_active === 1), 'passages de « Planifiée » ajoutés au démarrage');
  assert.ok(r.passages.some((x) => x.de_etat === 'planifiee' && x.vers_etat === 'en_cours'));
  assert.equal(r.taches, 0);
  assert.deepEqual(r.demande, { numero: 'AC-DI-2026-00001', etat: 'qualifiee', description: 'Lampe du couloir' });
  const encore = run(lire);
  assert.equal(encore.status, 0, encore.stderr);
  assert.doesNotMatch(encore.stdout, /Migration 017_taches appliquée/, 'pas de relance');
});
