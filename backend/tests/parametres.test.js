/**
 * Paramètres de l'instance (cahier des charges ADM-01 ; standard v3.2, sections 11.4 et 17.3) et migration 003_parametres.
 * Réservés à l'administrateur ; valeur contrôlée selon le catalogue ; changement visible sans redémarrage sur la page
 * de connexion ; journal d'audit avec l'ancienne et la nouvelle valeur ; retour au défaut.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { startServer, client, setup, person, INSTALL } = require('./helpers');
const { getDb } = require('../src/database');
const { VERSION } = require('../src/config');

let srv;
let admin;
let ea;
let agent;
const parse = (r) => JSON.parse(r.body.result.content[0].text);
const tool = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));

before(async () => {
  srv = await startServer();
  ({ admin, ea } = await setup(srv.base));
  agent = await person(srv.base, admin, 'p.agent@exemple.test', ea.id, [[ea.id, 'responsable']]);
});
after(() => srv.stop());

test('liste des paramètres : catalogue complet, libellés et descriptions FR et NL, défaut et valeur', async () => {
  const r = await admin.get('/api/parametres');
  assert.equal(r.status, 200);
  const cles = r.body.data.map((p) => p.cle);
  assert.deepEqual(cles, ['app.name_fr', 'app.name_nl', 'app.organisation_fr', 'app.organisation_nl', 'app.support_contact', 'app.default_lang', 'app.default_ui_mode']);
  for (const p of r.body.data) {
    for (const f of ['libelle_fr', 'libelle_nl', 'description_fr', 'description_nl']) assert.ok(p[f], `${p.cle} ${f}`);
    assert.notEqual(p.defaut, undefined, `${p.cle} a un défaut livré`);
  }
  const org = r.body.data.find((p) => p.cle === 'app.organisation_fr');
  assert.equal(org.valeur, INSTALL.organisation_fr, 'valeur saisie à l’installation');
  assert.equal(org.est_defaut, false);
  assert.equal(r.body.data.find((p) => p.cle === 'app.default_lang').est_defaut, true);
  assert.equal(r.body.pagination.total, 7);
  assert.equal((await admin.get('/api/parametres?groupe=affichage')).body.data.length, 2);
});

test('réservés à l’administrateur, même au responsable du service technique', async () => {
  assert.equal((await agent.get('/api/parametres')).status, 403);
  assert.equal((await agent.get('/api/parametres/app.name_fr')).status, 403);
  assert.equal((await agent.put('/api/parametres/app.name_fr', { valeur: 'x' })).status, 403);
  assert.equal((await agent.del('/api/parametres/app.name_fr', {})).status, 403);
  assert.equal((await tool(agent, 'list_parametres')).code, 'FORBIDDEN');
});

test('correction du nom du pouvoir local : visible aussitôt sur la page de connexion, inscrite au journal', async () => {
  const r = await admin.put('/api/parametres/app.organisation_fr', { valeur: '  Commune corrigée  ' });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.valeur, 'Commune corrigée', 'espaces retirés');
  const pub = await client(srv.base).get('/api/settings/public');
  assert.equal(pub.body.data.app.organisation_fr, 'Commune corrigée');
  const a = getDb().prepare("SELECT user_id, details_json FROM audit_log WHERE action = 'parametre.update' ORDER BY id DESC").get();
  assert.deepEqual(JSON.parse(a.details_json), { cle: 'app.organisation_fr', avant: INSTALL.organisation_fr, apres: 'Commune corrigée' });
  const n = getDb().prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'parametre.update'").get().n;
  await admin.put('/api/parametres/app.organisation_fr', { valeur: 'Commune corrigée' });
  assert.equal(getDb().prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'parametre.update'").get().n, n, 'valeur inchangée : aucune ligne de plus');
});

test('valeur contrôlée selon le catalogue : choix hors liste, texte vide exigé, trop long, clé inconnue, champ inconnu', async () => {
  const bad = await admin.put('/api/parametres/app.default_lang', { valeur: 'de' });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.code, 'VALIDATION');
  assert.equal((await admin.put('/api/parametres/app.name_fr', { valeur: '   ' })).status, 400);
  assert.equal((await admin.put('/api/parametres/app.name_fr', { valeur: 'x'.repeat(101) })).status, 400);
  assert.equal((await admin.put('/api/parametres/app.support_contact', { valeur: '' })).status, 200, 'facultatif : vide admis');
  assert.equal((await admin.put('/api/parametres/app.inconnu', { valeur: 'x' })).status, 404);
  assert.equal((await admin.put('/api/parametres/theme.primary', { valeur: '#000000' })).status, 404, 'hors catalogue : non réglable');
  assert.equal((await admin.put('/api/parametres/app.name_fr', { valeur: 'x', autre: 1 })).status, 400);
  assert.equal((await admin.get('/api/parametres/pas-une-cle')).status, 400);
});

test('paramètre non public absent de la page de connexion', async () => {
  const pub = await client(srv.base).get('/api/settings/public');
  assert.equal(pub.body.data.app.default_ui_mode, undefined);
  assert.equal(pub.body.data.app.default_lang, 'fr');
});

test('langue et niveau de détail par défaut appliqués aux comptes créés ensuite', async () => {
  await admin.put('/api/parametres/app.default_lang', { valeur: 'nl' });
  await admin.put('/api/parametres/app.default_ui_mode', { valeur: 'complet' });
  const c = await person(srv.base, admin, 'p.nl@exemple.test', ea.id);
  const me = (await c.get('/api/auth/me')).body.data;
  assert.equal(me.preferred_lang, 'nl');
  assert.equal(me.ui_mode, 'complet');
  const fr = await admin.post('/api/users', { email: 'p.fr@exemple.test', first_name: 'F', last_name: 'R', entite_id: ea.id, preferred_lang: 'fr' });
  assert.equal(fr.body.data.preferred_lang, 'fr', 'une langue choisie à la création prime');
  await admin.del('/api/parametres/app.default_lang', {});
  await admin.del('/api/parametres/app.default_ui_mode', {});
});

test('retour au défaut : valeur livrée rendue, ligne gardée avec son auteur, journal', async () => {
  await admin.put('/api/parametres/app.name_nl', { valeur: 'Tijdelijke naam' });
  const r = await admin.del('/api/parametres/app.name_nl', {});
  assert.equal(r.status, 200);
  assert.equal(r.body.data.est_defaut, true);
  assert.equal(r.body.data.valeur, r.body.data.defaut);
  const row = getDb().prepare("SELECT value, updated_by FROM app_settings WHERE key = 'app.name_nl'").get();
  assert.equal(row.value, null);
  assert.ok(row.updated_by);
  assert.ok(getDb().prepare("SELECT 1 FROM audit_log WHERE action = 'parametre.reset'").get());
  assert.equal((await client(srv.base).get('/api/settings/public')).body.data.app.name_nl, r.body.data.defaut);
});

test('paramètres par MCP : mêmes contrôles, retour au défaut en deux appels, canal journalisé', async () => {
  const l = await tool(admin, 'list_parametres', { groupe: 'identite' });
  assert.equal(l.data.rows.length, 5);
  assert.equal((await tool(admin, 'get_parametre', { cle: 'app.default_lang' })).data.valeur, 'fr');
  assert.equal((await tool(admin, 'update_parametre', { cle: 'app.default_lang', valeur: 'en' })).code, 'VALIDATION');
  const u = await tool(admin, 'update_parametre', { cle: 'app.support_contact', valeur: 'Service informatique' });
  assert.equal(u.data.valeur, 'Service informatique');
  assert.equal(getDb().prepare("SELECT channel FROM audit_log WHERE action = 'parametre.update' ORDER BY id DESC").get().channel, 'mcp');
  const p = await tool(admin, 'prepare_reset_parametre', { cle: 'app.support_contact' });
  assert.equal(p.data.valeur, 'Service informatique');
  const c = await tool(admin, 'confirm_reset_parametre', { confirmation_token: p.data.confirmation_token });
  assert.equal(c.data.est_defaut, true);
});

test('migration 003_parametres sur une base 0.2.0 : comptes existants à 0.2.0, compte nouveau à la version installée', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gmao-migr-'));
  const env = { PATH: process.env.PATH, NODE_ENV: 'test', APP_TEST_MODE: '1', DB_PATH: path.join(dir, 'm.db') };
  const run = (code) => spawnSync(process.execPath, ['-e', code], { cwd: path.join(__dirname, '..'), env, encoding: 'utf8' });
  // Base 0.2.0 : migrations 001 et 002 seules, un compte.
  const prep = run(`
    const initSqlJs = require('sql.js'); const fs = require('fs');
    const { MIGRATIONS } = require('./src/database');
    initSqlJs().then((SQL) => {
      const db = new SQL.Database();
      db.run("CREATE TABLE schema_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, applied_at TEXT DEFAULT (datetime('now')))");
      for (const [name, sql] of MIGRATIONS.slice(0, 2)) { for (const s of sql.split(';').map((x) => x.trim()).filter(Boolean)) db.run(s); db.run('INSERT INTO schema_migrations (name) VALUES (?)', [name]); }
      db.run("INSERT INTO entites (code, nom_fr, nom_nl) VALUES ('AA', 'A', 'A')");
      db.run("INSERT INTO users (email, first_name, last_name, user_role, entite_id) VALUES ('ancien@exemple.test', 'a', 'a', 'admin', 1)");
      db.run("INSERT INTO audit_log (action) VALUES ('ancienne.ligne')");
      fs.writeFileSync(process.env.DB_PATH, Buffer.from(db.export()));
    });`);
  assert.equal(prep.status, 0, prep.stderr);
  const up = run(`require('./src/database').initDb().then((db) => {
    const u = require('./src/services/users');
    u.create({ id: 1, role: 'admin' }, { email: 'nouveau@exemple.test', first_name: 'n', last_name: 'n', entite_id: 1 });
    require('./src/database').saveNow();
    console.log(JSON.stringify({
      users: db.prepare('SELECT email, version_vue FROM users ORDER BY id').all(),
      migrations: db.prepare('SELECT name FROM schema_migrations ORDER BY id').all().map((m) => m.name),
      audit: db.prepare("SELECT action, entite_id FROM audit_log WHERE action = 'ancienne.ligne'").get(),
      tables: db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'parametres_entite'").all().length,
    }));
  })`);
  assert.equal(up.status, 0, up.stderr);
  assert.match(up.stdout, /\[DB\] Migration 003_parametres appliquée/);
  const out = JSON.parse(up.stdout.trim().split('\n').pop());
  assert.deepEqual(out.migrations, ['001_noyau', '002_lieux', '003_parametres', '004_referentiel_demandes', '005_demandes', '006_demandes_formulaire', '007_pieces_jointes']);
  assert.deepEqual(out.users, [{ email: 'ancien@exemple.test', version_vue: '0.2.0' }, { email: 'nouveau@exemple.test', version_vue: VERSION }]);
  assert.deepEqual(out.audit, { action: 'ancienne.ligne', entite_id: null }, 'journal existant gardé');
  assert.equal(out.tables, 1);
  const again = run("require('./src/database').initDb().then(() => console.log('relance'))");
  assert.equal(again.status, 0, again.stderr);
  assert.doesNotMatch(again.stdout, /Migration 003/, 'migration non rejouée');
});
