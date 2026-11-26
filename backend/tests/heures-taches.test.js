/**
 * Heures réelles d'une tâche (0.21.0, point 1 ; R5 de la recette de la 0.20.0, DV-164 ; règle 13 de services/taches.js) :
 * début noté au démarrage, fin à la fin ; heures exigées pour terminer une tâche jamais démarrée ; contrôles ; effacement à la
 * remise à faire et à la réouverture ; journal sans texte libre ; API et MCP ; migration 018 sur une base de la 0.20.0.
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
let gestB;
let lieu;
let categorie;
const parse = (r) => JSON.parse(r.body.result.content[0].text);
const tool = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));
const passer = (c, id, body) => c.post(`/api/taches/${id}/etat`, body);
const iso = (minutesAvant) => new Date(Date.now() - minutesAvant * 60000).toISOString();
const ecart = (s) => Math.abs(new Date(`${s.replace(' ', 'T')}Z`).getTime() - Date.now());

async function tache(titre = 'Remplacer le luminaire') {
  const d = (await agent.post('/api/demandes', { lieu_id: lieu, categorie_id: categorie.id, description: 'La lampe du couloir ne s’allume plus.' })).body.data;
  const q = await gest.post(`/api/demandes/${d.id}/qualifier`, { categorie_id: categorie.id, lieu_id: lieu, priorite: categorie.priorite_effective || 'P3', motif_priorite: 'Essai' });
  assert.equal(q.status, 200, JSON.stringify(q.body));
  await gest.post(`/api/demandes/${d.id}/taches`, { titre: 'Tâche témoin qui reste ouverte' });
  const r = await gest.post(`/api/demandes/${d.id}/taches`, { titre });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return { d, t: r.body.data };
}
const ligne = (id) => getDb().prepare('SELECT etat, debut_reel, fin_reelle FROM demande_taches WHERE id = ?').get(id);
const journal = (id) => getDb().prepare("SELECT details_json AS d FROM audit_log WHERE action = 'tache.etat' AND entity_id = ? ORDER BY id").all(id).map((x) => JSON.parse(x.d));

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  gest = await person(srv.base, admin, 'gest.he@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  agent = await person(srv.base, admin, 'agent.he@exemple.test', ea.id);
  gestB = await person(srv.base, admin, 'gest.heb@exemple.test', eb.id, [[eb.id, 'gestionnaire']]);
  lieu = (await gest.post('/api/lieux', { nature: 'site', code: 'HE', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis' })).body.data.id;
  categorie = (await agent.get('/api/categories?niveau=nature&q=eclairage')).body.data[0];
});
after(() => srv.stop());

test('démarrer note le début ; terminer une tâche démarrée note la fin et garde le début ; journal nommé', async () => {
  const { t } = await tache();
  assert.equal(t.debut_reel, null);
  assert.equal(t.fin_reelle, null);
  const s = await passer(gest, t.id, { etat: 'en_cours' });
  assert.equal(s.status, 200, JSON.stringify(s.body));
  assert.ok(ecart(s.body.data.debut_reel) < 5000, 'début : maintenant');
  assert.equal(s.body.data.fin_reelle, null);
  const debut = s.body.data.debut_reel;
  assert.equal((await passer(gest, t.id, { etat: 'terminee', debut: iso(60), fin: iso(1) })).body.code, 'TACHE_HEURES_INUTILES', 'tâche démarrée : la fin est l’heure du clic');
  const f = await passer(gest, t.id, { etat: 'terminee' });
  assert.equal(f.status, 200, JSON.stringify(f.body));
  assert.equal(f.body.data.debut_reel, debut, 'le début du démarrage est gardé');
  assert.ok(ecart(f.body.data.fin_reelle) < 5000, 'fin : maintenant');
  const j = journal(t.id);
  assert.deepEqual(j.map((x) => [x.vers, x.debut_reel ?? null, x.fin_reelle ?? null]), [['en_cours', debut, null], ['terminee', debut, f.body.data.fin_reelle]]);
});

test('terminer une tâche jamais démarrée : les deux heures exigées et contrôlées, enregistrées en UTC', async () => {
  const { t } = await tache();
  assert.equal((await passer(gest, t.id, { etat: 'terminee' })).body.code, 'TACHE_HEURES_REQUISES');
  assert.equal((await passer(gest, t.id, { etat: 'terminee', debut: iso(60) })).body.code, 'TACHE_HEURES_REQUISES');
  assert.equal((await passer(gest, t.id, { etat: 'terminee', fin: iso(5) })).body.code, 'TACHE_HEURES_REQUISES');
  assert.equal((await passer(gest, t.id, { etat: 'terminee', debut: iso(5), fin: iso(60) })).body.code, 'TACHE_FIN_AVANT_DEBUT');
  // 0.21.5 : une seule heure pour les deux champs ; deux appels à iso(5) tombaient parfois à une milliseconde, ou à une
  // seconde, d'écart, et la fin passait alors après le début (test instable vu sur la suite complète sous charge).
  const meme = iso(5);
  assert.equal((await passer(gest, t.id, { etat: 'terminee', debut: meme, fin: meme })).body.code, 'TACHE_FIN_AVANT_DEBUT', 'fin égale au début');
  assert.equal((await passer(gest, t.id, { etat: 'terminee', debut: iso(60), fin: iso(-30) })).body.code, 'TACHE_HEURE_FUTURE');
  assert.equal((await passer(gest, t.id, { etat: 'terminee', debut: iso(-30), fin: iso(-60) })).body.code, 'TACHE_HEURE_FUTURE');
  assert.equal((await passer(gest, t.id, { etat: 'terminee', debut: 'hier', fin: iso(5) })).status, 400, 'format date-time exigé');
  assert.equal(ligne(t.id).etat, 'a_faire', 'rien d’écrit après un refus');
  // Heure de Bruxelles avec son fuseau : enregistrée en UTC.
  const r = await passer(gest, t.id, { etat: 'terminee', debut: '2026-11-18T08:15:00+01:00', fin: '2026-11-18T10:45:00+01:00' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(ligne(t.id), { etat: 'terminee', debut_reel: '2026-11-18 07:15:00', fin_reelle: '2026-11-18 09:45:00' });
  const j = journal(t.id).at(-1);
  assert.deepEqual([j.de, j.vers, j.debut_reel, j.fin_reelle], ['a_faire', 'terminee', '2026-11-18 07:15:00', '2026-11-18 09:45:00']);
});

test('heures refusées hors de « terminer une tâche à faire » ; remise à faire et réouverture les effacent ; annulation les garde', async () => {
  const { t } = await tache();
  assert.equal((await passer(gest, t.id, { etat: 'en_cours', debut: iso(60) })).body.code, 'TACHE_HEURES_INUTILES');
  assert.equal((await passer(gest, t.id, { etat: 'annulee', motif: 'Essai', fin: iso(1) })).body.code, 'TACHE_HEURES_INUTILES');
  await passer(gest, t.id, { etat: 'en_cours' });
  assert.ok(ligne(t.id).debut_reel);
  await passer(gest, t.id, { etat: 'a_faire' });
  assert.deepEqual(ligne(t.id), { etat: 'a_faire', debut_reel: null, fin_reelle: null }, 'démarrage annulé : début effacé');
  await passer(gest, t.id, { etat: 'en_cours' });
  const debut = ligne(t.id).debut_reel;
  await passer(gest, t.id, { etat: 'annulee', motif: 'Fait par le concierge.' });
  assert.deepEqual(ligne(t.id), { etat: 'annulee', debut_reel: debut, fin_reelle: null }, 'annulation : début gardé');
  await passer(gest, t.id, { etat: 'a_faire' });
  assert.deepEqual(ligne(t.id), { etat: 'a_faire', debut_reel: null, fin_reelle: null }, 'réouverture : heures effacées');
  await passer(gest, t.id, { etat: 'terminee', debut: iso(90), fin: iso(30) });
  await passer(gest, t.id, { etat: 'a_faire' });
  assert.deepEqual(ligne(t.id), { etat: 'a_faire', debut_reel: null, fin_reelle: null }, 'tâche terminée rouverte : heures effacées');
  const tout = JSON.stringify(journal(t.id));
  assert.ok(!/concierge/.test(tout), 'jamais de texte libre au journal');
});

test('tâche démarrée avant la 0.21.0 (sans heure de début) : terminer note la fin seule', async () => {
  const { t } = await tache();
  await passer(gest, t.id, { etat: 'en_cours' });
  getDb().prepare('UPDATE demande_taches SET debut_reel = NULL WHERE id = ?').run(t.id);
  const f = await passer(gest, t.id, { etat: 'terminee' });
  assert.equal(f.status, 200);
  assert.equal(f.body.data.debut_reel, null, 'sans heure de début, dite comme telle');
  assert.ok(f.body.data.fin_reelle);
});

test('lecture : fiche, liste et MCP rendent les heures ; MCP en deux appels avec les heures ; cloison', async () => {
  const { d, t } = await tache();
  const p = await tool(gest, 'prepare_change_etat_tache', { id: t.id, etat: 'terminee', debut: '2026-11-19T07:45:00Z', fin: '2026-11-19T08:30:00Z' });
  assert.equal(p.data.debut_reel, '2026-11-19 07:45:00');
  assert.equal(p.data.fin_reelle, '2026-11-19 08:30:00');
  assert.equal(ligne(t.id).etat, 'a_faire', 'rien d’écrit à la préparation');
  assert.equal((await tool(gest, 'prepare_change_etat_tache', { id: t.id, etat: 'terminee' })).code, 'TACHE_HEURES_REQUISES');
  const f = await tool(gest, 'confirm_change_etat_tache', { confirmation_token: p.data.confirmation_token });
  assert.equal(f.data.fin_reelle, '2026-11-19 08:30:00');
  assert.equal(getDb().prepare("SELECT channel FROM audit_log WHERE action = 'tache.etat' AND entity_id = ? ORDER BY id DESC").get(t.id).channel, 'mcp');
  const l = (await gest.get(`/api/demandes/${d.id}/taches`)).body.data.find((x) => x.id === t.id);
  assert.deepEqual([l.debut_reel, l.fin_reelle], ['2026-11-19 07:45:00', '2026-11-19 08:30:00']);
  const g = (await tool(gest, 'get_tache', { id: t.id })).data;
  assert.deepEqual([g.debut_reel, g.fin_reelle], ['2026-11-19 07:45:00', '2026-11-19 08:30:00']);
  assert.equal((await gestB.get(`/api/taches/${t.id}`)).status, 403);
  assert.equal((await passer(gestB, t.id, { etat: 'a_faire' })).status, 403);
  assert.equal((await agent.get(`/api/demandes/${d.id}/taches`)).status, 403, 'le demandeur ne lit pas les tâches');
});

test('migration 018 sur une base de la 0.20.0 : colonnes ajoutées, tâche terminée laissée sans heure, pas de relance', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { spawnSync } = require('child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gmao-018-'));
  const env = { PATH: process.env.PATH, NODE_ENV: 'test', APP_TEST_MODE: '1', DB_PATH: path.join(dir, 'd.db') };
  const run = (code) => spawnSync(process.execPath, ['-e', code], { cwd: path.join(__dirname, '..'), env, encoding: 'utf8' });
  const prep = run(`
    const initSqlJs = require('sql.js'); const fs = require('fs');
    const { MIGRATIONS } = require('./src/database');
    initSqlJs().then((SQL) => {
      const db = new SQL.Database();
      db.run("CREATE TABLE schema_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, applied_at TEXT DEFAULT (datetime('now')))");
      for (const [name, sql] of MIGRATIONS.slice(0, 17)) { for (const s of sql.split(';').map((x) => x.trim()).filter(Boolean)) db.run(s); db.run('INSERT INTO schema_migrations (name) VALUES (?)', [name]); }
      db.run("INSERT INTO entites (code, nom_fr, nom_nl) VALUES ('AC', 'A', 'A')");
      db.run("INSERT INTO users (email, first_name, last_name, user_role, entite_id) VALUES ('a@exemple.test', 'A', 'A', 'agent', 1)");
      db.run("INSERT INTO lieux (entite_id, nature, code, nom_fr, nom_nl) VALUES (1, 'site', 'S', 'S', 'S')");
      db.run("INSERT INTO categories (entite_id, code, libelle_fr, libelle_nl, icone) VALUES (1, 'electricite', 'É', 'E', 'eclair')");
      db.run("INSERT INTO demandes (entite_id, numero, annee, sequence, lieu_id, categorie_id, description, demandeur_id, canal, etat) VALUES (1, 'AC-DI-2026-00019', 2026, 19, 1, 1, 'Lampe du couloir', 1, 'ecran', 'terminee')");
      db.run("INSERT INTO demande_taches (demande_id, entite_id, rang, titre, etat) VALUES (1, 1, 2, 'Terminée sans démarrage', 'terminee')");
      fs.writeFileSync(process.env.DB_PATH, Buffer.from(db.export()));
    });`);
  assert.equal(prep.status, 0, prep.stderr);
  const lire = `require('./src/database').initDb().then((d) => console.log(JSON.stringify({
    migrations: d.prepare('SELECT name FROM schema_migrations ORDER BY id').all().map((m) => m.name),
    colonnes: d.prepare('PRAGMA table_info(demande_taches)').all().map((c) => c.name),
    tache: d.prepare('SELECT titre, etat, debut_reel, fin_reelle FROM demande_taches').get() })))`;
  const out = run(lire);
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /\[DB\] Migration 018_planning appliquée/);
  const r = JSON.parse(out.stdout.trim().split('\n').pop());
  assert.equal(r.migrations.at(-1), '018_planning');
  assert.ok(r.colonnes.includes('debut_reel') && r.colonnes.includes('fin_reelle'));
  assert.deepEqual(r.tache, { titre: 'Terminée sans démarrage', etat: 'terminee', debut_reel: null, fin_reelle: null });
  const encore = run(lire);
  assert.equal(encore.status, 0, encore.stderr);
  assert.doesNotMatch(encore.stdout, /Migration 018_planning appliquée/, 'pas de relance');
  // Contrainte de format : une heure mal formée est refusée par la base.
  const mal = run(`require('./src/database').initDb().then((d) => { try { d.prepare("UPDATE demande_taches SET debut_reel = '18/11/2026'").run(); console.log('accepte'); } catch { console.log('refuse'); } })`);
  assert.match(mal.stdout, /refuse/);
});
