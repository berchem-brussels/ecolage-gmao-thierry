/**
 * Corps de métier par défaut des catégories (REF-06) et à la qualification (GES-04) — 0.19.0, étape 15, point 4.
 * Catalogue livré, héritage du domaine, réglage par le responsable, cloison des valeurs, proposition à la qualification,
 * choix du gestionnaire, champ interne au service, journal nommé, et migration 016 sur une base de la 0.18.0.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { startServer, setup, person } = require('./helpers');

let srv;
let admin;
let ea;
let eb;
let resp;
let gest;
let agent;
let respB;
let lieu;

const cat = async (c, code) => (await c.get(`/api/categories?q=${code}&limit=200`)).body.data.find((x) => x.code === code);
const valeur = async (c, liste, code) => (await c.get(`/api/listes-valeurs?liste=${liste}&limit=200`)).body.data.find((v) => v.code === code).id;

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  resp = await person(srv.base, admin, 'resp.cc@exemple.test', ea.id, [[ea.id, 'responsable']]);
  gest = await person(srv.base, admin, 'gest.cc@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  agent = await person(srv.base, admin, 'agent.cc@exemple.test', ea.id);
  respB = await person(srv.base, admin, 'respb.cc@exemple.test', eb.id, [[eb.id, 'responsable']]);
  lieu = (await gest.post('/api/lieux', { nature: 'site', code: 'CC', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis' })).body.data.id;
});
after(() => srv.stop());

test('catalogue livré : un corps de métier par domaine ; une nature prend le sien ou celui de son domaine', async () => {
  const elec = await cat(resp, 'electricite');
  assert.equal(elec.corps_metier_code, 'electricite');
  const eclairage = await cat(resp, 'eclairage');
  assert.equal(eclairage.corps_metier_id, null, 'pas de valeur propre');
  assert.equal(eclairage.corps_metier_effectif_id, elec.corps_metier_id, 'celle du domaine');
  assert.equal(eclairage.corps_metier_libelle_fr, 'Électricité');
  assert.equal((await cat(resp, 'porte_serrure')).corps_metier_code, 'serrurerie', 'valeur propre d’une nature');
  assert.equal((await cat(resp, 'alarme_incendie')).corps_metier_code, 'electricite');
  assert.equal((await cat(resp, 'extincteur')).corps_metier_code, 'polyvalent', 'domaine Sécurité');
  const elecB = await cat(respB, 'electricite');
  assert.notEqual(elecB.corps_metier_id, elec.corps_metier_id, 'chaque entité a sa propre valeur');
});

test('réglage par le responsable : valeur de la liste corps_metier de l’entité seulement ; null rend celui du domaine ; journal nommé', async () => {
  const fuite = await cat(resp, 'fuite_eau');
  const plomb = await valeur(resp, 'corps_metier', 'plomberie');
  const chauf = await valeur(resp, 'corps_metier', 'chauffage');
  const bureau = await valeur(resp, 'type_lieu', 'bureau');
  const plombB = await valeur(respB, 'corps_metier', 'plomberie');
  assert.equal((await resp.put(`/api/categories/${fuite.id}`, { corps_metier_id: bureau })).body.code, 'VALEUR_INVALIDE', 'autre liste');
  assert.equal((await resp.put(`/api/categories/${fuite.id}`, { corps_metier_id: plombB })).body.code, 'VALEUR_INVALIDE', 'autre entité');
  assert.equal((await gest.put(`/api/categories/${fuite.id}`, { corps_metier_id: chauf })).status, 403);
  const r = await resp.put(`/api/categories/${fuite.id}`, { corps_metier_id: chauf });
  assert.equal(r.body.data.corps_metier_code, 'chauffage');
  const j = (await admin.get('/api/audit?action=categorie.update&limit=1')).body.data[0];
  assert.equal(j.noms['apres.corps_metier_id'].nom_fr, 'Chauffage et ventilation');
  const remis = await resp.put(`/api/categories/${fuite.id}`, { corps_metier_id: null });
  assert.equal(remis.body.data.corps_metier_effectif_id, plomb, 'retour au domaine Plomberie');
  const n = await resp.post('/api/categories', { parent_id: (await cat(resp, 'plomberie')).id, code: 'adoucisseur', libelle_fr: 'Adoucisseur', libelle_nl: 'Waterverzachter', corps_metier_id: chauf });
  assert.equal(n.status, 201, JSON.stringify(n.body));
  assert.equal(n.body.data.corps_metier_code, 'chauffage');
});

test('qualification : corps de métier de la catégorie proposé, gardé, changé ou retiré ; interne au service ; journal nommé', async () => {
  const eclairage = await cat(agent, 'eclairage');
  const d = (await agent.post('/api/demandes', { lieu_id: lieu, categorie_id: eclairage.id, description: 'La lampe du couloir clignote.' })).body.data;
  assert.equal(d.corps_metier_id, undefined, 'le demandeur ne le voit pas');
  const base = { categorie_id: eclairage.id, lieu_id: lieu, priorite: 'P3' };
  let q = await gest.post(`/api/demandes/${d.id}/qualifier`, base);
  assert.equal(q.status, 200, JSON.stringify(q.body));
  assert.equal(q.body.data.corps_metier_code, 'electricite', 'proposé par la catégorie');
  const poly = await valeur(gest, 'corps_metier', 'polyvalent');
  q = await gest.post(`/api/demandes/${d.id}/qualifier`, { ...base, corps_metier_id: poly });
  assert.equal(q.body.data.corps_metier_code, 'polyvalent', 'choix du gestionnaire');
  const j = (await admin.get('/api/audit?action=demande.qualifier&limit=1')).body.data[0];
  assert.equal(j.noms['apres.corps_metier_id'].nom_fr, 'Polyvalent');
  q = await gest.post(`/api/demandes/${d.id}/qualifier`, base);
  assert.equal(q.body.data.corps_metier_code, 'polyvalent', 'absent : celui déjà noté reste');
  q = await gest.post(`/api/demandes/${d.id}/qualifier`, { ...base, corps_metier_id: null });
  assert.equal(q.body.data.corps_metier_id, null, 'retiré');
  const autre = await valeur(respB, 'corps_metier', 'polyvalent');
  assert.equal((await gest.post(`/api/demandes/${d.id}/qualifier`, { ...base, corps_metier_id: autre })).body.code, 'VALEUR_INVALIDE');
  const vue = (await agent.get(`/api/demandes/${d.id}`)).body.data;
  assert.ok(!('corps_metier_id' in vue) && !('corps_metier_libelle_fr' in vue), 'champ interne au service');
  assert.equal((await gest.get(`/api/demandes/${d.id}`)).body.data.corps_metier_id, null);
});

test('qualification : un défaut de catégorie désactivé dans la liste n’est pas proposé, sans refus', async () => {
  const prises = await cat(agent, 'prises');
  const d = (await agent.post('/api/demandes', { lieu_id: lieu, categorie_id: prises.id, description: 'La prise du bureau ne marche plus.' })).body.data;
  const elec = await valeur(resp, 'corps_metier', 'electricite');
  assert.equal((await resp.del(`/api/listes-valeurs/${elec}`, { motif: 'essai' })).status, 200);
  try {
    const q = await gest.post(`/api/demandes/${d.id}/qualifier`, { categorie_id: prises.id, lieu_id: lieu, priorite: 'P3' });
    assert.equal(q.status, 200, JSON.stringify(q.body));
    assert.equal(q.body.data.corps_metier_id, null);
  } finally { await resp.put(`/api/listes-valeurs/${elec}`, { is_active: 1 }); }
});

test('migration 016 sur une base de la 0.18.0 : catégories livrées complétées, réglage existant gardé', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gmao-016-'));
  const env = { PATH: process.env.PATH, NODE_ENV: 'test', APP_TEST_MODE: '1', DB_PATH: path.join(dir, 'd.db') };
  const run = (code) => spawnSync(process.execPath, ['-e', code], { cwd: path.join(__dirname, '..'), env, encoding: 'utf8' });
  // Base 0.18.0 : migrations 001 à 015, une entité, deux catégories livrées et une créée par le responsable (« adoucisseur »),
  // sans colonne corps_metier_id ni liste des corps de métier.
  const prep = run(`
    const initSqlJs = require('sql.js'); const fs = require('fs');
    const { MIGRATIONS } = require('./src/database');
    initSqlJs().then((SQL) => {
      const db = new SQL.Database();
      db.run("CREATE TABLE schema_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, applied_at TEXT DEFAULT (datetime('now')))");
      for (const [name, sql] of MIGRATIONS.slice(0, 15)) { for (const s of sql.split(';').map((x) => x.trim()).filter(Boolean)) db.run(s); db.run('INSERT INTO schema_migrations (name) VALUES (?)', [name]); }
      db.run("INSERT INTO entites (code, nom_fr, nom_nl) VALUES ('AC', 'A', 'A')");
      db.run("INSERT INTO categories (entite_id, code, libelle_fr, libelle_nl, icone, priorite_defaut, validation) VALUES (1, 'electricite', 'É', 'E', 'eclair', 'P3', 0)");
      db.run("INSERT INTO categories (entite_id, parent_id, code, libelle_fr, libelle_nl, icone) VALUES (1, 1, 'porte_serrure', 'P', 'P', 'serrure')");
      db.run("INSERT INTO categories (entite_id, parent_id, code, libelle_fr, libelle_nl, icone) VALUES (1, 1, 'adoucisseur', 'A', 'A', 'autre')");
      fs.writeFileSync(process.env.DB_PATH, Buffer.from(db.export()));
    });`);
  assert.equal(prep.status, 0, prep.stderr);
  const out = run(`require('./src/database').initDb().then((d) => console.log(JSON.stringify({
    migration: d.prepare('SELECT name FROM schema_migrations ORDER BY id DESC LIMIT 1').get().name,
    cats: d.prepare("SELECT c.code, v.code AS corps FROM categories c LEFT JOIN listes_valeurs v ON v.id = c.corps_metier_id ORDER BY c.code").all(),
    demandes: d.prepare("PRAGMA table_info(demandes)").all().some((c) => c.name === 'corps_metier_id') })))`);
  assert.equal(out.status, 0, out.stderr);
  const r = JSON.parse(out.stdout.trim().split('\n').pop());
  assert.equal(r.migration, '016_equipes_prestataires');
  assert.ok(r.demandes, 'colonne des demandes');
  const by = Object.fromEntries(r.cats.map((c) => [c.code, c.corps]));
  assert.equal(by.electricite, 'electricite');
  assert.equal(by.porte_serrure, 'serrurerie');
  assert.equal(by.adoucisseur, null, 'catégorie hors catalogue : rien');
});
