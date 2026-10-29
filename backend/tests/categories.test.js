/**
 * Catégories d'intervention en arbre (cahier des charges REF-06, DEM-15, PRI-01, LNG-02 ; décision D-11).
 * Arbre livré, héritage de la priorité et de la validation, règles de l'arbre, droits, désactivation, journal, MCP.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { startServer, setup, person } = require('./helpers');

let srv;
let admin;
let ea;
let eb;
let agent;
let gest;
let resp;

const CATALOGUE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'categories.json'), 'utf8'));
const tool = async (c, name, args) => JSON.parse((await c.mcp('tools/call', { name, arguments: args })).body.result.content[0].text);
const parCode = async (c, code) => (await c.get(`/api/categories?q=${code}&limit=200`)).body.data.find((x) => x.code === code);

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  agent = await person(srv.base, admin, 'c.agent@exemple.test', ea.id);
  gest = await person(srv.base, admin, 'c.gest@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  resp = await person(srv.base, admin, 'c.resp@exemple.test', ea.id, [[ea.id, 'responsable']]);
});
after(() => srv.stop());

test('catalogue livré : icônes connues, codes uniques, libellés FR et NL, priorités P1 à P4', () => {
  const icones = new Set(CATALOGUE.icones.map((i) => i.code));
  assert.equal(icones.size, CATALOGUE.icones.length);
  for (const i of CATALOGUE.icones) assert.ok(i.libelle_fr.trim() && i.libelle_nl.trim(), i.code);
  const codes = new Set();
  for (const d of CATALOGUE.defauts) {
    for (const c of [d, ...d.natures]) {
      assert.ok(!codes.has(c.code), `code en double : ${c.code}`);
      codes.add(c.code);
      assert.ok(icones.has(c.icone), `${c.code} : icône ${c.icone}`);
      assert.ok(c.libelle_fr.trim() && c.libelle_nl.trim(), c.code);
      if (c.priorite_defaut !== undefined) assert.match(c.priorite_defaut, /^P[1-4]$/, c.code);
    }
    assert.ok([0, 1].includes(d.validation), d.code);
  }
  assert.equal(CATALOGUE.defauts.length, 8);
  assert.equal(codes.size, 35);
});

test('arbre livré dans chaque entité, à l’installation comme à la création d’une entité', async () => {
  for (const ent of [ea, eb]) {
    const { getDb } = require('../src/database');
    const n = getDb().prepare('SELECT COUNT(*) AS n FROM categories WHERE entite_id = ?').get(ent.id).n;
    assert.equal(n, 35, ent.code);
  }
  const a = (await agent.get('/api/categories/arbre')).body.data;
  assert.equal(a.total, 35);
  assert.deepEqual(a.domaines.map((d) => d.code), ['electricite', 'plomberie', 'chauffage', 'batiment', 'securite', 'mobilier', 'exterieurs', 'amenagement']);
  assert.deepEqual(a.domaines[0].natures.map((n) => n.code), ['eclairage', 'prises', 'panne_courant', 'tableau_electrique']);
});

test('priorité et validation en vigueur : propres à la nature, sinon celles du domaine', async () => {
  const a = (await agent.get('/api/categories/arbre')).body.data;
  const nat = Object.fromEntries(a.domaines.flatMap((d) => d.natures).map((n) => [n.code, n]));
  assert.equal(nat.eclairage.priorite_defaut, null);
  assert.equal(nat.eclairage.priorite_effective, 'P3');
  assert.equal(nat.fuite_eau.priorite_effective, 'P2');
  assert.equal(nat.danger.priorite_effective, 'P1');
  assert.equal(nat.alarme_incendie.priorite_effective, 'P2');
  assert.equal(nat.demenagement.priorite_effective, 'P4');
  assert.equal(nat.demenagement.validation_effective, 1, 'aménagement, déménagement, achat : validation du chef de service');
  assert.equal(nat.danger.validation_effective, 0, 'sécurité : envoi direct');
  assert.equal(nat.eclairage.parent_code, 'electricite');
  assert.equal(nat.eclairage.niveau, 'nature');
  assert.equal(a.domaines[0].niveau, 'domaine');
});

test('lecture pour tout rôle de l’entité ; écriture réservée au responsable', async () => {
  assert.equal((await agent.get('/api/categories')).status, 200);
  const corps = { code: 'essai', libelle_fr: 'Essai', libelle_nl: 'Proef' };
  for (const c of [agent, gest]) {
    const r = await c.post('/api/categories', corps);
    assert.equal(r.status, 403);
    assert.equal(r.body.code, 'FORBIDDEN');
  }
  const id = (await parCode(resp, 'eclairage')).id;
  assert.equal((await gest.put(`/api/categories/${id}`, { libelle_fr: 'x' })).status, 403);
  assert.equal((await gest.del(`/api/categories/${id}`, { motif: 'x' })).status, 403);
  assert.equal((await admin.get('/api/categories')).status, 200, 'l’administrateur lit comme demandeur de son entité');
  assert.equal((await admin.post('/api/categories', corps)).status, 403, 'aucun accès métier implicite');
});

test('création d’un domaine : priorité P3 et envoi direct par défaut ; d’une nature : reprise du domaine', async () => {
  const d = await resp.post('/api/categories', { code: 'nettoyage', libelle_fr: 'Nettoyage', libelle_nl: 'Schoonmaak', icone: 'nettoyage' });
  assert.equal(d.status, 201, JSON.stringify(d.body));
  assert.equal(d.body.data.niveau, 'domaine');
  assert.equal(d.body.data.priorite_defaut, 'P3');
  assert.equal(d.body.data.validation, 0);
  assert.equal(d.body.data.ordre, 90);
  const n = await resp.post('/api/categories', { parent_id: d.body.data.id, code: 'vitres', libelle_fr: 'Vitres', libelle_nl: 'Ruiten' });
  assert.equal(n.status, 201);
  assert.equal(n.body.data.icone, 'autre');
  assert.equal(n.body.data.priorite_defaut, null);
  assert.equal(n.body.data.priorite_effective, 'P3');
  assert.equal(n.body.data.ordre, 10);
  // Le domaine change de priorité : la nature qui en hérite suit.
  await resp.put(`/api/categories/${d.body.data.id}`, { priorite_defaut: 'P4', validation: 1, delai_fin_jours: 20 });
  const lu = (await resp.get(`/api/categories/${n.body.data.id}`)).body.data;
  assert.equal(lu.priorite_effective, 'P4');
  assert.equal(lu.validation_effective, 1);
  assert.equal(lu.delai_fin_jours_effectif, 20);
  // Valeurs propres de la nature, puis retour à l'héritage.
  await resp.put(`/api/categories/${n.body.data.id}`, { priorite_defaut: 'P2', validation: 0, delai_fin_jours: 3 });
  let v = (await resp.get(`/api/categories/${n.body.data.id}`)).body.data;
  assert.deepEqual([v.priorite_effective, v.validation_effective, v.delai_fin_jours_effectif], ['P2', 0, 3]);
  await resp.put(`/api/categories/${n.body.data.id}`, { priorite_defaut: null, validation: null, delai_fin_jours: null });
  v = (await resp.get(`/api/categories/${n.body.data.id}`)).body.data;
  assert.deepEqual([v.priorite_effective, v.validation_effective, v.delai_fin_jours_effectif], ['P4', 1, 20]);
});

test('règles de l’arbre : deux niveaux, domaine toujours complet, code unique dans l’entité', async () => {
  const dom = await parCode(resp, 'electricite');
  const nat = await parCode(resp, 'eclairage');
  const sousNature = await resp.post('/api/categories', { parent_id: nat.id, code: 'trop_bas', libelle_fr: 'x', libelle_nl: 'x' });
  assert.equal(sousNature.body.code, 'CATEGORIE_PARENT');
  assert.equal((await resp.put(`/api/categories/${dom.id}`, { parent_id: (await parCode(resp, 'plomberie')).id })).body.code, 'CATEGORIE_PARENT');
  assert.equal((await resp.put(`/api/categories/${nat.id}`, { parent_id: nat.id })).body.code, 'CATEGORIE_PARENT');
  assert.equal((await resp.put(`/api/categories/${dom.id}`, { priorite_defaut: null })).body.code, 'CATEGORIE_DOMAINE');
  assert.equal((await resp.post('/api/categories', { code: 'sans_prio', libelle_fr: 'x', libelle_nl: 'x', validation: null })).body.code, 'CATEGORIE_DOMAINE');
  const double = await resp.post('/api/categories', { code: 'eclairage', libelle_fr: 'x', libelle_nl: 'x' });
  assert.equal(double.status, 409);
  assert.equal(double.body.code, 'CATEGORIE_CODE_DUPLICATE');
  assert.equal((await resp.post('/api/categories', { code: 'x1', libelle_fr: 'x', libelle_nl: 'x', icone: 'licorne' })).body.code, 'VALIDATION');
  assert.equal((await resp.post('/api/categories', { code: 'x2', libelle_fr: 'x', libelle_nl: 'x', priorite_defaut: 'P5' })).body.code, 'VALIDATION');
  assert.equal((await resp.post('/api/categories', { code: 'x3', libelle_fr: 'x', libelle_nl: '' })).body.code, 'VALIDATION', 'libellé NL obligatoire');
  assert.equal((await resp.post('/api/categories', { code: 'x4', libelle_fr: 'x', libelle_nl: 'x', is_active: 0 })).body.code, 'VALIDATION');
});

test('une nature change de domaine', async () => {
  const nat = await parCode(resp, 'montage');
  const ext = await parCode(resp, 'exterieurs');
  const r = await resp.put(`/api/categories/${nat.id}`, { parent_id: ext.id });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.parent_code, 'exterieurs');
  await resp.put(`/api/categories/${nat.id}`, { parent_id: (await parCode(resp, 'mobilier')).id });
});

test('désactivation : domaine refusé tant qu’il a des natures actives ; arbre des tuiles sans les inactifs ; réactivation', async () => {
  const dom = await parCode(resp, 'mobilier');
  const refus = await resp.del(`/api/categories/${dom.id}`, { motif: 'Essai' });
  assert.equal(refus.status, 409);
  assert.equal(refus.body.code, 'CATEGORIE_ENFANTS');
  assert.deepEqual(refus.body.details, ['2']);
  for (const code of ['reparation_mobilier', 'montage']) {
    const n = await parCode(resp, code);
    assert.equal((await resp.del(`/api/categories/${n.id}`, { motif: 'Essai' })).body.data.is_active, 0);
  }
  const d = await resp.del(`/api/categories/${dom.id}`, { motif: 'Plus utilisé' });
  assert.equal(d.body.data.is_active, 0);
  assert.equal(d.body.data.motif_desactivation, 'Plus utilisé');
  assert.equal((await resp.del(`/api/categories/${dom.id}`, { motif: 'Encore' })).body.code, 'CANCELLED');
  assert.equal((await resp.put(`/api/categories/${dom.id}`, { libelle_fr: 'x' })).body.code, 'CANCELLED');
  const tuiles = (await agent.get('/api/categories/arbre')).body.data;
  assert.ok(!tuiles.domaines.some((x) => x.code === 'mobilier'));
  const tout = (await resp.get('/api/categories/arbre?inclure_inactifs=1')).body.data;
  assert.equal(tout.domaines.find((x) => x.code === 'mobilier').natures.length, 2);
  // Le démarrage suivant ne recrée ni ne réactive rien.
  require('../src/services/categories').seedAll();
  assert.equal((await parCode(resp, 'mobilier')).is_active, 0);
  const montage = await parCode(resp, 'montage');
  assert.equal((await resp.put(`/api/categories/${montage.id}`, { is_active: 1 })).body.code, 'CATEGORIE_PARENT_INACTIF');
  assert.equal((await resp.put(`/api/categories/${dom.id}`, { is_active: 1 })).body.data.is_active, 1);
  const re = await resp.put(`/api/categories/${montage.id}`, { is_active: 1 });
  assert.equal(re.body.data.is_active, 1);
  assert.equal(re.body.data.motif_desactivation, null);
});

test('liste filtrée par niveau, domaine, priorité en vigueur et recherche FR ou NL', async () => {
  const dom = (await agent.get('/api/categories?niveau=domaine&limit=200')).body;
  assert.ok(dom.data.every((c) => c.niveau === 'domaine'));
  const p1 = (await agent.get('/api/categories?priorite=P1')).body.data;
  assert.deepEqual(p1.map((c) => c.code), ['danger']);
  const plomb = await parCode(agent, 'plomberie');
  assert.equal((await agent.get(`/api/categories?parent_id=${plomb.id}`)).body.pagination.total, 4);
  assert.equal((await agent.get('/api/categories?q=Waterlek')).body.data[0].code, 'fuite_eau');
});

test('journal d’audit : entité, canal, création, modification, réactivation et désactivation', async () => {
  const { getDb } = require('../src/database');
  const rows = getDb().prepare("SELECT action, entite_id, channel FROM audit_log WHERE entity_type = 'categorie' ORDER BY id").all();
  const actions = new Set(rows.map((r) => r.action));
  for (const a of ['categorie.create', 'categorie.update', 'categorie.deactivate', 'categorie.reactivate']) assert.ok(actions.has(a), a);
  assert.ok(rows.every((r) => r.entite_id === ea.id && r.channel === 'api'));
});

test('MCP : lecture, création et désactivation en deux appels sous les droits de la personne', async () => {
  const arbre = await tool(agent, 'get_categories_arbre', {});
  assert.ok(arbre.data.domaines.length >= 8);
  assert.equal((await tool(agent, 'create_categorie', { code: 'mcp_x', libelle_fr: 'x', libelle_nl: 'x' })).code, 'FORBIDDEN');
  const c = await tool(resp, 'create_categorie', { code: 'par_mcp', libelle_fr: 'Par MCP', libelle_nl: 'Via MCP', priorite_defaut: 'P2' });
  assert.equal(c.data.priorite_effective, 'P2');
  const p = await tool(resp, 'prepare_deactivate_categorie', { id: c.data.id, motif: 'Essai' });
  assert.equal(p.data.categorie.code, 'par_mcp');
  assert.equal((await tool(resp, 'confirm_deactivate_categorie', { confirmation_token: p.data.confirmation_token })).data.is_active, 0);
  assert.equal((await tool(agent, 'prepare_deactivate_categorie', { id: c.data.id, motif: 'x' })).code, 'FORBIDDEN');
  const { getDb } = require('../src/database');
  assert.equal(getDb().prepare("SELECT channel FROM audit_log WHERE action = 'categorie.create' AND entity_id = ?").get(c.data.id).channel, 'mcp');
});

test('migration 004 sur une base 0.3.1 : arbre et priorités livrés à chaque entité active, rien d’autre touché, pas de relance', () => {
  const os = require('os');
  const { spawnSync } = require('child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gmao-migr4-'));
  const env = { PATH: process.env.PATH, NODE_ENV: 'test', APP_TEST_MODE: '1', DB_PATH: path.join(dir, 'm.db') };
  const run = (code) => spawnSync(process.execPath, ['-e', code], { cwd: path.join(__dirname, '..'), env, encoding: 'utf8' });
  // Base 0.3.1 : migrations 001 à 003, deux entités actives (AC, CPAS) et une désactivée, un lieu.
  const prep = run(`
    const initSqlJs = require('sql.js'); const fs = require('fs');
    const { MIGRATIONS } = require('./src/database');
    initSqlJs().then((SQL) => {
      const db = new SQL.Database();
      db.run("CREATE TABLE schema_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, applied_at TEXT DEFAULT (datetime('now')))");
      for (const [name, sql] of MIGRATIONS.slice(0, 3)) { for (const s of sql.split(';').map((x) => x.trim()).filter(Boolean)) db.run(s); db.run('INSERT INTO schema_migrations (name) VALUES (?)', [name]); }
      db.run("INSERT INTO entites (code, nom_fr, nom_nl) VALUES ('AC', 'Administration communale', 'Gemeentebestuur')");
      db.run("INSERT INTO entites (code, nom_fr, nom_nl) VALUES ('CPAS', 'CPAS', 'OCMW')");
      db.run("INSERT INTO entites (code, nom_fr, nom_nl, is_active) VALUES ('OLD', 'Ancienne', 'Oud', 0)");
      db.run("INSERT INTO lieux (entite_id, nature, code, nom_fr, nom_nl) VALUES (1, 'site', 'S1', 'Site', 'Site')");
      fs.writeFileSync(process.env.DB_PATH, Buffer.from(db.export()));
    });`);
  assert.equal(prep.status, 0, prep.stderr);
  const up = run(`require('./src/database').initDb().then((db) => {
    console.log(JSON.stringify({
      migrations: db.prepare('SELECT name FROM schema_migrations ORDER BY id').all().map((m) => m.name),
      parEntite: db.prepare('SELECT e.code, COUNT(c.id) AS n FROM entites e LEFT JOIN categories c ON c.entite_id = e.id GROUP BY e.code ORDER BY e.code').all(),
      lieux: db.prepare('SELECT COUNT(*) AS n FROM lieux').get().n,
      priorites: db.prepare('SELECT e.code, COUNT(p.id) AS n FROM priorites p JOIN entites e ON e.id = p.entite_id GROUP BY e.code ORDER BY e.code').all(),
      questions: db.prepare('SELECT e.code, COUNT(q.id) AS n FROM questions_categorie q JOIN entites e ON e.id = q.entite_id GROUP BY e.code ORDER BY e.code').all(),
    }));
  })`);
  assert.equal(up.status, 0, up.stderr);
  assert.match(up.stdout, /\[DB\] Migration 004_referentiel_demandes appliquée/);
  const out = JSON.parse(up.stdout.trim().split('\n').pop());
  assert.ok(out.migrations.includes('004_referentiel_demandes'));
  assert.equal(out.migrations.at(-1), '006_demandes_formulaire', 'les migrations suivantes passent aussi');
  assert.deepEqual(out.parEntite, [{ code: 'AC', n: 35 }, { code: 'CPAS', n: 35 }, { code: 'OLD', n: 0 }]);
  assert.deepEqual(out.priorites, [{ code: 'AC', n: 4 }, { code: 'CPAS', n: 4 }]);
  assert.deepEqual(out.questions, [{ code: 'AC', n: 3 }, { code: 'CPAS', n: 3 }], 'questions livrées (DEM-05, 0.7.0)');
  assert.equal(out.lieux, 1);
  const again = run(`require('./src/database').initDb().then((db) => console.log('n=' + db.prepare('SELECT COUNT(*) AS n FROM categories').get().n))`);
  assert.equal(again.status, 0, again.stderr);
  assert.doesNotMatch(again.stdout, /Migration 004/);
  assert.match(again.stdout, /n=70/);
});
