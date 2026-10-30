/**
 * Demandes d'intervention côté demandeur (DEM-01 à 03, SUI-01, SEC-02, REF-04, NUM-01 à 05 ; DV-39 à DV-46).
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { getDb } = require('../src/database');
const { anneeLocale } = require('../src/services/numerotation');

let srv;
let admin;
let ea;
let eb;
let agent;
let agent2;
let gestA;
let respA;
let gestB;
const L = {};
const C = {};
const AN = anneeLocale();
const parse = (r) => JSON.parse(r.body.result.content[0].text);
const call = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));
const deposer = (c, extra = {}) => c.post('/api/demandes', { lieu_id: L.local, categorie_id: C.nature, description: 'La lampe du bureau ne s’allume plus.', ...extra });

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  agent = await person(srv.base, admin, 'agent.dem@exemple.test', ea.id);
  agent2 = await person(srv.base, admin, 'agent2.dem@exemple.test', ea.id);
  gestA = await person(srv.base, admin, 'gest.dem@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  respA = await person(srv.base, admin, 'resp.dem@exemple.test', ea.id, [[ea.id, 'responsable']]);
  gestB = await person(srv.base, admin, 'gestb.dem@exemple.test', eb.id, [[eb.id, 'gestionnaire']]);
  const lieu = async (c, body) => { const r = await c.post('/api/lieux', body); assert.equal(r.status, 201, JSON.stringify(r.body)); return r.body.data.id; };
  L.site = await lieu(gestA, { nature: 'site', code: 'MC', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis', adresse: 'Place fictive 1' });
  L.bat = await lieu(gestA, { nature: 'batiment', parent_id: L.site, code: 'MC-A', nom_fr: 'Aile A', nom_nl: 'Vleugel A' });
  const type = (await gestA.get('/api/listes-valeurs?liste=type_lieu')).body.data[0].id;
  L.local = await lieu(gestA, { nature: 'local', parent_id: L.bat, code: 'MC-A-12', nom_fr: 'Bureau 12', nom_nl: 'Bureau 12', type_id: type });
  L.autre = await lieu(gestA, { nature: 'local', parent_id: L.bat, code: 'MC-A-14', nom_fr: 'Bureau 14', nom_nl: 'Bureau 14', type_id: type });
  L.inactif = await lieu(gestA, { nature: 'local', parent_id: L.bat, code: 'MC-A-99', nom_fr: 'Ancien local', nom_nl: 'Oud lokaal', type_id: type });
  assert.equal((await gestA.del(`/api/lieux/${L.inactif}`, { motif: 'Désaffecté' })).status, 200);
  L.b = await lieu(gestB, { nature: 'site', code: 'MC', nom_fr: 'Site B', nom_nl: 'Site B' });
  C.nature = (await agent.get('/api/categories?niveau=nature&q=eclairage')).body.data[0].id;
  C.domaine = (await agent.get('/api/categories?niveau=domaine')).body.data[0].id;
  C.seul = (await respA.post('/api/categories', { code: 'divers_seul', libelle_fr: 'Divers', libelle_nl: 'Diversen', priorite_defaut: 'P4', validation: 0 })).body.data.id;
  C.inactive = (await agent.get('/api/categories?niveau=nature&limit=200')).body.data.find((c) => c.id !== C.nature).id;
  assert.equal((await respA.del(`/api/categories/${C.inactive}`, { motif: 'Plus utilisée' })).status, 200);
  C.b = (await gestB.get('/api/categories?niveau=nature&q=eclairage')).body.data[0].id;
});
after(() => srv.stop());

test('dépôt par un agent : numéro, état « À qualifier », priorité proposée, lieu et son chemin, délai annoncé, journal', async () => {
  const r = await deposer(agent, { description: '   La lampe du bureau 12 ne s’allume plus.  ' });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const d = r.body.data;
  assert.equal(d.numero, `AA-DI-${AN}-00001`);
  assert.equal(d.etat, 'a_qualifier');
  assert.equal(d.ouverte, 1);
  assert.equal(d.canal, 'ecran');
  assert.equal(d.langue, 'fr');
  assert.equal(d.description, 'La lampe du bureau 12 ne s’allume plus.', 'espaces retirés (DV-37)');
  assert.match(d.priorite, /^P[1-4]$/);
  assert.equal(d.demandeur_id, agent.id);
  assert.deepEqual(d.lieu_chemin.map((l) => l.code), ['MC', 'MC-A', 'MC-A-12']);
  assert.ok(d.categorie_libelle_fr && d.categorie_libelle_nl && d.domaine_libelle_fr);
  assert.ok(d.delai_annonce, 'délai annoncé');
  assert.equal(d.delai_annonce.priorite, d.priorite);
  assert.ok(d.delai_annonce.fin_le || d.delai_annonce.date_convenue);
  const j = getDb().prepare("SELECT * FROM audit_log WHERE action = 'demande.create' AND entity_id = ?").get(d.id);
  assert.equal(j.entite_id, ea.id);
  assert.deepEqual(Object.keys(JSON.parse(j.details_json)).sort(), ['beneficiaire_id', 'beneficiaire_texte', 'categorie_id', 'danger', 'date_souhaitee', 'lieu_id', 'numero', 'pieces', 'priorite', 'reponses'], 'pas de description au journal');
});

test('validation : description de 10 caractères au moins après retrait des espaces, champs connus seulement', async () => {
  assert.equal((await deposer(agent, { description: 'Trop court' })).status, 201, '10 caractères : accepté');
  for (const corps of [
    { description: 'Neuf car.' },
    { description: '   court    ' },
    { description: '            ' },
    { etat: 'cloturee' },
    { priorite: 'P1' },
    { numero: 'AA-DI-2000-00001' },
    { langue: 'en' },
  ]) {
    const r = await deposer(agent, corps);
    assert.equal(r.status, 400, JSON.stringify(corps));
    assert.equal(r.body.code, 'VALIDATION');
  }
  assert.equal((await agent.post('/api/demandes', { categorie_id: C.nature, description: 'Sans lieu indiqué' })).status, 400);
});

test('lieu : un seul, actif, de l’entité active (DV-39)', async () => {
  const inactif = await deposer(agent, { lieu_id: L.inactif });
  assert.equal(inactif.status, 409);
  assert.equal(inactif.body.code, 'DEMANDE_LIEU_INACTIF');
  assert.equal((await deposer(agent, { lieu_id: L.b })).status, 403, 'lieu de l’autre entité');
  assert.equal((await deposer(agent, { lieu_id: 999999 })).status, 404);
  assert.equal((await deposer(agent, { lieu_id: [L.local, L.autre] })).status, 400, 'pas de liste de lieux');
  assert.equal((await deposer(agent, { lieu_id: L.site })).status, 201, 'un site convient aussi (cour, parking)');
});

test('catégorie : une nature, ou un domaine sans nature ; active ; de l’entité active', async () => {
  const domaine = await deposer(agent, { categorie_id: C.domaine });
  assert.equal(domaine.status, 409);
  assert.equal(domaine.body.code, 'DEMANDE_CATEGORIE_A_PRECISER');
  assert.equal((await deposer(agent, { categorie_id: C.seul })).status, 201);
  const inactive = await deposer(agent, { categorie_id: C.inactive });
  assert.equal(inactive.status, 409);
  assert.equal(inactive.body.code, 'DEMANDE_CATEGORIE_INACTIVE');
  assert.equal((await deposer(agent, { categorie_id: C.b })).status, 403);
});

test('les refus ne consomment aucun numéro (NUM-04)', async () => {
  const n = getDb().prepare('SELECT COUNT(*) AS n FROM demandes WHERE entite_id = ?').get(ea.id).n;
  const r = await deposer(agent);
  assert.equal(r.body.data.numero, `AA-DI-${AN}-${String(n + 1).padStart(5, '0')}`);
});

test('« Mes demandes » : seulement les siennes, ouvertes en tête ; la demande d’un autre agent répond 403 (SUI-01, SEC-02)', async () => {
  const autre = (await deposer(agent2, { description: 'Fenêtre bloquée au bureau 14.', lieu_id: L.autre })).body.data;
  const mes = await agent.get('/api/demandes');
  assert.equal(mes.status, 200);
  assert.ok(mes.body.data.length >= 4);
  assert.ok(mes.body.data.every((d) => d.demandeur_id === agent.id));
  assert.equal((await agent.get(`/api/demandes/${autre.id}`)).status, 403);
  assert.equal((await agent2.get('/api/demandes')).body.data.length, 1);

  const premiere = mes.body.data.at(-1);
  getDb().prepare("UPDATE demandes SET etat = 'cloturee' WHERE id = ?").run(mes.body.data[0].id);
  const apres = (await agent.get('/api/demandes')).body.data;
  assert.equal(apres.at(-1).etat, 'cloturee', 'une demande close passe après les ouvertes');
  assert.equal(apres.at(-1).ouverte, 0);
  assert.equal(apres[0].ouverte, 1);
  assert.equal((await agent.get('/api/demandes?ouvertes=0')).body.data.length, 1);
  assert.equal((await agent.get(`/api/demandes?q=${encodeURIComponent(premiere.numero)}`)).body.data[0].id, premiere.id, 'recherche par numéro');
  assert.equal((await agent.get('/api/demandes?q=bureau%2014')).body.data.length, 0, 'recherche limitée aux siennes');
});

test('« Demandes de l’entité » : gestionnaire et responsable en lecture, demandeur refusé (DV-46)', async () => {
  assert.equal((await agent.get('/api/demandes?perimetre=entite')).status, 403);
  const g = await gestA.get('/api/demandes?perimetre=entite');
  assert.equal(g.status, 200);
  const demandeurs = new Set(g.body.data.map((d) => d.demandeur_id));
  assert.ok(demandeurs.has(agent.id) && demandeurs.has(agent2.id));
  assert.ok(g.body.data.every((d) => d.entite_id === ea.id));
  assert.ok(g.body.data[0].demandeur_nom, 'nom du demandeur visible du service');
  const une = g.body.data.find((d) => d.demandeur_id === agent2.id);
  assert.equal((await respA.get(`/api/demandes/${une.id}`)).status, 200);
  assert.equal((await gestB.get(`/api/demandes/${une.id}`)).status, 403, 'autre entité');
  assert.equal((await gestB.get('/api/demandes?perimetre=entite')).body.data.length, 0);
});

test('aucune modification ni suppression en 0.5.0 (étape 9)', async () => {
  const d = (await agent.get('/api/demandes')).body.data[0];
  assert.equal((await agent.put(`/api/demandes/${d.id}`, { description: 'Modifiée après coup' })).status, 404);
  assert.equal((await agent.del(`/api/demandes/${d.id}`, { motif: 'x' })).status, 404);
  assert.equal((await gestA.put(`/api/demandes/${d.id}`, { etat: 'cloturee' })).status, 404);
});

test('MCP : dépôt au nom de la personne, canal mcp, mêmes contrôles et mêmes droits', async () => {
  const r = await call(agent, 'create_demande', { lieu_id: L.local, categorie_id: C.nature, description: ' Radiateur froid au bureau 12. ' });
  assert.match(r.data.numero, new RegExp(`^AA-DI-${AN}-\\d{5}$`));
  assert.equal(r.data.canal, 'mcp');
  assert.equal(r.data.description, 'Radiateur froid au bureau 12.');
  assert.equal(getDb().prepare("SELECT channel FROM audit_log WHERE action = 'demande.create' AND entity_id = ?").get(r.data.id).channel, 'mcp');
  assert.equal((await call(agent, 'create_demande', { lieu_id: L.local, categorie_id: C.nature, description: '   ' })).code, 'VALIDATION');
  assert.equal((await call(agent, 'create_demande', { lieu_id: L.inactif, categorie_id: C.nature, description: 'Lieu désactivé, refus attendu' })).code, 'DEMANDE_LIEU_INACTIF');
  const liste = await call(agent, 'list_demandes', { ouvertes: 1 });
  assert.ok(liste.data.rows.every((d) => d.demandeur_id === agent.id && d.ouverte === 1));
  const autre = (await agent2.get('/api/demandes')).body.data[0];
  assert.equal((await call(agent, 'get_demande', { id: autre.id })).code, 'FORBIDDEN');
  assert.equal((await call(agent, 'list_demandes', { perimetre: 'entite' })).code, 'FORBIDDEN');
  assert.equal((await call(gestA, 'list_demandes', { perimetre: 'entite' })).data.pagination.total, getDb().prepare('SELECT COUNT(*) AS n FROM demandes WHERE entite_id = ?').get(ea.id).n);
});

test('envois simultanés par l’API : numéros tous différents et consécutifs (NUM-04)', async () => {
  const res = await Promise.all(Array.from({ length: 20 }, (_, i) => deposer(agent2, { description: `Envoi simultané numéro ${i}` })));
  assert.ok(res.every((r) => r.status === 201));
  const rangs = res.map((r) => r.body.data.sequence).sort((a, b) => a - b);
  assert.equal(new Set(res.map((r) => r.body.data.numero)).size, 20);
  for (let i = 1; i < rangs.length; i += 1) assert.equal(rangs[i], rangs[i - 1] + 1);
});

test('lieu proposé d’office : habituel, sinon celui de la dernière demande (REF-04, DV-42)', async () => {
  const nouveau = await person(srv.base, admin, 'nouveau.dem@exemple.test', ea.id);
  assert.equal((await nouveau.get('/api/auth/me')).body.data.lieu_propose, null, 'rien à proposer');
  await deposer(nouveau, { lieu_id: L.autre });
  let p = (await nouveau.get('/api/auth/me')).body.data.lieu_propose;
  assert.equal(p.id, L.autre);
  assert.equal(p.source, 'derniere_demande');
  assert.deepEqual(p.chemin.map((l) => l.code), ['MC', 'MC-A', 'MC-A-14']);

  const choisi = await nouveau.put('/api/auth/lieu-habituel', { lieu_id: L.local });
  assert.equal(choisi.status, 200);
  assert.equal(choisi.body.data.lieu_habituel_id, L.local);
  assert.equal(choisi.body.data.lieu_propose.source, 'habituel');
  assert.equal(choisi.body.data.lieu_propose.id, L.local);
  const j = getDb().prepare("SELECT details_json FROM audit_log WHERE action = 'user.lieu_habituel' AND user_id = ? ORDER BY id DESC").get(nouveau.id);
  assert.deepEqual(JSON.parse(j.details_json), { avant: null, apres: L.local });

  for (const lieu of [L.b, L.inactif, 999999]) {
    const r = await nouveau.put('/api/auth/lieu-habituel', { lieu_id: lieu });
    assert.equal(r.status, 409, `lieu ${lieu}`);
    assert.equal(r.body.code, 'LIEU_HABITUEL_INVALIDE');
  }
  assert.equal((await nouveau.put('/api/auth/lieu-habituel', {})).status, 400);

  p = (await nouveau.put('/api/auth/lieu-habituel', { lieu_id: null })).body.data;
  assert.equal(p.lieu_habituel_id, null);
  assert.equal(p.lieu_propose.source, 'derniere_demande');

  const m = await call(nouveau, 'set_lieu_habituel', { lieu_id: L.site });
  assert.equal(m.data.lieu_propose.id, L.site);
});

test('lieu habituel réglé par l’administrateur sur la fiche du compte', async () => {
  const cible = (await admin.get('/api/users?q=agent2.dem')).body.data[0];
  const r = await admin.put(`/api/users/${cible.id}`, { lieu_habituel_id: L.autre });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.lieu_habituel_id, L.autre);
  assert.equal((await agent2.get('/api/auth/me')).body.data.lieu_propose.source, 'habituel');
  const ko = await admin.put(`/api/users/${cible.id}`, { lieu_habituel_id: L.b });
  assert.equal(ko.status, 409, 'agent2 n’a pas de rôle dans l’autre entité');
  assert.equal((await admin.put(`/api/users/${cible.id}`, { lieu_habituel_id: null })).body.data.lieu_habituel_id, null);
});

test('un lieu habituel de l’autre entité n’est pas proposé dans l’entité active', async () => {
  const multi = await person(srv.base, admin, 'multi.dem@exemple.test', ea.id, [[eb.id, 'agent']]);
  assert.equal((await multi.put('/api/auth/lieu-habituel', { lieu_id: L.b })).status, 200, 'rôle dans BB : admis');
  assert.equal((await multi.get('/api/auth/me')).body.data.lieu_propose, null, 'AA active : rien à proposer');
  await multi.put('/api/auth/entite', { entite_id: eb.id });
  assert.equal((await multi.get('/api/auth/me')).body.data.lieu_propose.id, L.b);
});
