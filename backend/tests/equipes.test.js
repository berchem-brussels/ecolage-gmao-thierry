/**
 * Équipes et profil des ouvriers (0.19.0, étape 15, point 2 ; ROL-05, DV-28, DV-155) : droits, chef et membres admis,
 * horaire d'équipe (week-end compris), cloison entre entités, désactivation, corps de métier et compétences, journal, MCP.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { getDb } = require('../src/database');

let srv;
let admin;
let ea;
let eb;
let resp;
let gest;
let chef;
let o1;
let o2;
let agent;
let respB;
let oB;
let equipe;

const valeur = async (c, liste, code) => (await c.get(`/api/listes-valeurs?liste=${liste}&limit=200`)).body.data.find((v) => v.code === code).id;
const WEEKEND = [{ jour: 6, debut: '07:00', fin: '13:00' }, { jour: 7, debut: '07:00', fin: '13:00' }];

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  resp = await person(srv.base, admin, 'resp.eq@exemple.test', ea.id, [[ea.id, 'responsable']]);
  gest = await person(srv.base, admin, 'gest.eq@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  chef = await person(srv.base, admin, 'chef.eq@exemple.test', ea.id, [[ea.id, 'chef_equipe']]);
  o1 = await person(srv.base, admin, 'o1.eq@exemple.test', ea.id, [[ea.id, 'ouvrier']]);
  o2 = await person(srv.base, admin, 'o2.eq@exemple.test', ea.id, [[ea.id, 'ouvrier']]);
  agent = await person(srv.base, admin, 'agent.eq@exemple.test', ea.id);
  respB = await person(srv.base, admin, 'respb.eq@exemple.test', eb.id, [[eb.id, 'responsable']]);
  oB = await person(srv.base, admin, 'ob.eq@exemple.test', eb.id, [[eb.id, 'ouvrier']]);
});
after(() => srv.stop());

test('lecture : gestionnaire, responsable et chef d’équipe ; demandeur et ouvrier refusés (403)', async () => {
  for (const c of [gest, resp, chef]) assert.equal((await c.get('/api/equipes')).status, 200);
  for (const c of [agent, o1]) {
    assert.equal((await c.get('/api/equipes')).status, 403);
    assert.equal((await c.get('/api/ouvriers')).status, 403);
  }
});

test('création par le responsable : chef, membres, horaire du week-end ; le gestionnaire ne crée pas', async () => {
  const corps = { code: 'PROP-WE', nom_fr: 'Propreté du week-end', nom_nl: 'Netheid in het weekend', chef_id: chef.id, membres: [o1.id, chef.id], horaire: WEEKEND };
  assert.equal((await gest.post('/api/equipes', corps)).status, 403);
  const r = await resp.post('/api/equipes', corps);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  equipe = r.body.data;
  assert.equal(equipe.chef_id, chef.id);
  assert.deepEqual(equipe.membres.map((m) => m.id).sort(), [o1.id, chef.id].sort());
  assert.deepEqual(equipe.horaire, WEEKEND);
  assert.equal(equipe.nb_membres, 2);
  assert.ok(equipe.trace, 'trace de création');
  assert.equal((await resp.post('/api/equipes', { ...corps, membres: [] })).status, 409, 'code unique dans l’entité');
  const l = getDb().prepare("SELECT details_json FROM audit_log WHERE action = 'equipe.create' ORDER BY id DESC LIMIT 1").get();
  assert.deepEqual(JSON.parse(l.details_json).horaire, WEEKEND);
});

test('chef et membres admis : rôle exigé dans l’entité (409 avec le motif)', async () => {
  const base = { code: 'BAT', nom_fr: 'Bâtiment', nom_nl: 'Gebouw' };
  let r = await resp.post('/api/equipes', { ...base, chef_id: o1.id });
  assert.equal(r.status, 409);
  assert.equal(r.body.code, 'CHEF_SANS_ROLE', 'un ouvrier ne dirige pas une équipe');
  r = await resp.post('/api/equipes', { ...base, membres: [o1.id, agent.id] });
  assert.equal(r.body.code, 'MEMBRE_SANS_ROLE');
  assert.deepEqual(r.body.details, { user_id: agent.id });
  r = await resp.post('/api/equipes', { ...base, membres: [oB.id] });
  assert.equal(r.body.code, 'MEMBRE_SANS_ROLE', 'un ouvrier de l’autre entité est refusé');
  r = await resp.post('/api/equipes', { ...base, chef_id: gest.id });
  assert.equal(r.body.code, 'CHEF_SANS_ROLE');
});

test('horaire : un créneau par jour, début avant la fin, format contrôlé ; [] = horaire de l’entité', async () => {
  const base = { code: 'H1', nom_fr: 'H', nom_nl: 'H' };
  assert.equal((await resp.post('/api/equipes', { ...base, horaire: [WEEKEND[0], { jour: 6, debut: '14:00', fin: '15:00' }] })).body.code, 'HORAIRE_INVALIDE');
  assert.equal((await resp.post('/api/equipes', { ...base, horaire: [{ jour: 1, debut: '16:00', fin: '08:00' }] })).body.code, 'HORAIRE_INVALIDE');
  assert.equal((await resp.post('/api/equipes', { ...base, horaire: [{ jour: 8, debut: '08:00', fin: '12:00' }] })).status, 400);
  assert.equal((await resp.post('/api/equipes', { ...base, horaire: [{ jour: 1, debut: '8:00', fin: '12:00' }] })).status, 400);
  const nuit = await resp.post('/api/equipes', { ...base, horaire: [{ jour: 5, debut: '18:00', fin: '24:00' }] });
  assert.equal(nuit.status, 201, 'fin à minuit admise');
  const r = await resp.put(`/api/equipes/${nuit.body.data.id}`, { horaire: [] });
  assert.deepEqual(r.body.data.horaire, []);
});

test('modification : membres et horaire remplacés ; journal des ajouts, retraits et de l’horaire ; rien sans changement', async () => {
  const r = await resp.put(`/api/equipes/${equipe.id}`, { membres: [o1.id, o2.id], horaire: [WEEKEND[0]], nom_nl: 'Netheid (weekend)' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body.data.membres.map((m) => m.id).sort(), [o1.id, o2.id].sort());
  assert.deepEqual(r.body.data.horaire, [WEEKEND[0]]);
  const d = JSON.parse(getDb().prepare("SELECT details_json FROM audit_log WHERE action = 'equipe.update' ORDER BY id DESC LIMIT 1").get().details_json);
  assert.deepEqual(d.membres_ajoutes, [o2.id]);
  assert.deepEqual(d.membres_retires, [chef.id]);
  assert.deepEqual(d.horaire, { avant: WEEKEND, apres: [WEEKEND[0]] });
  assert.deepEqual(d.apres, { nom_nl: 'Netheid (weekend)' });
  const n = () => getDb().prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'equipe.update'").get().n;
  const avant = n();
  await resp.put(`/api/equipes/${equipe.id}`, { membres: [o2.id, o1.id], horaire: [WEEKEND[0]], nom_nl: 'Netheid (weekend)' });
  assert.equal(n(), avant, 'aucune ligne sans changement');
  assert.equal((await gest.put(`/api/equipes/${equipe.id}`, { nom_fr: 'X' })).status, 403);
});

test('cloison : une équipe de l’autre entité n’est ni lue, ni modifiée, ni désactivée (403) ; listes séparées', async () => {
  assert.equal((await respB.get(`/api/equipes/${equipe.id}`)).status, 403);
  assert.equal((await respB.put(`/api/equipes/${equipe.id}`, { nom_fr: 'Pris' })).status, 403);
  assert.equal((await respB.del(`/api/equipes/${equipe.id}`, { motif: 'essai' })).status, 403);
  assert.equal((await respB.get('/api/equipes')).body.data.length, 0);
  assert.equal((await respB.get(`/api/ouvriers/${o1.id}`)).status, 404, 'un ouvrier de l’AA n’est pas un ouvrier de BB');
  assert.deepEqual((await respB.get('/api/ouvriers')).body.data.map((o) => o.id), [oB.id]);
});

test('désactivation avec motif : membres et horaire gardés ; réactivation ; deuxième désactivation refusée', async () => {
  const r = await resp.del(`/api/equipes/${equipe.id}`, { motif: 'Fin de la saison' });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.is_active, 0);
  assert.equal(r.body.data.motif_desactivation, 'Fin de la saison');
  assert.equal(r.body.data.membres.length, 2);
  assert.equal((await resp.del(`/api/equipes/${equipe.id}`, { motif: 'encore' })).status, 409);
  const o = (await resp.get(`/api/ouvriers/${o1.id}`)).body.data;
  assert.deepEqual(o.equipes, [], 'une équipe désactivée ne compte plus dans les équipes de l’ouvrier');
  const re = await resp.put(`/api/equipes/${equipe.id}`, { is_active: 1 });
  assert.equal(re.body.data.is_active, 1);
  assert.equal(re.body.data.motif_desactivation, null);
});

test('ouvriers : rôles de terrain seulement, équipes et équipes dirigées, filtre par équipe', async () => {
  const ids = (await gest.get('/api/ouvriers')).body.data.map((o) => o.id).sort();
  assert.deepEqual(ids, [chef.id, o1.id, o2.id].sort(), 'ni le demandeur, ni le gestionnaire, ni le responsable');
  assert.equal((await gest.get(`/api/ouvriers/${agent.id}`)).status, 404);
  const c = (await gest.get(`/api/ouvriers/${chef.id}`)).body.data;
  assert.deepEqual(c.chef_de.map((e) => e.id), [equipe.id]);
  assert.equal(c.peut_diriger, 1, 'le chef d’équipe peut diriger');
  assert.equal((await gest.get(`/api/ouvriers/${o1.id}`)).body.data.peut_diriger, 0, 'un ouvrier ne dirige pas');
  assert.deepEqual((await gest.get(`/api/ouvriers?equipe_id=${equipe.id}`)).body.data.map((o) => o.id).sort(), [o1.id, o2.id].sort());
});

test('profil d’un ouvrier : corps de métier et compétences de l’entité, valeurs actives ; journal nommé à la lecture', async () => {
  const elec = await valeur(resp, 'corps_metier', 'electricite');
  const ba4 = await valeur(resp, 'competence', 'ba4');
  const vca = await valeur(resp, 'competence', 'vca');
  assert.equal((await gest.put(`/api/ouvriers/${o1.id}`, { corps_metier_id: elec })).status, 403, 'réglé par le responsable');
  const r = await resp.put(`/api/ouvriers/${o1.id}`, { corps_metier_id: elec, competences: [ba4, vca] });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.corps_metier.code, 'electricite');
  assert.deepEqual(r.body.data.competences.map((x) => x.code), ['ba4', 'vca']);
  const d = JSON.parse(getDb().prepare("SELECT details_json FROM audit_log WHERE action = 'ouvrier.update' ORDER BY id DESC LIMIT 1").get().details_json);
  assert.deepEqual(d, { corps_metier: { avant: null, apres: elec }, competences: { avant: [], apres: [ba4, vca].sort((a, b) => a - b) } });
  // Journal lu par l'administrateur : chaque identifiant est nommé (personne, valeur de liste), éléments de liste compris.
  const j = (await admin.get('/api/audit?action=ouvrier.update&limit=1')).body.data[0];
  assert.equal(j.noms['corps_metier.apres'].nom_fr, 'Électricité');
  assert.deepEqual([j.noms['competences.apres.0'].code, j.noms['competences.apres.1'].code].sort(), ['ba4', 'vca']);
  const je = (await admin.get('/api/audit?action=equipe.update&limit=50')).body.data.find((x) => x.details.membres_ajoutes);
  assert.equal(je.noms['membres_ajoutes.0'].type, 'personne');
  // Valeurs refusées : autre liste, autre entité.
  const typeLieu = await valeur(resp, 'type_lieu', 'bureau');
  assert.equal((await resp.put(`/api/ouvriers/${o1.id}`, { corps_metier_id: typeLieu })).body.code, 'VALEUR_INVALIDE');
  const elecB = await valeur(respB, 'corps_metier', 'electricite');
  assert.equal((await resp.put(`/api/ouvriers/${o1.id}`, { competences: [elecB] })).body.code, 'VALEUR_INVALIDE');
  // Valeur désactivée : refusée pour un autre, gardée par celui qui l'a déjà.
  assert.equal((await resp.del(`/api/listes-valeurs/${vca}`, { motif: 'essai' })).status, 200);
  assert.equal((await resp.put(`/api/ouvriers/${o2.id}`, { competences: [vca] })).body.code, 'VALEUR_INVALIDE');
  assert.equal((await resp.put(`/api/ouvriers/${o1.id}`, { competences: [ba4, vca] })).status, 200);
  // Filtres par corps de métier et par compétence ; retrait du corps de métier.
  assert.deepEqual((await gest.get(`/api/ouvriers?corps_metier_id=${elec}`)).body.data.map((o) => o.id), [o1.id]);
  assert.deepEqual((await gest.get(`/api/ouvriers?competence_id=${ba4}`)).body.data.map((o) => o.id), [o1.id]);
  assert.equal((await resp.put(`/api/ouvriers/${o1.id}`, { corps_metier_id: null })).body.data.corps_metier, null);
});

test('MCP : liste des équipes et profil d’un ouvrier, avec la même cloison', async () => {
  const appel = async (c, name, args) => {
    const r = await c.mcp('tools/call', { name, arguments: args });
    return r.body.result;
  };
  const l = await appel(gest, 'list_equipes', {});
  assert.ok(!l.isError, JSON.stringify(l));
  assert.ok(JSON.parse(l.content[0].text).data.rows.some((e) => e.id === equipe.id));
  const refus = await appel(respB, 'get_equipe', { id: equipe.id });
  assert.ok(refus.isError, 'cloison par le MCP');
  const o = await appel(gest, 'get_ouvrier', { id: o1.id });
  assert.equal(JSON.parse(o.content[0].text).data.competences.length, 2);
});

test('démonstration : deux ouvriers, deux équipes et deux prestataires par entité ; rejouable ; retirés et rétablis', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { spawnSync } = require('child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gmao-demo-equipes-'));
  const env = { PATH: process.env.PATH, NODE_ENV: 'test', APP_TEST_MODE: '1', DB_PATH: path.join(dir, 'd.db'), DEMO_ALLOWED: '1' };
  const run = (args = [], code = '') => spawnSync(process.execPath, code ? ['-e', code, ...args] : ['src/demo.js', ...args], { cwd: path.join(__dirname, '..'), env, encoding: 'utf8' });
  // Installation de la 0.18.0 simulée : entités et administrateur, listes de valeurs sans corps de métier (demo.js les crée).
  const install = run([], `require('./src/database').initDb().then((db) => {
    const e1 = db.prepare("INSERT INTO entites (code, nom_fr, nom_nl) VALUES ('AC', 'A', 'A')").run().lastInsertRowid;
    db.prepare("INSERT INTO entites (code, nom_fr, nom_nl) VALUES ('CPAS', 'C', 'C')").run();
    db.prepare("INSERT INTO users (email, first_name, last_name, user_role, entite_id) VALUES ('x@exemple.test', 'x', 'x', 'admin', ?)").run(e1);
    require('./src/database').saveNow();
  })`);
  assert.equal(install.status, 0, install.stderr);
  const r1 = run();
  assert.equal(r1.status, 0, r1.stderr);
  assert.match(r1.stdout, /4 équipe\(s\) de démonstration créée\(s\)/);
  assert.match(r1.stdout, /4 prestataire\(s\) de démonstration créé\(s\)/);
  assert.match(r1.stdout, /ouvrier-3\.cpas@demo\.invalid/);
  // La requête passe en argument du processus (process.argv[1]), jamais recopiée dans le code exécuté (CodeQL, js/bad-code-sanitization).
  const q = (sql) => JSON.parse(run([sql], "require('./src/database').initDb().then((db) => console.log(JSON.stringify(db.prepare(process.argv[1]).all())))").stdout.trim().split('\n').pop());
  const eq = q(`SELECT q.code, q.is_demo, c.email AS chef, (SELECT group_concat(u.email, ',') FROM equipe_membres m JOIN users u ON u.id = m.user_id WHERE m.equipe_id = q.id) AS membres,
    (SELECT group_concat(h.jour || ' ' || h.debut || '-' || h.fin, ',') FROM equipe_horaires h WHERE h.equipe_id = q.id) AS horaire FROM equipes q LEFT JOIN users c ON c.id = q.chef_id ORDER BY q.code`);
  assert.deepEqual(eq.map((x) => x.code), ['AC-BAT', 'AC-PROP', 'CPAS-BAT', 'CPAS-PROP']);
  assert.ok(eq.every((x) => x.is_demo === 1));
  const by = Object.fromEntries(eq.map((x) => [x.code, x]));
  assert.equal(by['AC-BAT'].chef, 'chef-equipe.ac@demo.invalid');
  assert.deepEqual(by['AC-BAT'].membres.split(',').sort(), ['ouvrier-2.ac@demo.invalid', 'ouvrier.ac@demo.invalid']);
  assert.equal(by['AC-BAT'].horaire, null, 'horaire de l’entité');
  assert.equal(by['CPAS-PROP'].horaire, '6 07:00-13:00,7 07:00-13:00', 'samedi et dimanche');
  const prof = q("SELECT u.email, v.code FROM ouvrier_profils p JOIN users u ON u.id = p.user_id JOIN listes_valeurs v ON v.id = p.corps_metier_id WHERE u.email LIKE '%.ac@%' ORDER BY u.email");
  assert.deepEqual(prof.map((x) => `${x.email.split('.')[0]}:${x.code}`), ['chef-equipe:polyvalent', 'ouvrier-2:plomberie', 'ouvrier-3:proprete', 'ouvrier:electricite']);
  run([], `require('./src/database').initDb().then((db) => { db.prepare("UPDATE equipes SET nom_fr = 'Corrigé' WHERE code = 'AC-BAT'").run(); require('./src/database').saveNow(); })`);
  assert.match(run().stdout, /0 équipe\(s\) de démonstration créée\(s\)/);
  assert.equal(q("SELECT nom_fr FROM equipes WHERE code = 'AC-BAT'")[0].nom_fr, 'Corrigé', 'équipe existante gardée');
  run(['--retirer']);
  assert.equal(q('SELECT COUNT(*) AS n FROM equipes WHERE is_active = 1')[0].n, 0);
  assert.equal(q('SELECT COUNT(*) AS n FROM prestataires WHERE is_active = 1')[0].n, 0);
  run();
  assert.equal(q('SELECT COUNT(*) AS n FROM equipes WHERE is_active = 1')[0].n, 4, 'rétablies à la relance');
  assert.equal(q('SELECT COUNT(*) AS n FROM prestataires WHERE is_active = 1 AND numero_entreprise IS NULL')[0].n, 4, 'prestataires rétablis, sans numéro');
  assert.ok(q("SELECT courriel FROM prestataires").every((p) => p.courriel.endsWith('@demo.invalid')));
});
