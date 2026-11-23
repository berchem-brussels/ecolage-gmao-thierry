/**
 * Date prévue annoncée au demandeur et mention de son changement (0.21.0, étape 17, point 5 ; SUI-03 ; règle 14 de
 * services/taches.js) : première date sans mention (avis « Planifiée »), changement avec la date d'avant, le moment,
 * l'avis « demande.date_prevue » (cloche et courriel, sans nom d'ouvrier) et le journal ; rien quand la date ne change
 * pas ; date retirée ; changement par la fin d'une tâche ; MCP ; migration 018 sur une base de la 0.20.0.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { getDb } = require('../src/database');

let srv;
let admin;
let ea;
let gest;
let agent;
let collegue;
let suiveur;
let ouvrier;
let lieu;
let categorie;
const parse = (r) => JSON.parse(r.body.result.content[0].text);
const tool = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));
const jour = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const fr = (iso) => iso.split('-').reverse().join('/');
const avis = (userId, demandeId, evenement) => getDb().prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND objet_id = ? AND evenement = ?').get(userId, demandeId, evenement).n;
const affecter = (t, date) => gest.put(`/api/taches/${t.id}/affectation`, { ouvriers: [ouvrier.id], date_prevue: date });

async function demandeAvecTache(beneficiaire = null) {
  const d = (await agent.post('/api/demandes', { lieu_id: lieu, categorie_id: categorie.id, description: 'La lampe du couloir ne s’allume plus.', ...(beneficiaire ? { beneficiaire_id: beneficiaire } : {}) })).body.data;
  await gest.post(`/api/demandes/${d.id}/qualifier`, { categorie_id: categorie.id, lieu_id: lieu, priorite: categorie.priorite_effective || 'P3', motif_priorite: 'Essai' });
  const t = (await gest.post(`/api/demandes/${d.id}/taches`, { titre: 'Remplacer le luminaire' })).body.data;
  return { d, t };
}

before(async () => {
  srv = await startServer();
  ({ admin, ea } = await setup(srv.base));
  gest = await person(srv.base, admin, 'gest.dp@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  agent = await person(srv.base, admin, 'agent.dp@exemple.test', ea.id);
  collegue = await person(srv.base, admin, 'collegue.dp@exemple.test', ea.id);
  suiveur = await person(srv.base, admin, 'suiveur.dp@exemple.test', ea.id);
  ouvrier = await person(srv.base, admin, 'ouvrier.dp@exemple.test', ea.id, [[ea.id, 'ouvrier']]);
  lieu = (await gest.post('/api/lieux', { nature: 'site', code: 'DP', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis' })).body.data.id;
  categorie = (await agent.get('/api/categories?niveau=nature&q=eclairage')).body.data[0];
});
after(() => srv.stop());

test('première date : lue par le demandeur sans mention ; avis « Planifiée » seulement', async () => {
  const { d, t } = await demandeAvecTache();
  assert.equal((await affecter(t, jour(3))).status, 200);
  const f = (await agent.get(`/api/demandes/${d.id}`)).body.data;
  assert.deepEqual([f.intervention_prevue_le, f.intervention_prevue_avant, f.intervention_modifiee_le], [jour(3), null, null]);
  assert.equal(avis(agent.id, d.id, 'demande.date_prevue'), 0);
  assert.equal(avis(agent.id, d.id, 'demande.etat'), 2, 'prise en charge, puis « Planifiée »');
});

test('date changée : date d’avant et moment dits au demandeur ; avis au demandeur, au bénéficiaire et aux personnes qui suivent, jamais à l’auteur ; courriel et journal sans nom', async () => {
  const { d, t } = await demandeAvecTache(collegue.id);
  await suiveur.post(`/api/demandes/${d.id}/suivre`, { source: 'abonnement' });
  await affecter(t, jour(3));
  const r = await affecter(t, jour(5));
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const f = (await agent.get(`/api/demandes/${d.id}`)).body.data;
  assert.deepEqual([f.intervention_prevue_le, f.intervention_prevue_avant], [jour(5), jour(3)]);
  assert.ok(Math.abs(Date.parse(`${f.intervention_modifiee_le.replace(' ', 'T')}Z`) - Date.now()) < 10000);
  for (const u of [agent, collegue, suiveur]) assert.equal(avis(u.id, d.id, 'demande.date_prevue'), 1, u.email);
  assert.equal(avis(gest.id, d.id, 'demande.date_prevue'), 0, 'pas d’avis de sa propre action');
  const c = getDb().prepare("SELECT sujet, corps FROM courriels WHERE user_id = ? AND evenement = 'demande.date_prevue' AND objet_id = ?").get(agent.id, d.id);
  assert.ok(c, 'courriel composé (mode test)');
  assert.ok(c.corps.includes(`prévue le ${fr(jour(5))}`), c.corps);
  assert.ok(!/ouvrier\.dp|Ouvrier/.test(`${c.sujet} ${c.corps}`), 'jamais le nom des ouvriers');
  const j = getDb().prepare("SELECT details_json AS d FROM audit_log WHERE action = 'demande.date_prevue' AND entity_id = ?").all(d.id).map((x) => JSON.parse(x.d));
  assert.deepEqual(j, [{ numero: d.numero, avant: { date_prevue: jour(3) }, apres: { date_prevue: jour(5) } }]);
  // Même date renvoyée : rien de plus.
  await gest.put(`/api/taches/${t.id}/affectation`, { ouvriers: [ouvrier.id], date_prevue: jour(5), heure_debut: '08:00' });
  assert.equal(avis(agent.id, d.id, 'demande.date_prevue'), 1);
  // MCP du demandeur : mêmes champs.
  const m = await tool(agent, 'get_demande', { id: d.id });
  assert.deepEqual([m.data.intervention_prevue_le, m.data.intervention_prevue_avant], [jour(5), jour(3)]);
});

test('première date des tâches ouvertes : une tâche plus tôt, puis la fin de cette tâche, changent la date annoncée', async () => {
  const { d, t } = await demandeAvecTache();
  await affecter(t, jour(6));
  const t2 = (await gest.post(`/api/demandes/${d.id}/taches`, { titre: 'Contrôler le tableau' })).body.data;
  await affecter(t2, jour(4));
  let f = (await agent.get(`/api/demandes/${d.id}`)).body.data;
  assert.deepEqual([f.intervention_prevue_le, f.intervention_prevue_avant], [jour(4), jour(6)]);
  await gest.post(`/api/taches/${t2.id}/etat`, { etat: 'en_cours' });
  await gest.post(`/api/taches/${t2.id}/etat`, { etat: 'terminee' });
  f = (await agent.get(`/api/demandes/${d.id}`)).body.data;
  assert.deepEqual([f.intervention_prevue_le, f.intervention_prevue_avant], [jour(6), jour(4)], 'la tâche finie ne compte plus');
  assert.equal(avis(agent.id, d.id, 'demande.date_prevue'), 2);
});

test('date retirée : retour « Qualifiée », plus de date ni de mention ; une nouvelle date ensuite est une première date', async () => {
  const { d, t } = await demandeAvecTache();
  await affecter(t, jour(3));
  await affecter(t, jour(4));
  await gest.put(`/api/taches/${t.id}/affectation`, { ouvriers: [ouvrier.id], date_prevue: null });
  let f = (await agent.get(`/api/demandes/${d.id}`)).body.data;
  assert.deepEqual([f.etat, f.intervention_prevue_le, f.intervention_prevue_avant, f.intervention_modifiee_le], [f.etat, null, null, null]);
  assert.equal(getDb().prepare('SELECT etat FROM demandes WHERE id = ?').get(d.id).etat, 'qualifiee');
  await affecter(t, jour(7));
  f = (await agent.get(`/api/demandes/${d.id}`)).body.data;
  assert.deepEqual([f.intervention_prevue_le, f.intervention_prevue_avant], [jour(7), null]);
  assert.equal(avis(agent.id, d.id, 'demande.date_prevue'), 1, 'seul le changement de jour(3) à jour(4) a donné l’avis');
});

test('migration 018 sur une base de la 0.20.0 : la date déjà annoncée est connue, sans mention de modification', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { spawnSync } = require('child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gmao-018d-'));
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
      db.run("INSERT INTO demandes (entite_id, numero, annee, sequence, lieu_id, categorie_id, description, demandeur_id, canal, etat) VALUES (1, 'AC-DI-2026-00020', 2026, 20, 1, 1, 'Lampe du couloir', 1, 'ecran', 'planifiee')");
      db.run("INSERT INTO demandes (entite_id, numero, annee, sequence, lieu_id, categorie_id, description, demandeur_id, canal, etat) VALUES (1, 'AC-DI-2026-00021', 2026, 21, 1, 1, 'Sans tâche', 1, 'ecran', 'qualifiee')");
      db.run("INSERT INTO demande_taches (demande_id, entite_id, rang, titre, etat, date_prevue) VALUES (1, 1, 1, 'Datée', 'a_faire', '2026-11-27')");
      db.run("INSERT INTO demande_taches (demande_id, entite_id, rang, titre, etat, date_prevue) VALUES (1, 1, 2, 'Plus tôt mais annulée', 'annulee', '2026-11-24')");
      fs.writeFileSync(process.env.DB_PATH, Buffer.from(db.export()));
    });`);
  assert.equal(prep.status, 0, prep.stderr);
  const out = run(`require('./src/database').initDb().then((d) => console.log(JSON.stringify(d.prepare('SELECT numero, date_prevue_connue, date_prevue_avant, date_prevue_modifiee_le FROM demandes ORDER BY id').all())))`);
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /\[DB\] Migration 018_planning appliquée/);
  assert.deepEqual(JSON.parse(out.stdout.trim().split('\n').pop()), [
    { numero: 'AC-DI-2026-00020', date_prevue_connue: '2026-11-27', date_prevue_avant: null, date_prevue_modifiee_le: null },
    { numero: 'AC-DI-2026-00021', date_prevue_connue: null, date_prevue_avant: null, date_prevue_modifiee_le: null },
  ]);
});
