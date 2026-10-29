/**
 * Cloison entre entités (cahier des charges SEC-01, ROL-02, ROL-03 ; A-02).
 * Pour chaque ressource rattachée à une entité, une personne habilitée dans l'une tente d'atteindre l'objet de l'autre,
 * par l'API puis par le MCP : 403 attendu. La liste RESSOURCES s'allonge à chaque lot ; un test vérifie qu'aucune route
 * à identifiant d'entité n'y échappe.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { collectRoutes } = require('../src/openapi');

let srv;
let admin;
let ea;
let eb;
let gestA;
let gestB;
let multi;

/** Objets créés dans chaque entité pour les essais : un lieu et une valeur de liste, par code d'entité. */
const objets = {};

/**
 * Ressources cloisonnées : route REST, outil MCP (null pour une route binaire hors MCP, écart E-17),
 * fabrique de l'identifiant dans l'entité visée.
 */
const RESSOURCES = [
  { route: 'GET /api/entites/:id/membres', tool: 'list_entite_membres', id: (ent) => ent.id },
  { route: 'GET /api/lieux/:id', tool: 'get_lieu', id: (ent) => objets[ent.code].lieu },
  { route: 'GET /api/lieux/:id/photo', tool: null, id: (ent) => objets[ent.code].lieu, statusOwn: 404 },
  { route: 'GET /api/listes-valeurs/:id', tool: 'get_liste_valeur', id: (ent) => objets[ent.code].valeur },
  { route: 'GET /api/categories/:id', tool: 'get_categorie', id: (ent) => objets[ent.code].categorie },
  { route: 'GET /api/jours-non-ouvres/:id', tool: 'get_jour_non_ouvre', id: (ent) => objets[ent.code].jour },
  { route: 'GET /api/demandes/:id', tool: 'get_demande', id: (ent) => objets[ent.code].demande },
  { route: 'GET /api/categories/:id/questions', tool: 'list_questions_categorie', id: (ent) => objets[ent.code].categorie },
  { route: 'GET /api/questions-categorie/:id', tool: 'get_question_categorie', id: (ent) => objets[ent.code].question },
];

/** Écritures cloisonnées : même attente, 403 depuis l'autre entité, et l'objet n'a pas bougé. */
const ECRITURES = [
  { route: 'PUT /api/lieux/:id', body: { nom_fr: 'Piraté' }, tool: 'update_lieu', id: (ent) => objets[ent.code].lieu },
  { route: 'DELETE /api/lieux/:id', body: { motif: 'Piraté' }, tool: 'prepare_deactivate_lieu', id: (ent) => objets[ent.code].lieu },
  { route: 'POST /api/lieux/:id/photo', raw: true, tool: null, id: (ent) => objets[ent.code].lieu },
  { route: 'DELETE /api/lieux/:id/photo', body: {}, tool: 'prepare_delete_lieu_photo', id: (ent) => objets[ent.code].lieu },
  { route: 'PUT /api/listes-valeurs/:id', body: { libelle_fr: 'Piraté' }, tool: 'update_liste_valeur', id: (ent) => objets[ent.code].valeur },
  { route: 'DELETE /api/listes-valeurs/:id', body: { motif: 'Piraté' }, tool: 'prepare_deactivate_liste_valeur', id: (ent) => objets[ent.code].valeur },
  { route: 'PUT /api/categories/:id', body: { libelle_fr: 'Piraté' }, tool: 'update_categorie', id: (ent) => objets[ent.code].categorie },
  { route: 'DELETE /api/categories/:id', body: { motif: 'Piraté' }, tool: 'prepare_deactivate_categorie', id: (ent) => objets[ent.code].categorie },
  { route: 'PUT /api/jours-non-ouvres/:id', body: { libelle_fr: 'Piraté' }, tool: 'update_jour_non_ouvre', id: (ent) => objets[ent.code].jour },
  { route: 'DELETE /api/jours-non-ouvres/:id', body: { motif: 'Piraté' }, tool: 'prepare_deactivate_jour_non_ouvre', id: (ent) => objets[ent.code].jour },
  { route: 'POST /api/demandes/:id/suivre', body: { remarque: 'Piraté' }, tool: 'suivre_demande', id: (ent) => objets[ent.code].demande },
  { route: 'POST /api/categories/:id/questions', body: { question_fr: 'Piraté', question_nl: 'Piraté', type: 'oui_non' }, tool: 'create_question_categorie', id: (ent) => objets[ent.code].categorie },
  { route: 'PUT /api/questions-categorie/:id', body: { question_fr: 'Piraté' }, tool: 'update_question_categorie', id: (ent) => objets[ent.code].question },
  { route: 'DELETE /api/questions-categorie/:id', body: { motif: 'Piraté' }, tool: 'prepare_deactivate_question_categorie', id: (ent) => objets[ent.code].question },
];

const tool = async (c, name, args) => JSON.parse((await c.mcp('tools/call', { name, arguments: args })).body.result.content[0].text);

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  // Gestionnaire et responsable dans leur seule entité : tous les droits d'écriture métier, aucun dans l'autre.
  gestA = await person(srv.base, admin, 'gest.a@exemple.test', ea.id, [[ea.id, 'gestionnaire'], [ea.id, 'responsable']]);
  gestB = await person(srv.base, admin, 'gest.b@exemple.test', eb.id, [[eb.id, 'gestionnaire'], [eb.id, 'responsable']]);
  multi = await person(srv.base, admin, 'multi@exemple.test', ea.id, [[ea.id, 'responsable'], [eb.id, 'responsable']]);
  for (const [c, ent] of [[gestA, ea], [gestB, eb]]) {
    const lieu = await c.post('/api/lieux', { nature: 'site', code: 'S1', nom_fr: `Site ${ent.code}`, nom_nl: `Site ${ent.code}` });
    assert.equal(lieu.status, 201, JSON.stringify(lieu.body));
    const valeur = (await c.get('/api/listes-valeurs?liste=type_lieu')).body.data[0];
    const categorie = (await c.get('/api/categories?niveau=nature&q=eclairage')).body.data[0];
    const jour = (await c.get('/api/jours-non-ouvres?nature=conge')).body.data[0];
    const demande = await c.post('/api/demandes', { lieu_id: lieu.body.data.id, categorie_id: categorie.id, description: `Lampe en panne ${ent.code}` });
    assert.equal(demande.status, 201, JSON.stringify(demande.body));
    const plomberie = (await c.get('/api/categories?niveau=domaine&q=plomberie')).body.data[0];
    const question = (await c.get(`/api/categories/${plomberie.id}/questions`)).body.data[0];
    objets[ent.code] = { lieu: lieu.body.data.id, valeur: valeur.id, categorie: categorie.id, jour: jour.id, demande: demande.body.data.id, question: question.id };
  }
});
after(() => srv.stop());

for (const r of RESSOURCES) {
  test(`${r.route} : chaque entité voit la sienne et pas l'autre, par l'API et par le MCP`, async () => {
    const url = (ent) => r.route.split(' ')[1].replace(':id', r.id(ent));
    const own = r.statusOwn || 200;
    assert.equal((await gestA.get(url(ea))).status, own);
    assert.equal((await gestB.get(url(eb))).status, own);
    const ab = await gestA.get(url(eb));
    assert.equal(ab.status, 403);
    assert.equal(ab.body.code, 'FORBIDDEN');
    assert.equal((await gestB.get(url(ea))).status, 403);
    if (r.tool) {
      assert.equal((await tool(gestA, r.tool, { id: r.id(eb) })).code, 'FORBIDDEN');
      assert.equal((await tool(gestB, r.tool, { id: r.id(ea) })).code, 'FORBIDDEN');
    }
  });

  test(`${r.route} : une personne habilitée dans les deux entités ne voit que l'entité active`, async () => {
    const url = (ent) => r.route.split(' ')[1].replace(':id', r.id(ent));
    const own = r.statusOwn || 200;
    await multi.put('/api/auth/entite', { entite_id: ea.id });
    assert.equal((await multi.get(url(ea))).status, own);
    assert.equal((await multi.get(url(eb))).status, 403, 'rôle dans BB, mais AA active');
    await multi.put('/api/auth/entite', { entite_id: eb.id });
    assert.equal((await multi.get(url(eb))).status, own);
    assert.equal((await multi.get(url(ea))).status, 403);
  });
}

for (const w of ECRITURES) {
  test(`${w.route} : une écriture sur l'objet de l'autre entité est refusée, par l'API et par le MCP`, async () => {
    const [method, pattern] = w.route.split(' ');
    const url = pattern.replace(':id', w.id(eb));
    let res;
    if (w.raw) {
      res = await fetch(srv.base + url, { method, headers: { Cookie: gestA.cookie, 'X-CSRF-Token': gestA.csrf, 'Content-Type': 'image/png' }, body: Buffer.from('x') });
    } else {
      res = await gestA[{ PUT: 'put', DELETE: 'del', POST: 'post' }[method]](url, w.body);
    }
    assert.equal(res.status, 403, `${w.route} : ${res.status}`);
    if (w.tool) assert.equal((await tool(gestA, w.tool, { id: w.id(eb), ...w.body })).code, 'FORBIDDEN', w.tool);
    const lieu = (await gestB.get(`/api/lieux/${objets.BB.lieu}`)).body.data;
    assert.equal(lieu.nom_fr, 'Site BB');
    assert.equal(lieu.is_active, 1);
    const valeur = (await gestB.get(`/api/listes-valeurs/${objets.BB.valeur}`)).body.data;
    assert.notEqual(valeur.libelle_fr, 'Piraté');
    assert.equal(valeur.is_active, 1);
    const categorie = (await gestB.get(`/api/categories/${objets.BB.categorie}`)).body.data;
    assert.notEqual(categorie.libelle_fr, 'Piraté');
    assert.equal(categorie.is_active, 1);
    const jour = (await gestB.get(`/api/jours-non-ouvres/${objets.BB.jour}`)).body.data;
    assert.notEqual(jour.libelle_fr, 'Piraté');
    assert.equal(jour.is_active, 1);
    const question = (await gestB.get(`/api/questions-categorie/${objets.BB.question}`)).body.data;
    assert.notEqual(question.question_fr, 'Piraté');
    assert.equal(question.is_active, 1);
    assert.equal((await gestB.get(`/api/categories/${objets.BB.categorie}/questions?inclure_inactives=1`)).body.data.length, 0, 'aucune question ajoutée');
  });
}

test('listes et arbre : chaque entité ne reçoit que ses lieux et ses valeurs', async () => {
  const la = (await gestA.get('/api/lieux')).body.data;
  assert.deepEqual(la.map((l) => l.entite_id), [ea.id]);
  const arbre = (await gestB.get('/api/lieux/arbre')).body.data;
  assert.deepEqual(arbre.racines.map((l) => l.nom_fr), ['Site BB']);
  const va = (await gestA.get('/api/listes-valeurs')).body.data;
  assert.ok(va.length >= 10);
  assert.ok(va.every((v) => v.entite_id === ea.id));
  assert.ok((await tool(gestB, 'list_lieux', {})).data.rows.every((l) => l.entite_id === eb.id));
  const ca = (await gestA.get('/api/categories?limit=200')).body.data;
  assert.ok(ca.length >= 35 && ca.every((c) => c.entite_id === ea.id));
  const cb = (await gestB.get('/api/categories/arbre')).body.data;
  assert.ok(cb.domaines.every((d) => d.entite_id === eb.id && d.natures.every((n) => n.entite_id === eb.id)));
  assert.ok((await tool(gestB, 'list_categories', {})).data.rows.every((c) => c.entite_id === eb.id));
  const da = (await gestA.get('/api/demandes?perimetre=entite')).body.data;
  assert.deepEqual(da.map((d) => d.entite_id), [ea.id]);
  assert.ok((await tool(gestB, 'list_demandes', { perimetre: 'entite' })).data.rows.every((d) => d.entite_id === eb.id));
});

test('demande déposée avec un lieu ou une catégorie de l’autre entité : refusée, aucun numéro consommé', async () => {
  const lb = await gestB.get('/api/demandes?perimetre=entite');
  assert.equal(lb.status, 200, JSON.stringify(lb.body));
  const avant = lb.body.pagination.total;
  const lieuB = await gestA.post('/api/demandes', { lieu_id: objets.BB.lieu, categorie_id: objets.AA.categorie, description: 'Lieu de l’autre entité' });
  assert.equal(lieuB.status, 403);
  const catB = await gestA.post('/api/demandes', { lieu_id: objets.AA.lieu, categorie_id: objets.BB.categorie, description: 'Catégorie de l’autre entité' });
  assert.equal(catB.status, 403);
  assert.equal((await tool(gestA, 'create_demande', { lieu_id: objets.BB.lieu, categorie_id: objets.BB.categorie, description: 'Par MCP vers l’autre entité' })).code, 'FORBIDDEN');
  assert.equal((await gestB.get('/api/demandes?perimetre=entite')).body.pagination.total, avant);
  const suivante = await gestA.post('/api/demandes', { lieu_id: objets.AA.lieu, categorie_id: objets.AA.categorie, description: 'Demande suivante AA' });
  assert.match(suivante.body.data.numero, /^AA-DI-\d{4}-00002$/, 'pas de trou après les refus');
});

test('demande déposée avec la réponse à une question de l’autre entité : refusée (DEM-05)', async () => {
  const plomberieA = (await gestA.get('/api/categories?niveau=nature&q=fuite_eau')).body.data[0];
  const r = await gestA.post('/api/demandes', { lieu_id: objets.AA.lieu, categorie_id: plomberieA.id, description: 'Fuite sous l’évier',
    reponses: [{ question_id: objets.BB.question, valeur: 'oui' }] });
  assert.equal(r.status, 409);
  assert.equal(r.body.code, 'QUESTION_INVALIDE');
});

test('création d’une nature sous un domaine de l’autre entité : refusée', async () => {
  const domB = (await gestB.get('/api/categories?niveau=domaine')).body.data[0];
  const r = await gestA.post('/api/categories', { parent_id: domB.id, code: 'intrus', libelle_fr: 'x', libelle_nl: 'x' });
  assert.equal(r.status, 409);
  assert.equal(r.body.code, 'CATEGORIE_PARENT');
});

test('le même code de lieu existe dans les deux entités sans rien partager (REF-02)', async () => {
  const a = (await gestA.get(`/api/lieux/${objets.AA.lieu}`)).body.data;
  const b = (await gestB.get(`/api/lieux/${objets.BB.lieu}`)).body.data;
  assert.equal(a.code, 'S1');
  assert.equal(b.code, 'S1');
  assert.notEqual(a.id, b.id);
});

test('création d’un lieu sous un parent ou avec un type de l’autre entité : refusée', async () => {
  const sousB = await gestA.post('/api/lieux', { nature: 'batiment', parent_id: objets.BB.lieu, code: 'X1', nom_fr: 'x', nom_nl: 'x' });
  assert.equal(sousB.status, 409);
  assert.equal(sousB.body.code, 'LIEU_PARENT');
  const typeB = await gestA.post('/api/lieux', { nature: 'local', parent_id: objets.AA.lieu, code: 'X2', nom_fr: 'x', nom_nl: 'x', type_id: objets.BB.valeur });
  assert.equal(typeB.status, 409);
  assert.equal(typeB.body.code, 'VALEUR_INVALIDE');
});

test('membres : contenu limité à l’entité, rôles de l’entité seulement', async () => {
  const l = (await gestA.get(`/api/entites/${ea.id}/membres`)).body.data;
  const emails = l.map((p) => p.email);
  assert.ok(emails.includes('gest.a@exemple.test'));
  assert.ok(!emails.includes('gest.b@exemple.test'));
  const m = l.find((p) => p.email === 'multi@exemple.test');
  assert.deepEqual(m.roles, ['agent', 'responsable']);
  assert.doesNotMatch(JSON.stringify(l), /password|hash/);
});

test('demandes du même bâtiment et « Moi aussi » (0.7.0) : rien de l’autre entité, par l’API et par le MCP', async () => {
  const r = await gestA.get(`/api/demandes/voisines?lieu_id=${objets.BB.lieu}`);
  assert.equal(r.status, 403);
  assert.equal((await tool(gestA, 'list_demandes_voisines', { lieu_id: objets.BB.lieu })).code, 'FORBIDDEN');
  const own = (await gestA.get(`/api/demandes/voisines?lieu_id=${objets.AA.lieu}`)).body.data;
  assert.ok(own.total >= 1);
  assert.ok(own.demandes.every((d) => !/BB/.test(d.extrait)), 'aucune demande de BB dans le bâtiment de AA');
  await multi.put('/api/auth/entite', { entite_id: ea.id });
  assert.equal((await multi.get(`/api/demandes/voisines?lieu_id=${objets.BB.lieu}`)).status, 403, 'rôle dans BB, mais AA active');
  assert.equal((await multi.post(`/api/demandes/${objets.BB.demande}/suivre`, {})).status, 403);
  assert.equal((await gestB.get(`/api/demandes/${objets.BB.demande}`)).body.data.nb_suiveurs, 0, 'aucun suiveur ajouté depuis l’autre entité');
});

test('membres : un demandeur ne lit pas la liste de sa propre entité', async () => {
  const p = await person(srv.base, admin, 'simple@exemple.test', ea.id);
  assert.equal((await p.get(`/api/entites/${ea.id}/membres`)).status, 403);
});

test('l’administrateur d’instance n’a aucun rôle métier d’office', async () => {
  const me = (await admin.get('/api/auth/me')).body.data;
  assert.ok(me.entites.every((e) => e.roles.every((role) => role === 'agent')));
});

test('toute route qui porte un identifiant d’entité figure dans la liste des ressources cloisonnées', () => {
  const declared = new Set(RESSOURCES.map((r) => r.route));
  // Routes d'administration de l'instance : réservées à l'administrateur, hors cloison métier.
  const instance = new Set(['GET /api/entites/:id', 'PUT /api/entites/:id', 'DELETE /api/entites/:id']);
  const ecritures = new Set(ECRITURES.map((w) => w.route));
  for (const r of collectRoutes(srv.app)) {
    const key = `${r.method} ${r.path}`;
    if (/^\/api\/entites\/:id/.test(r.path) && !instance.has(key)) assert.ok(declared.has(key), `${key} hors de la liste`);
    // Ressources métier rattachées à une entité : toute route à identifiant est essayée depuis l'autre entité.
    if (/^\/api\/(lieux|listes-valeurs|categories|questions-categorie|jours-non-ouvres|demandes)\/:id/.test(r.path)) assert.ok(declared.has(key) || ecritures.has(key), `${key} hors de la liste`);
  }
});
