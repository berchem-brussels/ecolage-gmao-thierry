/**
 * Étape 8, version 0.9.0 : échéances enregistrées (PRI-03), tableau de bord (GES-01), liste du service technique
 * (GES-02), qualification (GES-04) et priorité confirmée ou changée avec un motif (PRI-01) ; DV-88 à DV-92.
 * Les vues enregistrées sont dans vues-demandes.test.js ; la cloison entre entités dans cloison.test.js.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { getDb } = require('../src/database');
const qualification = require('../src/services/qualification');

let srv;
let admin;
let ea;
let agent;
let collegue;
let ouvrier;
let gest;
let resp;
const L = {};
const C = {};
const parse = (r) => JSON.parse(r.body.result.content[0].text);
const call = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));
const deposer = async (c, extra = {}) => {
  const r = await c.post('/api/demandes', { lieu_id: L.local, categorie_id: C.eclairage, description: 'La lampe du couloir clignote.', ...extra });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.data;
};
const qualifier = (c, id, extra = {}) => c.post(`/api/demandes/${id}/qualifier`, { categorie_id: C.eclairage, lieu_id: L.local, priorite: 'P3', ...extra });
/** Recule la réception d'une demande et recalcule ses échéances, comme la migration 008. */
const reculer = (id, createdAt) => {
  getDb().prepare('UPDATE demandes SET created_at = ?, prise_en_charge_le = NULL, echeance_le = NULL WHERE id = ?').run(createdAt, id);
  qualification.completerEcheances(getDb());
};
const ligne = (id) => getDb().prepare('SELECT * FROM demandes WHERE id = ?').get(id);
const journal = (id) => getDb().prepare("SELECT details_json, channel FROM audit_log WHERE action = 'demande.qualifier' AND entity_id = ? ORDER BY id DESC").get(id);
const demain = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date(Date.now() + 3 * 86400000));

before(async () => {
  srv = await startServer();
  ({ admin, ea } = await setup(srv.base));
  agent = await person(srv.base, admin, 'agent.q@exemple.test', ea.id);
  collegue = await person(srv.base, admin, 'collegue.q@exemple.test', ea.id);
  ouvrier = await person(srv.base, admin, 'ouvrier.q@exemple.test', ea.id, [[ea.id, 'ouvrier']]);
  gest = await person(srv.base, admin, 'gest.q@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  resp = await person(srv.base, admin, 'resp.q@exemple.test', ea.id, [[ea.id, 'responsable']]);
  const lieu = async (body) => { const r = await gest.post('/api/lieux', body); assert.equal(r.status, 201, JSON.stringify(r.body)); return r.body.data.id; };
  L.site = await lieu({ nature: 'site', code: 'EC', nom_fr: 'École', nom_nl: 'School' });
  L.bat = await lieu({ nature: 'batiment', parent_id: L.site, code: 'EC-A', nom_fr: 'Bâtiment A', nom_nl: 'Gebouw A' });
  const type = (await gest.get('/api/listes-valeurs?liste=type_lieu')).body.data[0].id;
  L.local = await lieu({ nature: 'local', parent_id: L.bat, code: 'EC-A-1', nom_fr: 'Classe 1', nom_nl: 'Klas 1', type_id: type });
  L.autreBat = await lieu({ nature: 'batiment', parent_id: L.site, code: 'EC-B', nom_fr: 'Bâtiment B', nom_nl: 'Gebouw B' });
  C.eclairage = (await gest.get('/api/categories?niveau=nature&q=eclairage')).body.data[0].id;
  C.fuite = (await gest.get('/api/categories?niveau=nature&q=fuite_eau')).body.data[0].id;
  C.electricite = (await gest.get('/api/categories?niveau=domaine&q=electricite')).body.data[0].id;
  C.p4 = (await resp.post('/api/categories', { code: 'amenagement_q', libelle_fr: 'Aménagement', libelle_nl: 'Inrichting', priorite_defaut: 'P4', validation: 0 })).body.data.id;
});
after(() => srv.stop());

test('dépôt : échéances de prise en charge et de fin enregistrées, priorité proposée notée (DV-88)', async () => {
  const d = await deposer(agent);
  const l = ligne(d.id);
  assert.equal(l.priorite_proposee, 'P3');
  assert.ok(l.prise_en_charge_le && l.echeance_le, 'deux échéances');
  assert.ok(l.prise_en_charge_le < l.echeance_le);
  assert.equal(d.delai_annonce.fin_le.utc.slice(0, 19).replace('T', ' '), l.echeance_le, 'le délai annoncé lit l’échéance enregistrée');
  const p4 = ligne((await deposer(agent, { categorie_id: C.p4 })).id);
  assert.ok(p4.prise_en_charge_le);
  assert.equal(p4.echeance_le, null, 'P4 : date à convenir');
});

test('fiche : le service lit l’échéance qui compte et le retard ; le demandeur ne lit ni consignes ni motif', async () => {
  const d = await deposer(agent);
  const s = (await gest.get(`/api/demandes/${d.id}`)).body.data;
  assert.equal(s.echeance_type, 'prise_en_charge');
  assert.equal(s.echeance_courante, ligne(d.id).prise_en_charge_le);
  assert.equal(s.retard, 0);
  assert.equal(s.priorite_proposee, 'P3');
  const a = (await agent.get(`/api/demandes/${d.id}`)).body.data;
  for (const k of ['priorite_proposee', 'motif_priorite', 'consignes', 'duree_estimee_minutes', 'qualifiee_par', 'qualifiee_le', 'echeance_type', 'retard']) {
    assert.ok(!(k in a), `${k} absent pour le demandeur`);
  }
});

test('qualification : « À qualifier » devient « Qualifiée », champs enregistrés, journal sans texte libre', async () => {
  const d = await deposer(agent);
  const r = await qualifier(gest, d.id, { duree_estimee_minutes: 90, consignes: 'Prendre l’échelle de 3 m.', photos_visibles: 0 });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const q = r.body.data;
  assert.equal(q.etat, 'qualifiee');
  assert.equal(q.priorite, 'P3');
  assert.equal(q.motif_priorite, null, 'priorité confirmée : pas de motif');
  assert.equal(q.duree_estimee_minutes, 90);
  assert.equal(q.consignes, 'Prendre l’échelle de 3 m.');
  assert.equal(q.photos_visibles, 0);
  assert.equal(q.qualifiee_par, gest.id);
  assert.ok(q.qualifiee_le);
  assert.equal(q.echeance_type, 'fin', 'après qualification, c’est la fin qui compte');
  const j = JSON.parse(journal(d.id).details_json);
  assert.equal(j.premiere, 1);
  assert.equal(j.priorite_confirmee, 1);
  assert.equal(j.apres.etat, 'qualifiee');
  assert.equal(j.apres.consignes, 1, 'consignes notées par 1, sans le texte');
  assert.ok(!JSON.stringify(j).includes('échelle'));
  const a = (await agent.get(`/api/demandes/${d.id}`)).body.data;
  assert.equal(a.etat, 'qualifiee');
  assert.ok(!('consignes' in a));
});

test('priorité changée : motif exigé (409), gardé sur la fiche, échéances recalculées depuis la réception', async () => {
  const d = await deposer(agent);
  const avant = ligne(d.id);
  const sans = await qualifier(gest, d.id, { priorite: 'P2' });
  assert.equal(sans.status, 409);
  assert.equal(sans.body.code, 'MOTIF_PRIORITE_REQUIS');
  assert.equal(ligne(d.id).etat, 'a_qualifier', 'rien n’a changé');
  const r = await qualifier(gest, d.id, { priorite: 'P2', motif_priorite: 'Classe occupée toute la semaine' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.priorite, 'P2');
  assert.equal(r.body.data.motif_priorite, 'Classe occupée toute la semaine');
  const apres = ligne(d.id);
  assert.ok(apres.echeance_le < avant.echeance_le, 'P2 plus courte que P3');
  assert.equal(apres.created_at, avant.created_at);
  const j = JSON.parse(journal(d.id).details_json);
  assert.equal(j.priorite_confirmee, 0);
  assert.equal(j.avant.priorite, 'P3');
  assert.equal(j.apres.priorite, 'P2');
  assert.equal(j.apres.motif_priorite, 1);
  // Retour à la priorité proposée : le motif n'a plus lieu d'être.
  const conf = await qualifier(gest, d.id, { priorite: 'P3' });
  assert.equal(conf.body.data.motif_priorite, null);
});

test('changement de catégorie : la priorité proposée suit la catégorie ; danger signalé : P1 proposée', async () => {
  const d = await deposer(agent);
  const r = await qualifier(gest, d.id, { categorie_id: C.fuite, priorite: 'P2' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.priorite_proposee, 'P2');
  assert.equal(r.body.data.motif_priorite, null);
  const danger = await deposer(agent, { danger: 1 });
  assert.equal(ligne(danger.id).priorite_proposee, 'P1');
  const baisse = await qualifier(gest, danger.id, { priorite: 'P3' });
  assert.equal(baisse.body.code, 'MOTIF_PRIORITE_REQUIS', 'baisser une P1 de danger exige un motif');
  const ok = await qualifier(gest, danger.id, { priorite: 'P3', motif_priorite: 'Aucun danger constaté sur place' });
  assert.equal(ok.status, 200);
});

test('lieu précisé et catégorie : de l’entité, actifs ; domaine avec natures à préciser', async () => {
  const d = await deposer(agent);
  const r = await qualifier(gest, d.id, { lieu_id: L.autreBat });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.lieu_id, L.autreBat);
  assert.equal((await qualifier(gest, d.id, { categorie_id: C.electricite })).body.code, 'DEMANDE_CATEGORIE_A_PRECISER');
  assert.equal((await qualifier(gest, d.id, { lieu_id: 999999 })).status, 404);
});

test('date convenue : seulement pour une priorité sans délai de fin ; fixe l’échéance de fin', async () => {
  const d = await deposer(agent, { categorie_id: C.p4 });
  const jour = demain();
  const r = await qualifier(gest, d.id, { categorie_id: C.p4, priorite: 'P4', date_convenue: jour });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.date_convenue, jour);
  assert.ok(ligne(d.id).echeance_le, 'fin fixée par la date convenue');
  const a = (await agent.get(`/api/demandes/${d.id}`)).body.data;
  assert.equal(a.delai_annonce.date_convenue, false, 'le demandeur voit la date');
  const p3 = await qualifier(gest, d.id, { categorie_id: C.p4, priorite: 'P3', motif_priorite: 'Plus pressé que prévu', date_convenue: jour });
  assert.equal(p3.body.code, 'DATE_CONVENUE_INUTILE');
  const passe = await qualifier(gest, d.id, { categorie_id: C.p4, priorite: 'P4', date_convenue: '2020-01-01' });
  assert.equal(passe.body.code, 'DATE_CONVENUE_INVALIDE');
  // Passage en P3 sans date envoyée : la date convenue tombe, le délai de la priorité s'applique.
  const sansDate = await qualifier(gest, d.id, { categorie_id: C.p4, priorite: 'P3', motif_priorite: 'Plus pressé que prévu' });
  assert.equal(sansDate.status, 200);
  assert.equal(sansDate.body.data.date_convenue, null);
});

test('droits : agent, ouvrier et collègue refusés (403) ; responsable admis ; état hors qualification refusé (409)', async () => {
  const d = await deposer(agent);
  for (const c of [agent, ouvrier, collegue]) assert.equal((await qualifier(c, d.id)).status, 403);
  assert.equal(ligne(d.id).etat, 'a_qualifier');
  assert.equal((await qualifier(resp, d.id)).status, 200);
  assert.equal((await qualifier(resp, d.id, { consignes: 'Requalifiée' })).status, 200, 'une demande qualifiée se qualifie à nouveau');
  getDb().prepare("UPDATE demandes SET etat = 'cloturee' WHERE id = ?").run(d.id);
  const ferme = await qualifier(gest, d.id);
  assert.equal(ferme.status, 409);
  assert.equal(ferme.body.code, 'DEMANDE_ETAT');
  assert.equal((await qualifier(gest, 999999)).status, 404);
  assert.equal((await gest.post(`/api/demandes/${d.id}/qualifier`, { categorie_id: C.eclairage, lieu_id: L.local, priorite: 'P9' })).status, 400);
  assert.equal((await gest.post(`/api/demandes/${d.id}/qualifier`, { categorie_id: C.eclairage, lieu_id: L.local, priorite: 'P3', etat: 'cloturee' })).status, 400, 'champ inconnu refusé');
});

test('retard : prise en charge dépassée « À qualifier », fin dépassée une fois qualifiée ; demande fermée jamais en retard', async () => {
  const d = await deposer(agent);
  reculer(d.id, '2026-01-05 08:00:00');
  const s = (await gest.get(`/api/demandes/${d.id}`)).body.data;
  assert.equal(s.retard, 1);
  assert.equal(s.echeance_type, 'prise_en_charge');
  await qualifier(gest, d.id);
  const q = (await gest.get(`/api/demandes/${d.id}`)).body.data;
  assert.equal(q.retard, 1, 'fin aussi dépassée');
  assert.equal(q.echeance_type, 'fin');
  const f = await deposer(agent);
  reculer(f.id, '2026-01-05 08:00:00');
  getDb().prepare("UPDATE demandes SET etat = 'annulee' WHERE id = ?").run(f.id);
  const fermee = (await gest.get(`/api/demandes/${f.id}`)).body.data;
  assert.equal(fermee.retard, 0);
  assert.equal(fermee.echeance_courante, null);
});

test('tableau de bord : quatre compteurs, égaux aux totaux des filtres de la liste ; réservé au service', async () => {
  const t = await gest.get('/api/demandes/tableau-bord');
  assert.equal(t.status, 200, JSON.stringify(t.body));
  const b = t.body.data;
  for (const k of ['a_qualifier', 'en_retard', 'p1_p2', 'echeance_proche']) assert.equal(typeof b[k], 'number', k);
  assert.equal(b.jours_proches, 2);
  const total = async (qs) => (await gest.get(`/api/demandes?perimetre=entite&${qs}`)).body.pagination.total;
  assert.equal(b.a_qualifier, await total('etats=a_qualifier'));
  assert.equal(b.en_retard, await total('echeance=retard'));
  assert.ok(b.en_retard >= 1);
  assert.equal(b.p1_p2, await total('priorites=P1,P2&ouvertes=1'));
  assert.equal(b.echeance_proche, await total('echeance=proche'));
  assert.equal((await agent.get('/api/demandes/tableau-bord')).status, 403);
  assert.equal((await ouvrier.get('/api/demandes/tableau-bord')).status, 403);
  const m = (await call(gest, 'get_tableau_bord')).data;
  for (const k of ['a_qualifier', 'en_retard', 'p1_p2', 'echeance_proche']) assert.equal(m[k], b[k], `MCP ${k}`);
});

test('liste du service : filtres par états, priorités, catégorie (domaine compris), bâtiment, échéance, canal, danger', async () => {
  const get = async (qs) => { const r = await gest.get(`/api/demandes?perimetre=entite&limit=200&${qs}`); assert.equal(r.status, 200, JSON.stringify(r.body)); return r.body.data; };
  const fuite = await deposer(agent, { categorie_id: C.fuite, lieu_id: L.autreBat });
  assert.ok((await get('etats=a_qualifier,qualifiee')).every((d) => ['a_qualifier', 'qualifiee'].includes(d.etat)));
  assert.ok((await get('priorites=P2')).every((d) => d.priorite === 'P2'));
  const parDomaine = await get(`categorie_id=${C.electricite}`);
  assert.ok(parDomaine.length > 0 && parDomaine.every((d) => d.categorie_id !== C.fuite), 'domaine Électricité : ses natures');
  assert.ok((await get(`categorie_id=${C.fuite}`)).some((d) => d.id === fuite.id));
  const bat = await get(`batiment_id=${L.bat}`);
  assert.ok(bat.length > 0 && bat.every((d) => d.lieu_id === L.local), 'bâtiment A : son local');
  assert.ok((await get(`batiment_id=${L.site}`)).some((d) => d.id === fuite.id), 'le site compte tous ses bâtiments');
  assert.ok((await get('echeance=retard')).every((d) => d.retard === 1));
  assert.ok((await get('echeance=sans')).every((d) => d.echeance_courante === null));
  assert.ok((await get('canal=ecran')).length > 0);
  assert.equal((await get('canal=telephone')).length, 0);
  assert.ok((await get('danger=1')).every((d) => d.danger === 1));
  for (const bad of ['etats=inconnu', 'priorites=P5', 'echeance=demain', 'tri=description', "etats=a_qualifier'--"]) {
    assert.equal((await gest.get(`/api/demandes?perimetre=entite&${bad}`)).status, 400, bad);
  }
  assert.equal((await gest.get('/api/demandes?perimetre=entite&categorie_id=999999')).status, 404);
});

test('liste du service : recherche sur le nom du demandeur, tris par échéance, priorité, numéro', async () => {
  const noms = await gest.get('/api/demandes?perimetre=entite&q=Prénom Nom');
  assert.ok(noms.body.pagination.total > 0, 'recherche sur le demandeur');
  assert.equal((await agent.get('/api/demandes?q=Prénom Nom')).body.pagination.total, 0, 'pas sur le nom pour « Mes demandes »');
  const ech = (await gest.get('/api/demandes?perimetre=entite&ouvertes=1&tri=echeance&ordre=asc&limit=200')).body.data;
  const avec = ech.filter((d) => d.echeance_courante);
  for (let i = 1; i < avec.length; i += 1) assert.ok(avec[i - 1].echeance_courante <= avec[i].echeance_courante, 'échéance croissante');
  assert.ok(ech.findIndex((d) => !d.echeance_courante) === -1 || ech.slice(ech.findIndex((d) => !d.echeance_courante)).every((d) => !d.echeance_courante), 'sans échéance en fin');
  const prio = (await gest.get('/api/demandes?perimetre=entite&ouvertes=1&tri=priorite&limit=200')).body.data.map((d) => d.priorite).filter(Boolean);
  assert.deepEqual(prio, [...prio].sort());
  const num = (await gest.get('/api/demandes?perimetre=entite&ouvertes=1&tri=numero&ordre=asc&limit=200')).body.data.map((d) => d.sequence);
  assert.deepEqual(num, [...num].sort((a, b) => a - b));
});

test('MCP : qualifier_demande et list_demandes filtrée, sous les mêmes droits ; canal mcp au journal', async () => {
  const d = await deposer(agent);
  const r = await call(gest, 'qualifier_demande', { id: d.id, categorie_id: C.eclairage, lieu_id: L.local, priorite: 'P3', duree_estimee_minutes: 30 });
  assert.equal(r.data.etat, 'qualifiee', JSON.stringify(r));
  assert.equal(journal(d.id).channel, 'mcp');
  assert.equal((await call(agent, 'qualifier_demande', { id: d.id, categorie_id: C.eclairage, lieu_id: L.local, priorite: 'P3' })).code, 'FORBIDDEN');
  const l = await call(gest, 'list_demandes', { perimetre: 'entite', etats: 'qualifiee', tri: 'echeance' });
  assert.ok(l.data.rows.length > 0 && l.data.rows.every((x) => x.etat === 'qualifiee'));
});

test('migration 008 et démarrage : les échéances des demandes qui n’en ont pas sont calculées, une seule fois', () => {
  const db = getDb();
  const id = db.prepare('SELECT id FROM demandes ORDER BY id LIMIT 1').get().id;
  db.prepare('UPDATE demandes SET prise_en_charge_le = NULL, echeance_le = NULL, priorite_proposee = NULL WHERE id = ?').run(id);
  assert.equal(qualification.completerEcheances(db), 1, 'une demande complétée');
  const l = ligne(id);
  assert.ok(l.prise_en_charge_le && l.echeance_le);
  assert.equal(l.priorite_proposee, l.priorite, 'priorité proposée reprise de la priorité');
  const avant = db.prepare('SELECT id, prise_en_charge_le, echeance_le FROM demandes ORDER BY id').all();
  assert.equal(qualification.completerEcheances(db), 0, 'seconde passe : rien à compléter');
  assert.deepEqual(db.prepare('SELECT id, prise_en_charge_le, echeance_le FROM demandes ORDER BY id').all(), avant, 'seconde passe : rien ne change');
});
