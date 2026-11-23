/**
 * Formulaire de demande complet (version 0.7.0, étape 7) : case « Danger » (DEM-06), « Pour » (DEM-07), date souhaitée
 * et créneau (DEM-08), brouillon (DEM-11), questions propres à la catégorie (DEM-05) ; les mentions RGPD s'ajouteront ici.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { getDb } = require('../src/database');

let srv;
let admin;
let ea;
let agent;
let gestA;
let respA;
let collegue;
let gestB;
let eb;
const L = {};
const C = {};
const parse = (r) => JSON.parse(r.body.result.content[0].text);
const call = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  agent = await person(srv.base, admin, 'agent.form@exemple.test', ea.id);
  gestA = await person(srv.base, admin, 'gest.form@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  respA = await person(srv.base, admin, 'resp.form@exemple.test', ea.id, [[ea.id, 'responsable']]);
  collegue = await person(srv.base, admin, 'collegue.form@exemple.test', ea.id);
  await admin.put(`/api/users/${collegue.id}`, { first_name: 'Hélène', last_name: 'Dupré' });
  gestB = await person(srv.base, admin, 'gestb.form@exemple.test', eb.id, [[eb.id, 'gestionnaire']]);
  await admin.put(`/api/users/${gestB.id}`, { first_name: 'Hélène', last_name: 'Autre-Entité' });
  const r = await gestA.post('/api/lieux', { nature: 'site', code: 'MC', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis' });
  L.site = r.body.data.id;
  C.p4 = (await respA.post('/api/categories', { code: 'divers_p4', libelle_fr: 'Divers', libelle_nl: 'Diversen', priorite_defaut: 'P4', validation: 0 })).body.data.id;
});
after(() => srv.stop());

test('danger : téléphone d’urgence de l’entité au profil, sinon celui du service, sinon rien', async () => {
  assert.equal((await agent.get('/api/auth/me')).body.data.telephone_urgence, null);
  assert.equal((await respA.put('/api/parametres-entite/contact.telephone', { valeur: '02 464 04 11' })).status, 200);
  assert.equal((await agent.get('/api/auth/me')).body.data.telephone_urgence, '02 464 04 11');
  assert.equal((await respA.put('/api/parametres-entite/urgence.telephone', { valeur: '0476 00 00 00' })).status, 200);
  assert.equal((await agent.get('/api/auth/me')).body.data.telephone_urgence, '0476 00 00 00');
  assert.equal((await call(agent, 'get_profile')).data.telephone_urgence, '0476 00 00 00');
});

test('danger : la demande part en P1 quelle que soit la catégorie ; le demandeur ne reçoit pas d’heure promise', async () => {
  const r = await agent.post('/api/demandes', { lieu_id: L.site, categorie_id: C.p4, description: 'Câble électrique à nu dans le couloir.', danger: 1 });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const d = r.body.data;
  assert.equal(d.danger, 1);
  assert.equal(d.priorite, 'P1');
  assert.equal(d.delai_annonce, null, 'pas d’heure promise au demandeur');
  const g = (await gestA.get(`/api/demandes/${d.id}`)).body.data;
  assert.equal(g.danger, 1);
  assert.equal(g.delai_annonce.priorite, 'P1', 'le service technique garde l’échéance P1');
  assert.ok(g.delai_annonce.fin_le);
  const j = getDb().prepare("SELECT details_json FROM audit_log WHERE action = 'demande.create' AND entity_id = ?").get(d.id);
  assert.deepEqual(JSON.parse(j.details_json).danger, 1);
  assert.equal(JSON.parse(j.details_json).priorite, 'P1');
});

test('sans danger : priorité de la catégorie, délai annoncé ; valeur autre que 0 ou 1 refusée', async () => {
  const d = (await agent.post('/api/demandes', { lieu_id: L.site, categorie_id: C.p4, description: 'Une étagère à fixer au mur.' })).body.data;
  assert.equal(d.danger, 0);
  assert.equal(d.priorite, 'P4');
  assert.ok(d.delai_annonce);
  assert.equal((await agent.post('/api/demandes', { lieu_id: L.site, categorie_id: C.p4, description: 'Valeur de danger invalide.', danger: 2 })).status, 400);
});

test('danger par le MCP : mêmes règles ; la liste des demandes du bâtiment montre la mention', async () => {
  const r = await call(agent, 'create_demande', { lieu_id: L.site, categorie_id: C.p4, description: 'Odeur de gaz près de la chaufferie.', danger: 1 });
  assert.equal(r.data.priorite, 'P1');
  assert.equal(r.data.canal, 'mcp');
  const v = (await agent.get(`/api/demandes/voisines?lieu_id=${L.site}`)).body.data;
  assert.equal(v.demandes.find((x) => x.id === r.data.id).danger, 1);
  const mes = (await agent.get('/api/demandes')).body.data;
  assert.equal(mes.find((x) => x.id === r.data.id).delai_annonce, null);
});

const jour = (decalage) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date(Date.now() + decalage * 86400000));

test('« Pour » : recherche d’un collègue de l’entité, sans accents, prénom et nom seulement, ni soi ni l’autre entité', async () => {
  const r = await agent.get('/api/demandes/beneficiaires?q=helene');
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body.data, [{ id: collegue.id, prenom: 'Hélène', nom: 'Dupré' }]);
  assert.equal((await agent.get('/api/demandes/beneficiaires?q=h')).status, 400, '2 caractères au moins');
  const moi = (await agent.get('/api/demandes/beneficiaires?q=prenom')).body.data;
  assert.ok(!moi.some((x) => x.id === agent.id), 'jamais soi-même');
  assert.equal((await call(agent, 'list_beneficiaires', { q: 'dupre' })).data[0].id, collegue.id);
});

test('« Pour » un collègue : il lit la demande dans « Mes demandes », avec le nom de qui l’a déposée ; journal sans texte libre', async () => {
  const r = await agent.post('/api/demandes', { lieu_id: L.site, categorie_id: C.p4, description: 'Chaise cassée au bureau d’Hélène.', beneficiaire_id: collegue.id });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.data.beneficiaire_id, collegue.id);
  assert.equal(r.body.data.beneficiaire_nom, 'Dupré');
  const mes = (await collegue.get('/api/demandes')).body.data;
  const d = mes.find((x) => x.id === r.body.data.id);
  assert.ok(d, 'dans « Mes demandes » du collègue');
  assert.equal(d.pour_moi, 1);
  assert.equal(d.suivie, 0);
  assert.ok(d.demandeur_nom, 'le bénéficiaire voit qui a déposé pour lui');
  assert.equal((await collegue.get(`/api/demandes/${d.id}`)).status, 200);
  assert.equal((await collegue.post(`/api/demandes/${d.id}/suivre`, {})).body.code, 'DEMANDE_PROPRE');
  const j = getDb().prepare("SELECT details_json FROM audit_log WHERE action = 'demande.create' AND entity_id = ?").get(d.id);
  assert.equal(JSON.parse(j.details_json).beneficiaire_id, collegue.id);
});

test('« Pour » un service ou une personne sans compte : texte libre, sans notification ; jamais au journal', async () => {
  const r = await agent.post('/api/demandes', { lieu_id: L.site, categorie_id: C.p4, description: 'Prise murale arrachée au guichet.', beneficiaire_texte: '  Service Population  ' });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.data.beneficiaire_texte, 'Service Population');
  assert.equal(r.body.data.beneficiaire_id, null);
  const j = getDb().prepare("SELECT details_json FROM audit_log WHERE action = 'demande.create' AND entity_id = ?").get(r.body.data.id);
  assert.doesNotMatch(j.details_json, /Population/);
  assert.equal(JSON.parse(j.details_json).beneficiaire_texte, 1);
});

test('« Pour » refusé : soi-même, un compte de l’autre entité, un compte inconnu, les deux à la fois ; aucun numéro consommé', async () => {
  const avant = (await gestA.get('/api/demandes?perimetre=entite')).body.pagination.total;
  const base = { lieu_id: L.site, categorie_id: C.p4, description: 'Demande refusée pour le bénéficiaire.' };
  for (const extra of [{ beneficiaire_id: agent.id }, { beneficiaire_id: gestB.id }, { beneficiaire_id: 999999 }]) {
    const r = await agent.post('/api/demandes', { ...base, ...extra });
    assert.equal(r.status, 409, JSON.stringify(extra));
    assert.equal(r.body.code, 'BENEFICIAIRE_INVALIDE');
  }
  const deux = await agent.post('/api/demandes', { ...base, beneficiaire_id: collegue.id, beneficiaire_texte: 'Service Population' });
  assert.equal(deux.body.code, 'BENEFICIAIRE_DOUBLE');
  assert.equal((await agent.post('/api/demandes', { ...base, beneficiaire_texte: 'x'.repeat(201) })).status, 400);
  assert.equal((await gestA.get('/api/demandes?perimetre=entite')).body.pagination.total, avant);
});

test('date souhaitée et créneau : d’aujourd’hui à un an, rendus sur la fiche ; date passée ou trop lointaine refusée', async () => {
  const base = { lieu_id: L.site, categorie_id: C.p4, description: 'Repeindre le mur du couloir.' };
  const r = await agent.post('/api/demandes', { ...base, date_souhaitee: jour(7), creneau: '  pas pendant les permanences du mardi matin ' });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.data.date_souhaitee, jour(7));
  assert.equal(r.body.data.creneau, 'pas pendant les permanences du mardi matin');
  assert.ok(r.body.data.delai_annonce, 'le délai de la priorité reste annoncé');
  assert.equal((await agent.post('/api/demandes', { ...base, date_souhaitee: jour(0) })).status, 201, 'aujourd’hui admis');
  for (const d of [jour(-1), jour(400)]) {
    const k = await agent.post('/api/demandes', { ...base, date_souhaitee: d });
    assert.equal(k.status, 409, d);
    assert.equal(k.body.code, 'DATE_SOUHAITEE_INVALIDE');
  }
  assert.equal((await agent.post('/api/demandes', { ...base, date_souhaitee: '31/12/2026' })).status, 400);
  const mcp = await call(agent, 'create_demande', { ...base, date_souhaitee: jour(3), beneficiaire_id: collegue.id });
  assert.equal(mcp.data.date_souhaitee, jour(3));
  assert.equal(mcp.data.beneficiaire_id, collegue.id);
});

test('une personne qui suit seulement la demande ne reçoit ni le demandeur ni le bénéficiaire', async () => {
  const r = await agent.post('/api/demandes', { lieu_id: L.site, categorie_id: C.p4, description: 'Store bloqué dans la salle.', beneficiaire_texte: 'Mme Martin, accueil' });
  const autre = await person(srv.base, admin, 'autre.form@exemple.test', ea.id);
  const s = (await autre.post(`/api/demandes/${r.body.data.id}/suivre`, {})).body.data;
  assert.equal(s.beneficiaire_texte, null);
  assert.equal(s.beneficiaire_id, null);
  assert.equal(s.demandeur_nom, null);
  const g = (await gestA.get(`/api/demandes/${r.body.data.id}`)).body.data;
  assert.equal(g.beneficiaire_texte, 'Mme Martin, accueil');
});

test('brouillon : enregistré puis relu tel quel par la personne seule ; une autre personne n’en voit rien', async () => {
  assert.equal((await agent.get('/api/demandes/brouillon')).body.data, null);
  const contenu = { danger: 1, lieu: { id: L.site, code: 'MC', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis', chemin: [{ id: L.site, code: 'MC', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis' }] },
    categorie: { id: C.p4, libelle_fr: 'Divers', libelle_nl: 'Diversen', icone: 'autre', domaine_fr: null, domaine_nl: null },
    description: 'La porte du local commence à', pour_mode: 'collegue', collegue: { id: collegue.id, prenom: 'Hélène', nom: 'Dupré' }, date_souhaitee: jour(5), creneau: 'après 16 h' };
  const r = await agent.put('/api/demandes/brouillon', { contenu });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const b = (await agent.get('/api/demandes/brouillon')).body.data;
  assert.deepEqual(b.contenu, contenu);
  assert.equal(b.entite_id, ea.id);
  assert.ok(b.updated_at);
  assert.equal((await collegue.get('/api/demandes/brouillon')).body.data, null, 'le brouillon d’un autre n’est jamais rendu');
  assert.equal((await gestA.get('/api/demandes/brouillon')).body.data, null);
  assert.equal(getDb().prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action LIKE '%brouillon%'").get().n, 0);
});

test('brouillon avec le lieu proposé d’office, tel que le profil le rend (défaut de recette 0.7.0, corrigé en 0.7.1)', async () => {
  assert.equal((await agent.put('/api/auth/lieu-habituel', { lieu_id: L.site })).status, 200);
  const propose = (await agent.get('/api/auth/me')).body.data.lieu_propose;
  assert.equal(propose.source, 'habituel');
  assert.ok(propose.nature, 'le profil rend la nature du lieu');
  const r = await agent.put('/api/demandes/brouillon', { contenu: { lieu: propose, description: 'Lieu proposé d’office.' } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual((await agent.get('/api/demandes/brouillon')).body.data.contenu.lieu, propose);
  assert.equal((await agent.put('/api/demandes/brouillon', { contenu: { lieu: { ...propose, inconnu: 1 } } })).status, 400, 'un autre champ reste refusé');
  assert.equal((await agent.put('/api/auth/lieu-habituel', { lieu_id: null })).status, 200);
});

test('brouillon : remplacé, jamais doublé ; champs inconnus et texte trop long refusés', async () => {
  await agent.put('/api/demandes/brouillon', { contenu: { description: 'Deuxième version du brouillon.' } });
  assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM brouillons WHERE user_id = ?').get(agent.id).n, 1);
  assert.equal((await agent.get('/api/demandes/brouillon')).body.data.contenu.description, 'Deuxième version du brouillon.');
  assert.equal((await agent.put('/api/demandes/brouillon', { contenu: { inconnu: 1 } })).status, 400);
  assert.equal((await agent.put('/api/demandes/brouillon', { contenu: { description: 'x'.repeat(5001) } })).status, 400);
  assert.equal((await agent.put('/api/demandes/brouillon', {})).status, 400);
});

test('brouillon : à la reprise, lieu désactivé, catégorie désactivée et collègue d’une autre entité sont retirés', async () => {
  const local = (await gestA.post('/api/lieux', { nature: 'site', code: 'TMP', nom_fr: 'Provisoire', nom_nl: 'Voorlopig' })).body.data.id;
  const cat = (await respA.post('/api/categories', { code: 'tmp_brouillon', libelle_fr: 'Provisoire', libelle_nl: 'Voorlopig', priorite_defaut: 'P4', validation: 0 })).body.data.id;
  await agent.put('/api/demandes/brouillon', { contenu: { lieu: { id: local }, categorie: { id: cat }, collegue: { id: gestB.id, prenom: 'X', nom: 'Y' }, description: 'Texte gardé.' } });
  assert.equal((await gestA.del(`/api/lieux/${local}`, { motif: 'Essai' })).status, 200);
  assert.equal((await respA.del(`/api/categories/${cat}`, { motif: 'Essai' })).status, 200);
  const c = (await agent.get('/api/demandes/brouillon')).body.data.contenu;
  assert.equal(c.lieu, null);
  assert.equal(c.categorie, null);
  assert.equal(c.collegue, null);
  assert.equal(c.description, 'Texte gardé.');
});

test('brouillon : effacé à l’envoi d’une demande, par « Recommencer à zéro », et au bout de 30 jours', async () => {
  await agent.put('/api/demandes/brouillon', { contenu: { description: 'Avant envoi.' } });
  assert.equal((await agent.post('/api/demandes', { lieu_id: L.site, categorie_id: C.p4, description: 'Demande qui efface le brouillon.' })).status, 201);
  assert.equal((await agent.get('/api/demandes/brouillon')).body.data, null);
  await agent.put('/api/demandes/brouillon', { contenu: { description: 'À effacer.' } });
  assert.deepEqual((await agent.del('/api/demandes/brouillon')).body.data, { efface: 1, pieces: 0 });
  assert.deepEqual((await agent.del('/api/demandes/brouillon')).body.data, { efface: 0, pieces: 0 });
  await agent.put('/api/demandes/brouillon', { contenu: { description: 'Ancien.' } });
  getDb().prepare("UPDATE brouillons SET updated_at = datetime('now', '-31 days') WHERE user_id = ?").run(agent.id);
  assert.equal((await agent.get('/api/demandes/brouillon')).body.data, null);
  assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM brouillons WHERE user_id = ?').get(agent.id).n, 0);
});

test('brouillon : un par entité active ; par le MCP, mêmes règles et effacement en deux appels', async () => {
  const multi = await person(srv.base, admin, 'multi.form@exemple.test', ea.id, [[eb.id, 'agent']]);
  await multi.put('/api/auth/entite', { entite_id: ea.id });
  await multi.put('/api/demandes/brouillon', { contenu: { description: 'Brouillon AA.' } });
  await multi.put('/api/auth/entite', { entite_id: eb.id });
  assert.equal((await multi.get('/api/demandes/brouillon')).body.data, null, 'le brouillon de AA n’apparaît pas dans BB');
  await call(multi, 'save_brouillon', { contenu: { description: 'Brouillon BB.' } });
  assert.equal((await call(multi, 'get_brouillon')).data.contenu.description, 'Brouillon BB.');
  const prep = await call(multi, 'prepare_delete_brouillon');
  assert.ok(prep.data.confirmation_token);
  assert.equal((await call(multi, 'get_brouillon')).data.contenu.description, 'Brouillon BB.', 'rien n’est effacé avant la confirmation');
  assert.equal((await call(multi, 'confirm_delete_brouillon', { confirmation_token: prep.data.confirmation_token })).data.efface, 1);
  await multi.put('/api/auth/entite', { entite_id: ea.id });
  assert.equal((await multi.get('/api/demandes/brouillon')).body.data.contenu.description, 'Brouillon AA.');
});

/* ---------- Questions propres à la catégorie (DEM-05, 0.7.0, point 5) ---------- */

const cat = async (c, code) => (await c.get(`/api/categories?q=${code}&limit=200`)).body.data.find((x) => x.code === code);
const noeud = (arbre, code) => arbre.domaines.flatMap((d) => [d, ...d.natures]).find((x) => x.code === code);
const nbDemandes = () => getDb().prepare('SELECT COUNT(*) AS n FROM demandes').get().n;

test('questions livrées : plomberie, prises et chauffage dans chaque entité, « Valeur livrée », une nature reprend son domaine', async () => {
  for (const [c, code] of [[agent, 'AA'], [gestB, 'BB']]) {
    const n = getDb().prepare('SELECT COUNT(*) AS n FROM questions_categorie q JOIN entites e ON e.id = q.entite_id WHERE e.code = ?').get(code).n;
    assert.equal(n, 3, code);
    const arbre = (await c.get('/api/categories/arbre')).body.data;
    const fuite = noeud(arbre, 'fuite_eau');
    assert.deepEqual(fuite.questions.map((q) => [q.origine, q.type, q.question_fr]), [['domaine', 'oui_non', 'Y a-t-il de l\'eau au sol ?']]);
    assert.deepEqual(fuite.questions[0].reponses.map((r) => [r.valeur, r.fr, r.nl]), [['oui', 'Oui', 'Ja'], ['non', 'Non', 'Nee']]);
    const prises = noeud(arbre, 'prises');
    assert.deepEqual(prises.questions.map((q) => [q.origine, q.question_nl]), [['nature', 'Hoeveel stopcontacten?']]);
    assert.deepEqual(prises.questions[0].reponses.map((r) => r.valeur + r.fr), ['11', '22', '33', '4Plus']);
    assert.deepEqual(noeud(arbre, 'radiateur').questions[0].reponses.map((r) => r.fr), ['Tout le bâtiment', 'Un seul local']);
    assert.equal(noeud(arbre, 'eclairage').questions.length, 0);
  }
  const plomberie = await cat(respA, 'plomberie');
  const l = (await respA.get(`/api/categories/${plomberie.id}/questions`)).body;
  assert.equal(l.data[0].trace.etat, 'livree');
  assert.equal(l.data[0].obligatoire, 0, 'aucune question livrée n’est obligatoire');
  assert.equal(l.meta.max_actives, 10);
});

test('questions : lecture pour tout rôle de l’entité ; écriture réservée au responsable du service technique', async () => {
  assert.equal((await agent.get(`/api/categories/${C.p4}/questions`)).status, 200);
  const corps = { question_fr: 'Est-ce urgent ?', question_nl: 'Is het dringend?', type: 'oui_non' };
  assert.equal((await agent.post(`/api/categories/${C.p4}/questions`, corps)).status, 403);
  assert.equal((await gestA.post(`/api/categories/${C.p4}/questions`, corps)).status, 403, 'le gestionnaire ne règle pas les catégories');
  const r = await respA.post(`/api/categories/${C.p4}/questions`, corps);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.data.trace.etat, 'creee');
  assert.ok(r.body.data.trace.par);
  assert.equal((await agent.put(`/api/questions-categorie/${r.body.data.id}`, { obligatoire: 1 })).status, 403);
  assert.equal((await agent.del(`/api/questions-categorie/${r.body.data.id}`, { motif: 'x' })).status, 403);
  C.qUrgent = r.body.data.id;
});

test('questions : « oui ou non » sans réponses, « choix » de 2 à 6 réponses différentes, dix actives au plus', async () => {
  const url = `/api/categories/${C.p4}/questions`;
  const rep = (n) => Array.from({ length: n }, (_, i) => ({ fr: `R${i + 1}`, nl: `A${i + 1}` }));
  const err = async (body, status, code) => { const r = await respA.post(url, body); assert.equal(r.status, status, JSON.stringify(body)); if (code) assert.equal(r.body.code, code); };
  await err({ question_fr: 'x', question_nl: 'x', type: 'oui_non', reponses: rep(2) }, 409, 'QUESTION_REPONSES');
  await err({ question_fr: 'x', question_nl: 'x', type: 'choix' }, 409, 'QUESTION_REPONSES');
  await err({ question_fr: 'x', question_nl: 'x', type: 'choix', reponses: rep(1) }, 409, 'QUESTION_REPONSES');
  await err({ question_fr: 'x', question_nl: 'x', type: 'choix', reponses: rep(7) }, 400, 'VALIDATION');
  await err({ question_fr: 'x', question_nl: 'x', type: 'choix', reponses: [{ fr: 'Oui', nl: 'Ja' }, { fr: 'oui', nl: 'ja' }] }, 409, 'QUESTION_REPONSES');
  await err({ question_fr: 'x', question_nl: 'x', type: 'choix', reponses: [{ fr: 'A', nl: '' }, { fr: 'B', nl: 'B' }] }, 400, 'VALIDATION');
  await err({ question_fr: '   ', question_nl: 'x', type: 'oui_non' }, 400, 'VALIDATION');
  await err({ question_fr: 'x', question_nl: 'x', type: 'texte' }, 400, 'VALIDATION');
  await err({ question_fr: 'x', question_nl: 'x', type: 'oui_non', inconnu: 1 }, 400, 'VALIDATION');
  const choix = await respA.post(url, { question_fr: 'Combien de personnes ?', question_nl: 'Hoeveel personen?', type: 'choix', reponses: rep(6) });
  assert.equal(choix.status, 201);
  assert.deepEqual(choix.body.data.reponses.map((r) => r.valeur), ['1', '2', '3', '4', '5', '6']);
  // Changement de type : un choix devenu « oui ou non » perd ses réponses ; l'inverse exige des réponses.
  const id = choix.body.data.id;
  assert.equal((await respA.put(`/api/questions-categorie/${id}`, { type: 'oui_non' })).body.data.reponses.map((r) => r.valeur).join(), 'oui,non');
  assert.equal((await respA.put(`/api/questions-categorie/${id}`, { type: 'choix' })).body.code, 'QUESTION_REPONSES');
  assert.equal((await respA.put(`/api/questions-categorie/${id}`, { reponses: rep(2) })).body.code, 'QUESTION_REPONSES');
  assert.deepEqual((await respA.put(`/api/questions-categorie/${id}`, { type: 'choix', reponses: rep(3) })).body.data.reponses.map((r) => r.nl), ['A1', 'A2', 'A3']);
  // Dix actives au plus (deux déjà là).
  for (let i = 0; i < 8; i += 1) assert.equal((await respA.post(url, { question_fr: `Q${i}`, question_nl: `V${i}`, type: 'oui_non' })).status, 201);
  await err({ question_fr: 'Onzième', question_nl: 'Elfde', type: 'oui_non' }, 409, 'QUESTIONS_MAX');
  const toutes = (await respA.get(url)).body.data;
  for (const q of toutes.filter((x) => /^Q\d$/.test(x.question_fr))) await respA.del(`/api/questions-categorie/${q.id}`, { motif: 'Essai du plafond' });
  assert.equal((await respA.get(url)).body.data.length, 2);
  assert.equal((await respA.get(`${url}?inclure_inactives=1`)).body.data.length, 10);
  C.qChoix = id;
});

test('questions : ordre réglable, domaine d’abord puis nature ; désactivation avec motif, réactivation, journal', async () => {
  const fuite = await cat(respA, 'fuite_eau');
  const plomberie = await cat(respA, 'plomberie');
  const q1 = (await respA.post(`/api/categories/${fuite.id}/questions`, { question_fr: 'La fuite est-elle visible ?', question_nl: 'Is het lek zichtbaar?', type: 'oui_non', obligatoire: 1 })).body.data;
  const q2 = (await respA.post(`/api/categories/${fuite.id}/questions`, { question_fr: 'Où ?', question_nl: 'Waar?', type: 'choix', reponses: [{ fr: 'Plafond', nl: 'Plafond' }, { fr: 'Sol', nl: 'Vloer' }] })).body.data;
  let arbre = (await agent.get('/api/categories/arbre')).body.data;
  assert.deepEqual(noeud(arbre, 'fuite_eau').questions.map((q) => q.id), [noeud(arbre, 'plomberie').questions[0].id, q1.id, q2.id]);
  await respA.put(`/api/questions-categorie/${q2.id}`, { ordre: 1 });
  arbre = (await agent.get('/api/categories/arbre')).body.data;
  assert.deepEqual(noeud(arbre, 'fuite_eau').questions.slice(1).map((q) => q.id), [q2.id, q1.id], 'l’ordre de la nature change, le domaine reste en tête');
  // Désactivation : la question n'est plus posée ; une seconde désactivation et une modification sont refusées.
  assert.equal((await respA.del(`/api/questions-categorie/${q2.id}`, {})).status, 400, 'motif obligatoire');
  const d = await respA.del(`/api/questions-categorie/${q2.id}`, { motif: 'Peu utile' });
  assert.equal(d.body.data.is_active, 0);
  assert.equal(d.body.data.motif_desactivation, 'Peu utile');
  assert.equal((await respA.del(`/api/questions-categorie/${q2.id}`, { motif: 'x' })).body.code, 'CANCELLED');
  assert.equal((await respA.put(`/api/questions-categorie/${q2.id}`, { question_fr: 'x' })).body.code, 'CANCELLED');
  arbre = (await agent.get('/api/categories/arbre')).body.data;
  assert.ok(!noeud(arbre, 'fuite_eau').questions.some((q) => q.id === q2.id));
  const r = (await respA.put(`/api/questions-categorie/${q2.id}`, { is_active: 1 })).body.data;
  assert.equal(r.is_active, 1);
  assert.equal(r.motif_desactivation, null);
  await respA.del(`/api/questions-categorie/${q2.id}`, { motif: 'Peu utile' });
  // Une modification sans changement n'écrit rien au journal ; une modification garde avant et après.
  const avant = getDb().prepare("SELECT COUNT(*) AS n FROM audit_log WHERE entity_type = 'question_categorie'").get().n;
  await respA.put(`/api/questions-categorie/${q1.id}`, { question_fr: 'La fuite est-elle visible ?' });
  assert.equal(getDb().prepare("SELECT COUNT(*) AS n FROM audit_log WHERE entity_type = 'question_categorie'").get().n, avant);
  const plombQ = noeud(arbre, 'plomberie').questions[0].id;
  const m = (await respA.put(`/api/questions-categorie/${plombQ}`, { question_fr: 'Y a-t-il de l’eau par terre ?' })).body.data;
  assert.equal(m.trace.etat, 'modifiee');
  const j = JSON.parse(getDb().prepare("SELECT details_json FROM audit_log WHERE action = 'question_categorie.update' AND entity_id = ? ORDER BY id DESC").get(plombQ).details_json);
  assert.deepEqual(j, { categorie: 'plomberie', avant: { question_fr: 'Y a-t-il de l\'eau au sol ?' }, apres: { question_fr: 'Y a-t-il de l’eau par terre ?' } });
  const actions = new Set(getDb().prepare("SELECT action, entite_id, channel FROM audit_log WHERE entity_type = 'question_categorie'").all()
    .map((x) => { assert.equal(x.entite_id, ea.id); assert.equal(x.channel, 'api'); return x.action; }));
  for (const a of ['question_categorie.create', 'question_categorie.update', 'question_categorie.deactivate', 'question_categorie.reactivate']) assert.ok(actions.has(a), a);
  C.fuite = fuite.id; C.plomberie = plomberie.id; C.qVisible = q1.id; C.qOu = q2.id; C.qEau = plombQ;
});

test('dépôt : réponses enregistrées avec la demande, texte compris, lues par le demandeur et par le service technique', async () => {
  const r = await agent.post('/api/demandes', { lieu_id: L.site, categorie_id: C.fuite, description: 'Fuite sous l’évier de la cuisine.',
    reponses: [{ question_id: C.qVisible, valeur: 'oui' }, { question_id: C.qEau, valeur: 'non' }] });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const attendu = [
    { question_id: C.qEau, question_fr: 'Y a-t-il de l’eau par terre ?', question_nl: 'Ligt er water op de vloer?', valeur: 'non', reponse_fr: 'Non', reponse_nl: 'Nee' },
    { question_id: C.qVisible, question_fr: 'La fuite est-elle visible ?', question_nl: 'Is het lek zichtbaar?', valeur: 'oui', reponse_fr: 'Oui', reponse_nl: 'Ja' },
  ];
  assert.deepEqual(r.body.data.reponses, attendu, 'ordre du formulaire : domaine, puis nature');
  assert.deepEqual((await gestA.get(`/api/demandes/${r.body.data.id}`)).body.data.reponses, attendu);
  // Une question modifiée ensuite ne change pas la fiche.
  await respA.put(`/api/questions-categorie/${C.qVisible}`, { question_fr: 'Voyez-vous la fuite ?' });
  assert.equal((await agent.get(`/api/demandes/${r.body.data.id}`)).body.data.reponses[1].question_fr, 'La fuite est-elle visible ?');
  const j = JSON.parse(getDb().prepare("SELECT details_json FROM audit_log WHERE action = 'demande.create' AND entity_id = ?").get(r.body.data.id).details_json);
  assert.equal(j.reponses, 2);
  assert.doesNotMatch(JSON.stringify(j), /fuite|visible/i, 'le journal ne garde pas les textes');
  // Sans questions, la fiche rend une liste vide.
  const sans = await agent.post('/api/demandes', { lieu_id: L.site, categorie_id: (await cat(agent, 'eclairage')).id, description: 'Néon qui clignote au 2e étage.' });
  assert.deepEqual(sans.body.data.reponses, []);
});

test('dépôt refusé : obligatoire sans réponse, réponse non proposée, question d’une autre catégorie, désactivée ou en double ; aucun numéro consommé', async () => {
  const avant = nbDemandes();
  const base = { lieu_id: L.site, categorie_id: C.fuite, description: 'Fuite au plafond du hall.' };
  const essai = async (reponses, code) => {
    const r = await agent.post('/api/demandes', { ...base, reponses });
    assert.equal(r.status, 409, JSON.stringify(reponses));
    assert.equal(r.body.code, code);
    return r;
  };
  const o = await essai([], 'REPONSE_OBLIGATOIRE');
  assert.deepEqual(o.body.details, [`${C.qVisible}`]);
  await essai([{ question_id: C.qVisible, valeur: '1' }], 'REPONSE_INVALIDE');
  await essai([{ question_id: C.qVisible, valeur: 'oui' }, { question_id: C.qUrgent, valeur: 'oui' }], 'QUESTION_INVALIDE');
  await essai([{ question_id: C.qVisible, valeur: 'oui' }, { question_id: C.qOu, valeur: '1' }], 'QUESTION_INVALIDE');
  await essai([{ question_id: C.qVisible, valeur: 'oui' }, { question_id: C.qVisible, valeur: 'non' }], 'QUESTION_INVALIDE');
  assert.equal((await agent.post('/api/demandes', { ...base, reponses: [{ question_id: C.qVisible, valeur: 'peut-être' }] })).status, 400);
  // Un choix hors des réponses proposées (3 réponses : « 4 » n'existe pas).
  const r = await agent.post('/api/demandes', { lieu_id: L.site, categorie_id: C.p4, description: 'Choix hors des réponses.', reponses: [{ question_id: C.qChoix, valeur: '4' }] });
  assert.equal(r.body.code, 'REPONSE_INVALIDE');
  assert.equal(nbDemandes(), avant, 'aucune demande enregistrée');
  const ok = await agent.post('/api/demandes', { ...base, reponses: [{ question_id: C.qVisible, valeur: 'non' }] });
  assert.equal(ok.status, 201, 'obligatoire rempli, facultative laissée');
});

test('brouillon : réponses gardées ; à la reprise, celles d’une question désactivée ou d’une autre catégorie sont retirées', async () => {
  const contenu = { categorie: { id: C.fuite }, reponses: [{ question_id: C.qVisible, valeur: 'oui' }, { question_id: C.qEau, valeur: 'non' }] };
  assert.equal((await agent.put('/api/demandes/brouillon', { contenu })).status, 200);
  assert.deepEqual((await agent.get('/api/demandes/brouillon')).body.data.contenu.reponses, contenu.reponses);
  await agent.put('/api/demandes/brouillon', { contenu: { ...contenu, reponses: [...contenu.reponses, { question_id: C.qUrgent, valeur: 'oui' }] } });
  assert.deepEqual((await agent.get('/api/demandes/brouillon')).body.data.contenu.reponses, contenu.reponses, 'question d’une autre catégorie retirée');
  await respA.del(`/api/questions-categorie/${C.qVisible}`, { motif: 'Essai du brouillon' });
  assert.deepEqual((await agent.get('/api/demandes/brouillon')).body.data.contenu.reponses, [contenu.reponses[1]]);
  await respA.put(`/api/questions-categorie/${C.qVisible}`, { is_active: 1 });
  assert.equal((await agent.put('/api/demandes/brouillon', { contenu: { reponses: [{ question_id: 1, valeur: 'x' }] } })).status, 400);
  await agent.del('/api/demandes/brouillon');
});

test('questions par le MCP : lecture, création, modification et désactivation en deux appels ; dépôt avec réponses', async () => {
  const l = await call(agent, 'list_questions_categorie', { id: C.fuite });
  assert.ok(l.data.rows.some((q) => q.id === C.qVisible));
  assert.equal((await call(agent, 'get_question_categorie', { id: C.qVisible })).data.type, 'oui_non');
  assert.equal((await call(agent, 'create_question_categorie', { id: C.fuite, question_fr: 'x', question_nl: 'x', type: 'oui_non' })).code, 'FORBIDDEN');
  const c = await call(respA, 'create_question_categorie', { id: C.fuite, question_fr: 'Depuis quand ?', question_nl: 'Sinds wanneer?', type: 'choix',
    reponses: [{ fr: 'Aujourd’hui', nl: 'Vandaag' }, { fr: 'Plusieurs jours', nl: 'Meerdere dagen' }] });
  assert.equal(c.data.reponses.length, 2);
  assert.equal((await call(respA, 'update_question_categorie', { id: c.data.id, obligatoire: 1 })).data.obligatoire, 1);
  const d = await call(agent, 'create_demande', { lieu_id: L.site, categorie_id: C.fuite, description: 'Fuite signalée par le MCP.',
    reponses: [{ question_id: C.qVisible, valeur: 'oui' }, { question_id: c.data.id, valeur: '2' }] });
  assert.deepEqual(d.data.reponses.map((r) => r.reponse_fr), ['Oui', 'Plusieurs jours']);
  assert.equal((await call(agent, 'create_demande', { lieu_id: L.site, categorie_id: C.fuite, description: 'Sans la réponse obligatoire.', reponses: [{ question_id: C.qVisible, valeur: 'oui' }] })).code, 'REPONSE_OBLIGATOIRE');
  assert.equal((await call(agent, 'prepare_deactivate_question_categorie', { id: c.data.id, motif: 'x' })).code, 'FORBIDDEN');
  const p = await call(respA, 'prepare_deactivate_question_categorie', { id: c.data.id, motif: 'Essai MCP' });
  assert.equal(p.data.question.question_fr, 'Depuis quand ?');
  assert.equal((await call(respA, 'get_question_categorie', { id: c.data.id })).data.is_active, 1, 'rien avant la confirmation');
  assert.equal((await call(respA, 'confirm_deactivate_question_categorie', { confirmation_token: p.data.confirmation_token })).data.is_active, 0);
  assert.equal(getDb().prepare("SELECT channel FROM audit_log WHERE action = 'question_categorie.create' AND entity_id = ?").get(c.data.id).channel, 'mcp');
  const arbre = await call(agent, 'get_categories_arbre', {});
  assert.ok(noeud(arbre.data, 'fuite_eau').questions.length >= 2);
});

test('questions : une catégorie désactivée ne prend pas de question ; une question ne se réactive pas sous elle', async () => {
  const c = (await respA.post('/api/categories', { code: 'tmp_questions', libelle_fr: 'Provisoire', libelle_nl: 'Voorlopig', priorite_defaut: 'P4', validation: 0 })).body.data.id;
  const q = (await respA.post(`/api/categories/${c}/questions`, { question_fr: 'x ?', question_nl: 'x?', type: 'oui_non' })).body.data.id;
  await respA.del(`/api/questions-categorie/${q}`, { motif: 'Essai' });
  await respA.del(`/api/categories/${c}`, { motif: 'Essai' });
  assert.equal((await respA.post(`/api/categories/${c}/questions`, { question_fr: 'y ?', question_nl: 'y?', type: 'oui_non' })).body.code, 'DEMANDE_CATEGORIE_INACTIVE');
  assert.equal((await respA.put(`/api/questions-categorie/${q}`, { is_active: 1 })).body.code, 'DEMANDE_CATEGORIE_INACTIVE');
  assert.equal((await respA.get('/api/categories/999999/questions')).status, 404);
  assert.equal((await respA.get('/api/questions-categorie/999999')).status, 404);
});

/* ---------- Mentions d'information RGPD et contact du DPO (RGPD-10, 0.7.0, point 6) ---------- */

test('mentions RGPD livrées : courte et complète en FR et en NL, nom de l’entité, renvoi au responsable sans DPO', async () => {
  const p = (await agent.get('/api/auth/me')).body.data.protection_donnees;
  assert.match(p.mention_courte_fr, /^Vos données \(nom, service, téléphone professionnel et contenu de la demande\) servent uniquement/);
  assert.match(p.mention_courte_nl, /^Uw gegevens/);
  assert.match(p.mention_fr, /^Responsable du traitement : Administration fictive\. Les données de cette demande servent/);
  assert.match(p.mention_fr, /art\. 6\.1\.e/);
  assert.match(p.mention_fr, /délégué à la protection des données : adressez-vous à votre responsable\.$/);
  assert.match(p.mention_nl, /^Verwerkingsverantwoordelijke: Fictief bestuur\. /);
  assert.match(p.mention_nl, /wend u tot uw verantwoordelijke\.$/);
  assert.equal(p.dpo_contact, null);
  assert.doesNotMatch(JSON.stringify(p), /\{entite\}|\{dpo\}/, 'aucune variable laissée telle quelle');
});

test('mentions RGPD : réglées par le responsable, par entité ; variable inconnue et texte trop long refusés ; vide = texte livré', async () => {
  assert.equal((await agent.put('/api/parametres-entite/rgpd.dpo_contact', { valeur: 'x@exemple.test' })).status, 403);
  assert.equal((await respA.put('/api/parametres-entite/rgpd.dpo_contact', { valeur: 'dpo@exemple.test, 02 000 00 00' })).status, 200);
  const perso = 'Texte de {entite}. Contact : {dpo}.';
  assert.equal((await respA.put('/api/parametres-entite/rgpd.mention_fr', { valeur: perso })).status, 200);
  let p = (await agent.get('/api/auth/me')).body.data.protection_donnees;
  assert.equal(p.mention_fr, 'Texte de Administration fictive. Contact : dpo@exemple.test, 02 000 00 00.');
  assert.match(p.mention_nl, /dpo@exemple\.test, 02 000 00 00\.$/);
  assert.equal(p.dpo_contact, 'dpo@exemple.test, 02 000 00 00');
  const faute = await respA.put('/api/parametres-entite/rgpd.mention_fr', { valeur: 'Contact : {dp0}.' });
  assert.equal(faute.status, 400);
  assert.match(faute.body.details[0], /variable inconnue \{dp0\}/);
  assert.equal((await respA.put('/api/parametres-entite/rgpd.mention_courte_fr', { valeur: 'x'.repeat(501) })).status, 400);
  assert.equal((await respA.put('/api/parametres-entite/rgpd.mention_fr', { valeur: 'x'.repeat(3001) })).status, 400);
  assert.equal((await respA.put('/api/parametres-entite/rgpd.mention_fr', { valeur: 'x'.repeat(3000) })).status, 200);
  assert.equal((await respA.put('/api/parametres-entite/rgpd.mention_fr', { valeur: '   ' })).status, 200);
  p = (await agent.get('/api/auth/me')).body.data.protection_donnees;
  assert.match(p.mention_fr, /^Responsable du traitement : Administration fictive\./, 'valeur vide : texte livré');
  const f = (await respA.get('/api/parametres-entite/rgpd.mention_fr')).body.data;
  assert.equal(f.est_defaut, true, 'un texte vidé revient à la valeur livrée');
  assert.match(f.valeur, /^Responsable du traitement : \{entite\}\./);
  // L'autre entité garde ses textes et n'a pas de DPO.
  const b = (await gestB.get('/api/auth/me')).body.data.protection_donnees;
  assert.equal(b.dpo_contact, null);
  assert.match(b.mention_fr, /^Responsable du traitement : Centre fictif\./);
  const j = getDb().prepare("SELECT entite_id, details_json FROM audit_log WHERE action = 'parametre_entite.update' AND details_json LIKE '%rgpd.dpo_contact%'").get();
  assert.equal(j.entite_id, ea.id);
  assert.equal((await respA.del('/api/parametres-entite/rgpd.dpo_contact')).status, 200);
  assert.equal((await agent.get('/api/auth/me')).body.data.protection_donnees.dpo_contact, null);
});

test('mentions RGPD par le MCP : get_profile les rend ; le catalogue liste le groupe et ses variables', async () => {
  const p = (await call(agent, 'get_profile')).data.protection_donnees;
  assert.match(p.mention_courte_nl, /^Uw gegevens/);
  const l = (await agent.get('/api/parametres-entite?groupe=rgpd')).body.data;
  assert.deepEqual(l.map((x) => x.cle), ['rgpd.dpo_contact', 'rgpd.mention_courte_fr', 'rgpd.mention_courte_nl', 'rgpd.mention_fr', 'rgpd.mention_nl']);
  assert.deepEqual(l.find((x) => x.cle === 'rgpd.mention_fr').variables, ['entite', 'dpo']);
  assert.equal(l.find((x) => x.cle === 'rgpd.mention_fr').type, 'texte_long');
});
