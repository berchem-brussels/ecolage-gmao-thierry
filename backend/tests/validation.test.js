/**
 * Validation par le chef de service (0.16.0, étape 11, point 1 ; DEM-15, ROL-04, fin de E-22) : services réglés par
 * l'administrateur, valideur et suppléant pour une période, service des comptes ; circuit au dépôt selon la catégorie ;
 * passages du valideur (valider, refuser avec motif), délais comptés depuis la validation ; lecture par le valideur ;
 * cloison ; MCP ; migration 014 sur une base 0.15.0.
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
let collegue;
let sansService;
let chef;
let suppleant;
let chefB;
let lieu;
let natureValider;
let natureDirecte;
let service;

const jour = (decalage) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date(Date.now() + decalage * 86400000));
const parse = (r) => JSON.parse(r.body.result.content[0].text);
const tool = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));
const journal = (action, id) => getDb().prepare('SELECT details_json AS details FROM audit_log WHERE action = ? AND entity_id = ? ORDER BY id DESC').get(action, id);

async function deposer(c, categorie = natureValider, description = 'Déplacer deux armoires au premier étage.') {
  const r = await c.post('/api/demandes', { lieu_id: lieu, categorie_id: categorie.id, description });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.data;
}

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  gest = await person(srv.base, admin, 'gest.val@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  agent = await person(srv.base, admin, 'agent.val@exemple.test', ea.id);
  collegue = await person(srv.base, admin, 'collegue.val@exemple.test', ea.id);
  sansService = await person(srv.base, admin, 'sans.val@exemple.test', ea.id);
  chef = await person(srv.base, admin, 'chef.val@exemple.test', ea.id, [[ea.id, 'valideur']]);
  suppleant = await person(srv.base, admin, 'suppleant.val@exemple.test', ea.id, [[ea.id, 'valideur']]);
  chefB = await person(srv.base, admin, 'chef.valb@exemple.test', eb.id, [[eb.id, 'valideur']]);
  lieu = (await gest.post('/api/lieux', { nature: 'site', code: 'VS', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis' })).body.data.id;
  natureValider = (await agent.get('/api/categories?niveau=nature&q=demenagement')).body.data[0];
  natureDirecte = (await agent.get('/api/categories?niveau=nature&q=eclairage')).body.data[0];
  assert.equal(natureValider.validation_effective, 1, 'le déménagement passe par le chef de service (catégories livrées)');
  assert.equal(natureDirecte.validation_effective, 0);
});
after(() => srv.stop());

test('services : réglés par l’administrateur seul ; valideur avec le rôle dans l’entité du service', async () => {
  assert.equal((await gest.get('/api/services')).status, 403, 'un rôle métier ne lit pas la table');
  assert.equal((await chef.post('/api/services', { entite_id: ea.id, code: 'SEC', nom_fr: 'Secrétariat', nom_nl: 'Secretariaat' })).status, 403);
  const sansRole = await admin.post('/api/services', { entite_id: ea.id, code: 'SEC', nom_fr: 'Secrétariat', nom_nl: 'Secretariaat', valideur_id: agent.id });
  assert.equal(sansRole.status, 409);
  assert.equal(sansRole.body.code, 'VALIDEUR_SANS_ROLE');
  const autreEntite = await admin.post('/api/services', { entite_id: ea.id, code: 'SEC', nom_fr: 'Secrétariat', nom_nl: 'Secretariaat', valideur_id: chefB.id });
  assert.equal(autreEntite.body.code, 'VALIDEUR_SANS_ROLE', 'valideur de l’autre entité refusé (cloison)');
  const r = await admin.post('/api/services', { entite_id: ea.id, code: 'SEC', nom_fr: 'Secrétariat', nom_nl: 'Secretariaat', valideur_id: chef.id });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  service = r.body.data;
  assert.equal(service.valideur_nom, 'Nom');
  assert.equal(service.suppleance_en_cours, 0);
  assert.equal((await admin.post('/api/services', { entite_id: ea.id, code: 'SEC', nom_fr: 'Autre', nom_nl: 'Ander' })).body.code, 'SERVICE_CODE_EXISTE');
  assert.equal((await admin.post('/api/services', { entite_id: eb.id, code: 'SEC', nom_fr: 'Secrétariat', nom_nl: 'Secretariaat', valideur_id: chefB.id })).status, 201,
    'même code dans l’autre entité');
  const l = (await admin.get(`/api/services?entite_id=${ea.id}`)).body.data;
  assert.deepEqual(l.map((s) => s.code), ['SEC']);
  const j = JSON.parse(journal('service.create', service.id).details);
  assert.equal(j.valideur_id, chef.id);
});

test('suppléant : une période complète, une autre personne qui a le rôle ; refus codés', async () => {
  const essai = (body) => admin.put(`/api/services/${service.id}`, body);
  assert.equal((await essai({ suppleant_id: suppleant.id })).body.code, 'SUPPLEANT_PERIODE');
  assert.equal((await essai({ suppleant_id: suppleant.id, suppleant_du: jour(3), suppleant_au: jour(1) })).body.code, 'SUPPLEANT_PERIODE');
  assert.equal((await essai({ suppleant_id: chef.id, suppleant_du: jour(0), suppleant_au: jour(1) })).body.code, 'SUPPLEANT_EGAL_VALIDEUR');
  assert.equal((await essai({ suppleant_id: collegue.id, suppleant_du: jour(0), suppleant_au: jour(1) })).body.code, 'VALIDEUR_SANS_ROLE');
  const r = await essai({ suppleant_id: suppleant.id, suppleant_du: jour(-10), suppleant_au: jour(-5) });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.suppleance_en_cours, 0, 'période passée');
  const diff = JSON.parse(journal('service.update', service.id).details);
  assert.equal(diff.apres.suppleant_id, suppleant.id, 'journal : champs changés');
});

test('membres : service de l’entité de rattachement, actif ; refus codés', async () => {
  const autre = (await admin.get(`/api/services?entite_id=${eb.id}`)).body.data[0];
  assert.equal((await admin.put(`/api/users/${agent.id}`, { service_id: autre.id })).body.code, 'SERVICE_AUTRE_ENTITE');
  assert.equal((await admin.put(`/api/users/${agent.id}`, { service_id: 99999 })).body.code, 'SERVICE_INCONNU');
  for (const c of [agent, collegue, chef]) assert.equal((await admin.put(`/api/users/${c.id}`, { service_id: service.id })).status, 200);
  assert.equal((await admin.get(`/api/users/${agent.id}`)).body.data.service_id, service.id);
  const membres = (await admin.get(`/api/users?service_id=${service.id}`)).body.data.map((u) => u.id).sort();
  assert.deepEqual(membres, [agent.id, collegue.id, chef.id].sort());
  assert.equal((await admin.get(`/api/services/${service.id}`)).body.data.nb_membres, 3);
  assert.equal((await chef.put(`/api/users/${agent.id}`, { service_id: null })).status, 403, 'réglé par l’administrateur');
});

test('dépôt : catégorie à valider → « En validation » ; autre catégorie, sans service, ou chef lui-même → « À qualifier »', async () => {
  const d = await deposer(agent);
  assert.equal(d.etat, 'en_validation');
  assert.equal(d.service_id, service.id);
  assert.equal(d.service_nom_fr, 'Secrétariat');
  assert.match(d.etat_libelle_fr, /chef de service/);
  assert.equal(JSON.parse(journal('demande.create', d.id).details).validation, 'demandee');
  const h = (await agent.get(`/api/demandes/${d.id}/historique`)).body.data;
  assert.deepEqual(h.map((x) => [x.de_etat, x.vers_etat]), [[null, 'en_validation']]);
  const directe = await deposer(agent, natureDirecte, 'Néon du couloir qui clignote.');
  assert.equal(directe.etat, 'a_qualifier');
  assert.equal(JSON.parse(journal('demande.create', directe.id).details).validation, undefined, 'rien à valider : rien au journal');
  const sans = await deposer(sansService);
  assert.equal(sans.etat, 'a_qualifier');
  assert.equal(sans.service_id, null);
  assert.equal(JSON.parse(journal('demande.create', sans.id).details).validation, 'sans_valideur');
  const parLeChef = await deposer(chef);
  assert.equal(parLeChef.etat, 'a_qualifier');
  assert.equal(JSON.parse(journal('demande.create', parLeChef.id).details).validation, 'auteur_valideur');
});

test('valideur : liste « À valider », lecture sans champs internes, refus avec motif lu par le demandeur', async () => {
  const d = await deposer(agent, natureValider, 'Acheter une armoire haute pour les archives.');
  const liste = (await chef.get('/api/demandes/a-valider')).body;
  assert.ok(liste.data.some((x) => x.id === d.id));
  assert.equal(liste.data.find((x) => x.id === d.id).demandeur_nom, 'Nom', 'le valideur voit qui demande');
  assert.equal((await collegue.get('/api/demandes/a-valider')).body.data.length, 0, 'qui ne valide rien : liste vide, pas 403');
  assert.equal((await gest.get('/api/demandes/a-valider')).body.data.length, 0);
  const vue = (await chef.get(`/api/demandes/${d.id}`)).body.data;
  assert.equal(vue.valideur, 1);
  assert.deepEqual(vue.transitions_valideur.map((t) => t.vers).sort(), ['a_qualifier', 'refusee_validation']);
  assert.equal(vue.priorite_proposee, undefined, 'champs internes du service retirés');
  assert.equal(vue.transitions, undefined);
  assert.equal((await collegue.get(`/api/demandes/${d.id}`)).status, 403, 'un collègue du service ne lit pas la demande');
  const sans = await chef.post(`/api/demandes/${d.id}/transitions`, { etat: 'refusee_validation' });
  assert.equal(sans.status, 409);
  assert.equal(sans.body.code, 'COMMENTAIRE_REQUIS');
  const r = await chef.post(`/api/demandes/${d.id}/transitions`, { etat: 'refusee_validation', commentaire: 'Budget épuisé cette année.' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.etat, 'refusee_validation');
  assert.equal(r.body.data.ouverte, 0);
  const h = (await agent.get(`/api/demandes/${d.id}/historique`)).body.data;
  const refus = h.find((x) => x.vers_etat === 'refusee_validation');
  assert.equal(refus.auteur, 'valideur');
  assert.equal(refus.commentaire, 'Budget épuisé cette année.', 'le demandeur lit le motif');
  assert.equal(refus.auteur_nom, undefined, 'sans le nom du chef');
});

test('valider : « À qualifier », délais comptés depuis la validation ; le service ne valide pas à la place du chef', async () => {
  const d = await deposer(agent, natureValider, 'Aménager un coin café dans le local 2.');
  const g = await gest.post(`/api/demandes/${d.id}/transitions`, { etat: 'a_qualifier' });
  assert.equal(g.status, 409, 'le gestionnaire n’a pas de passage depuis « En validation »');
  assert.equal(g.body.code, 'TRANSITION_INTERDITE');
  assert.equal((await agent.post(`/api/demandes/${d.id}/transitions`, { etat: 'a_qualifier' })).status, 403, 'le demandeur ne se valide pas');
  // Dépôt vieilli d'une semaine : à la validation, la prise en charge repart de maintenant.
  getDb().prepare("UPDATE demandes SET created_at = datetime('now', '-7 days'), prise_en_charge_le = datetime('now', '-6 days'), echeance_le = datetime('now', '-1 days') WHERE id = ?").run(d.id);
  const r = await chef.post(`/api/demandes/${d.id}/transitions`, { etat: 'a_qualifier', commentaire: 'D’accord, budget prévu.' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.etat, 'a_qualifier');
  const row = getDb().prepare('SELECT decompte_depuis, prise_en_charge_le, echeance_le FROM demandes WHERE id = ?').get(d.id);
  assert.ok(row.decompte_depuis, 'décompte depuis la validation');
  assert.ok(new Date(`${row.prise_en_charge_le.replace(' ', 'T')}Z`) > new Date(), 'prise en charge recalculée dans le futur');
  assert.equal(JSON.parse(journal('demande.transition', d.id).details).vers, 'a_qualifier');
  assert.equal((await chef.post(`/api/demandes/${d.id}/transitions`, { etat: 'qualifiee' })).status, 403, 'le chef ne fait rien d’autre');
  const vueService = (await gest.get(`/api/demandes/${d.id}/historique`)).body.data;
  assert.equal(vueService.find((x) => x.vers_etat === 'a_qualifier' && x.de_etat === 'en_validation').auteur_nom, 'Nom', 'le service lit qui a validé');
});

test('valideur d’un autre service de la même entité : ne lit, ne liste ni ne valide la demande', async () => {
  // Le suppléant de SEC (période passée) devient chef d'un autre service de l'AC : le rôle seul ne suffit pas.
  const tec = (await admin.post('/api/services', { entite_id: ea.id, code: 'TEC', nom_fr: 'Technique', nom_nl: 'Techniek', valideur_id: suppleant.id })).body.data;
  const d = await deposer(agent, natureValider, 'Acheter deux chaises pour l’accueil.');
  assert.equal((await suppleant.get(`/api/demandes/${d.id}`)).status, 403);
  assert.ok(!(await suppleant.get('/api/demandes/a-valider')).body.data.some((x) => x.id === d.id));
  assert.equal((await suppleant.post(`/api/demandes/${d.id}/transitions`, { etat: 'a_qualifier' })).status, 403);
  assert.equal(getDb().prepare('SELECT etat FROM demandes WHERE id = ?').get(d.id).etat, 'en_validation');
  await admin.del(`/api/services/${tec.id}`, { motif: 'Service d’essai.' });
});

test('suppléant : valide pendant sa période seulement ; le titulaire garde le droit', async () => {
  const d = await deposer(collegue, natureValider, 'Déménager le bureau 1.04 au rez.');
  assert.equal((await suppleant.get(`/api/demandes/${d.id}`)).status, 403, 'hors période');
  assert.equal((await suppleant.get('/api/demandes/a-valider')).body.data.length, 0);
  await admin.put(`/api/services/${service.id}`, { suppleant_du: jour(-1), suppleant_au: jour(2) });
  assert.equal((await admin.get(`/api/services/${service.id}`)).body.data.suppleance_en_cours, 1);
  assert.ok((await suppleant.get('/api/demandes/a-valider')).body.data.some((x) => x.id === d.id));
  assert.ok((await chef.get('/api/demandes/a-valider')).body.data.some((x) => x.id === d.id), 'le titulaire la voit aussi');
  const r = await suppleant.post(`/api/demandes/${d.id}/transitions`, { etat: 'a_qualifier' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  // Retrait du suppléant : sa période part avec lui.
  const s = (await admin.put(`/api/services/${service.id}`, { suppleant_id: null })).body.data;
  assert.deepEqual([s.suppleant_id, s.suppleant_du, s.suppleant_au], [null, null, null]);
});

test('le demandeur annule une demande en validation ; un rôle retiré au chef lui retire la validation', async () => {
  const d = await deposer(agent, natureValider, 'Changer la disposition de la salle 3.');
  const r = await agent.del(`/api/demandes/${d.id}`, { motif: 'Plus nécessaire.' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.etat, 'annulee');
  const d2 = await deposer(agent, natureValider, 'Ajouter une étagère dans le local 5.');
  const role = getDb().prepare("SELECT id FROM user_roles WHERE user_id = ? AND role = 'valideur'").get(chef.id);
  getDb().prepare('UPDATE user_roles SET is_active = 0 WHERE id = ?').run(role.id);
  try {
    assert.equal((await chef.get('/api/demandes/a-valider')).status, 200);
    assert.equal((await chef.get('/api/demandes/a-valider')).body.data.length, 0);
    assert.equal((await chef.post(`/api/demandes/${d2.id}/transitions`, { etat: 'a_qualifier' })).status, 403);
    // Un chef qui n'a plus le rôle ne fait plus valider : la demande nouvelle ne reste pas bloquée chez lui.
    const d3 = await deposer(agent, natureValider, 'Ajouter un portemanteau dans le local 5.');
    assert.equal(d3.etat, 'a_qualifier');
    assert.equal(JSON.parse(journal('demande.create', d3.id).details).validation, 'sans_valideur');
  } finally {
    getDb().prepare('UPDATE user_roles SET is_active = 1 WHERE id = ?').run(role.id);
  }
});

test('cloison : un valideur de l’autre entité ne lit ni ne valide ; service désactivé : plus de validation', async () => {
  const d = await deposer(agent, natureValider, 'Déplacer le photocopieur au premier.');
  assert.equal((await chefB.get(`/api/demandes/${d.id}`)).status, 403);
  assert.equal((await chefB.post(`/api/demandes/${d.id}/transitions`, { etat: 'a_qualifier' })).status, 403);
  assert.equal((await tool(chefB, 'get_demande', { id: d.id })).code, 'FORBIDDEN');
  // Valideur d'un autre service de la même entité : ni lecture, ni passage, ni liste.
  const rh = (await admin.post('/api/services', { entite_id: ea.id, code: 'RH', nom_fr: 'Personnel', nom_nl: 'Personeel', valideur_id: suppleant.id })).body.data;
  assert.equal(rh.valideur_id, suppleant.id);
  assert.equal((await suppleant.get(`/api/demandes/${d.id}`)).status, 403);
  assert.equal((await suppleant.post(`/api/demandes/${d.id}/transitions`, { etat: 'a_qualifier' })).status, 403);
  assert.ok(!(await suppleant.get('/api/demandes/a-valider')).body.data.some((x) => x.id === d.id));
  const p = await tool(admin, 'prepare_deactivate_service', { id: service.id, motif: 'Service fusionné' });
  assert.equal(p.data.service.nb_membres, 3);
  const c = await tool(admin, 'confirm_deactivate_service', { confirmation_token: p.data.confirmation_token });
  assert.equal(c.data.is_active, 0);
  const apres = await deposer(agent, natureValider, 'Acheter un tableau blanc pour la salle 2.');
  assert.equal(apres.etat, 'a_qualifier');
  assert.equal(JSON.parse(journal('demande.create', apres.id).details).validation, 'sans_valideur');
  assert.equal((await admin.put(`/api/users/${collegue.id}`, { service_id: service.id })).body.code, 'SERVICE_INACTIF');
  assert.equal((await admin.put(`/api/services/${service.id}`, { is_active: 1 })).body.data.is_active, 1);
});

test('MCP : services pour l’administrateur seul ; le valideur liste et valide en deux appels', async () => {
  assert.equal((await tool(chef, 'list_services')).code, 'FORBIDDEN');
  assert.ok((await tool(admin, 'list_services', { entite_id: ea.id })).data.rows.some((s) => s.code === 'SEC'));
  const d = await deposer(agent, natureValider, 'Monter des étagères dans l’archive.');
  const l = await tool(chef, 'list_demandes_a_valider');
  assert.ok(l.data.rows.some((x) => x.id === d.id));
  const p = await tool(chef, 'prepare_change_etat_demande', { id: d.id, etat: 'a_qualifier' });
  assert.equal(p.data.vers, 'a_qualifier');
  assert.equal(getDb().prepare('SELECT etat FROM demandes WHERE id = ?').get(d.id).etat, 'en_validation', 'rien avant la confirmation');
  const c = await tool(chef, 'confirm_change_etat_demande', { confirmation_token: p.data.confirmation_token });
  assert.equal(c.data.etat, 'a_qualifier');
  const canal = getDb().prepare("SELECT canal FROM demande_historique WHERE demande_id = ? AND vers_etat = 'a_qualifier'").get(d.id).canal;
  assert.equal(canal, 'mcp');
});

test('journal : service et personnes nommés (valideur, suppléant, service d’un compte, service au dépôt)', async () => {
  const lignes = (await admin.get('/api/audit?limit=200')).body.data;
  const creation = lignes.find((l) => l.action === 'service.create' && l.entity_id === service.id);
  assert.equal(creation.noms.valideur_id.type, 'personne');
  assert.equal(creation.noms.valideur_id.nom_fr, 'Prénom Nom');
  assert.equal(creation.noms.valideur_id.code, 'chef.val@exemple.test');
  const modif = lignes.find((l) => l.action === 'service.update' && l.entity_id === service.id && l.details.apres && l.details.apres.suppleant_id);
  assert.equal(modif.noms['apres.suppleant_id'].code, 'suppleant.val@exemple.test');
  const compte = lignes.find((l) => l.action === 'user.update' && l.details.service_id === service.id);
  assert.deepEqual([compte.noms.service_id.type, compte.noms.service_id.code, compte.noms.service_id.entite_code], ['service', 'SEC', 'AA']);
  const depot = lignes.find((l) => l.action === 'demande.create' && l.details.validation === 'demandee');
  assert.equal(depot.noms.service_id.nom_fr, 'Secrétariat');
});

test('migration 014 sur une base 0.15.0 : services, colonnes, passages gardés (désactivés compris) et passages du valideur ajoutés', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { spawnSync } = require('child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gmao-m014-'));
  const env = { PATH: process.env.PATH, NODE_ENV: 'test', APP_TEST_MODE: '1', DB_PATH: path.join(dir, 'm.db') };
  const run = (code) => spawnSync(process.execPath, ['-e', code], { cwd: path.join(__dirname, '..'), env, encoding: 'utf8' });
  const prep = run(`
    const initSqlJs = require('sql.js'); const fs = require('fs');
    const { MIGRATIONS } = require('./src/database');
    initSqlJs().then((SQL) => {
      const db = new SQL.Database();
      db.run("CREATE TABLE schema_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, applied_at TEXT DEFAULT (datetime('now')))");
      for (const [name, sql] of MIGRATIONS.slice(0, 13)) { for (const s of sql.split(';').map((x) => x.trim()).filter(Boolean)) db.run(s); db.run('INSERT INTO schema_migrations (name) VALUES (?)', [name]); }
      db.run("INSERT INTO demande_transitions (de_etat, vers_etat, permission, acteur, is_active) VALUES ('qualifiee', 'en_cours', 'demandes:traiter', 'service', 0)");
      db.run("INSERT INTO demande_transitions (de_etat, vers_etat, permission, acteur) VALUES ('cloturee', 'rouverte', 'demandes:creer', 'demandeur')");
      fs.writeFileSync(process.env.DB_PATH, Buffer.from(db.export()));
    });`);
  assert.equal(prep.status, 0, prep.stderr);
  const up = run(`require('./src/database').initDb().then((db) => {
    console.log(JSON.stringify({
      migration: db.prepare('SELECT name FROM schema_migrations ORDER BY id DESC').get().name,
      desactive: db.prepare("SELECT is_active FROM demande_transitions WHERE de_etat = 'qualifiee' AND vers_etat = 'en_cours'").get().is_active,
      valideur: db.prepare("SELECT COUNT(*) AS n FROM demande_transitions WHERE acteur = 'valideur'").get().n,
      total: db.prepare('SELECT COUNT(*) AS n FROM demande_transitions').get().n,
      services: db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'services'").get().n,
      colonnes: [db.prepare("SELECT COUNT(*) AS n FROM pragma_table_info('users') WHERE name = 'service_id'").get().n,
        db.prepare("SELECT COUNT(*) AS n FROM pragma_table_info('demandes') WHERE name = 'service_id'").get().n],
    }));
  })`);
  assert.equal(up.status, 0, up.stderr);
  assert.match(up.stdout, /\[DB\] Migration 014_validation appliquée/);
  const out = JSON.parse(up.stdout.trim().split('\n').pop());
  assert.equal(out.migration, '014_validation');
  assert.equal(out.desactive, 0, 'un passage désactivé en base n’est jamais réactivé');
  assert.equal(out.valideur, 2);
  assert.equal(out.total, require('../src/services/cycle').CONFIG.transitions.length);
  assert.equal(out.services, 1);
  assert.deepEqual(out.colonnes, [1, 1]);
  const again = run("require('./src/database').initDb().then(() => {})");
  assert.equal(again.status, 0, again.stderr);
  assert.doesNotMatch(again.stdout, /Migration 014_validation appliquée/, 'appliquée une seule fois');
});
