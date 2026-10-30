/**
 * Numérotation par entité, par type et par année (NUM-01 à NUM-05, DV-44) et nettoyage des textes déjà en base par la
 * migration 005 (DV-37, DV-47).
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { getDb, MIGRATIONS } = require('../src/database');
const numerotation = require('../src/services/numerotation');
const { nettoyerBase } = require('../src/nettoyage-espaces');

let srv;
let admin;
let ea;
let eb;
let resp;
let lieuA;
let lieuB;
let catA;
let catB;

const db = () => getDb();
const ecrireParam = (entiteId, cle, valeur) => db().prepare(`INSERT INTO parametres_entite (entite_id, cle, valeur) VALUES (?, ?, ?)
  ON CONFLICT(entite_id, cle) DO UPDATE SET valeur = excluded.valeur`).run(entiteId, cle, valeur);

/** Enregistre une demande minimale dans la même transaction que son numéro, comme le fera le service des demandes. */
const deposer = (entiteId, date = new Date(), echouer = false) => db().transaction(() => {
  const n = numerotation.attribuer(entiteId, 'demande', date);
  const [lieu, cat] = entiteId === ea.id ? [lieuA, catA] : [lieuB, catB];
  db().prepare(`INSERT INTO demandes (entite_id, numero, annee, sequence, lieu_id, categorie_id, description, demandeur_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(entiteId, n.numero, n.annee, n.sequence, lieu, cat, 'Description de test', 1);
  if (echouer) throw new Error('échec simulé après attribution');
  return n;
})();

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  resp = await person(srv.base, admin, 'resp.num@exemple.test', ea.id, [[ea.id, 'responsable']]);
  const lieu = (e, code) => db().prepare("INSERT INTO lieux (entite_id, nature, code, nom_fr, nom_nl) VALUES (?, 'batiment', ?, 'Bâtiment', 'Gebouw')").run(e, code).lastInsertRowid;
  lieuA = lieu(ea.id, 'NUMA');
  lieuB = lieu(eb.id, 'NUMB');
  catA = db().prepare('SELECT id FROM categories WHERE entite_id = ? ORDER BY id LIMIT 1').get(ea.id).id;
  catB = db().prepare('SELECT id FROM categories WHERE entite_id = ? ORDER BY id LIMIT 1').get(eb.id).id;
});
after(() => srv.stop());

test('migration 005 déclarée avec son étape de nettoyage, appliquée une fois', () => {
  const m = MIGRATIONS.find(([nom]) => nom === '005_demandes');
  assert.ok(m, 'migration présente');
  assert.equal(typeof m[2], 'function', 'étape JavaScript');
  assert.equal(db().prepare("SELECT COUNT(*) AS n FROM schema_migrations WHERE name = '005_demandes'").get().n, 1);
  assert.ok(db().prepare("SELECT 1 FROM pragma_table_info('users') WHERE name = 'lieu_habituel_id'").get(), 'lieu habituel');
});

test('format par défaut, séquence propre à chaque entité (NUM-01, NUM-02)', () => {
  const d = new Date('2026-03-10T09:00:00Z');
  assert.equal(deposer(ea.id, d).numero, 'AA-DI-2026-00001');
  assert.equal(deposer(ea.id, d).numero, 'AA-DI-2026-00002');
  assert.equal(deposer(eb.id, d).numero, 'BB-DI-2026-00001', 'l’autre entité a son propre compteur');
  assert.equal(deposer(ea.id, d).numero, 'AA-DI-2026-00003');
});

test('année de Bruxelles : 31/12 à 23:30 UTC compte déjà pour l’année suivante', () => {
  assert.equal(numerotation.anneeLocale(new Date('2026-12-31T22:59:00Z')), 2026);
  assert.equal(numerotation.anneeLocale(new Date('2026-12-31T23:30:00Z')), 2027);
  assert.equal(numerotation.anneeLocale(new Date('2026-06-30T22:30:00Z')), 2026, 'heure d’été');
});

test('remise à un au début de l’année civile (NUM-03, mode annuel par défaut)', () => {
  assert.equal(deposer(ea.id, new Date('2026-12-31T23:30:00Z')).numero, 'AA-DI-2027-00001');
  assert.equal(deposer(ea.id, new Date('2027-01-05T08:00:00Z')).numero, 'AA-DI-2027-00002');
  assert.equal(deposer(ea.id, new Date('2026-11-02T08:00:00Z')).numero, 'AA-DI-2026-00004', 'l’année précédente garde son compteur');
});

test('numérotation continue, puis retour à l’annuelle : aucun numéro redonné (NUM-03, NUM-05)', () => {
  ecrireParam(eb.id, 'numerotation.remise', 'continue');
  assert.equal(deposer(eb.id, new Date('2027-02-01T08:00:00Z')).numero, 'BB-DI-2027-00002', 'le rang poursuit d’une année à l’autre');
  assert.equal(deposer(eb.id, new Date('2028-02-01T08:00:00Z')).numero, 'BB-DI-2028-00003');
  ecrireParam(eb.id, 'numerotation.remise', 'annuelle');
  assert.equal(deposer(eb.id, new Date('2028-03-01T08:00:00Z')).numero, 'BB-DI-2028-00004', 'l’année en cours ne repart pas à un');
  assert.equal(deposer(eb.id, new Date('2029-01-10T08:00:00Z')).numero, 'BB-DI-2029-00001', 'remise à un l’année suivante');
  ecrireParam(eb.id, 'numerotation.remise', 'continue');
  assert.equal(deposer(eb.id, new Date('2029-02-10T08:00:00Z')).numero, 'BB-DI-2029-00005', 'le continu repart du plus grand rang donné');
});

test('code du type réglable ; le changement ne touche pas les numéros attribués', () => {
  const avant = db().prepare('SELECT numero FROM demandes ORDER BY id').all().map((r) => r.numero);
  ecrireParam(ea.id, 'numerotation.demande_type', 'IA');
  const n = deposer(ea.id, new Date('2026-11-03T08:00:00Z'));
  assert.equal(n.numero, 'AA-IA-2026-00005', 'le rang suit le compteur du type, pas le code');
  assert.deepEqual(db().prepare('SELECT numero FROM demandes WHERE id <= ? ORDER BY id').all(avant.length).map((r) => r.numero), avant);
  ecrireParam(ea.id, 'numerotation.demande_type', 'DI');
});

test('numéro attribué dans la transaction : un enregistrement qui échoue ne laisse pas de trou (NUM-04)', () => {
  const d = new Date('2026-11-04T08:00:00Z');
  assert.throws(() => deposer(ea.id, d, true), /échec simulé/);
  assert.equal(deposer(ea.id, d).numero, 'AA-DI-2026-00006', 'le rang 6 n’a pas été perdu');
});

test('envois simultanés : numéros tous différents, sans trou (NUM-04)', async () => {
  const d = new Date('2026-11-05T08:00:00Z');
  const res = await Promise.all(Array.from({ length: 40 }, () => Promise.resolve().then(() => deposer(eb.id, d))));
  const rangs = res.map((r) => r.sequence).sort((a, b) => a - b);
  assert.equal(new Set(res.map((r) => r.numero)).size, 40);
  for (let i = 1; i < rangs.length; i += 1) assert.equal(rangs[i], rangs[i - 1] + 1, 'rangs consécutifs');
});

test('unicité par contrainte en base, numéro jamais réutilisé (NUM-04, NUM-05)', () => {
  const r = db().prepare('SELECT * FROM demandes ORDER BY id LIMIT 1').get();
  assert.throws(() => db().prepare(`INSERT INTO demandes (entite_id, numero, annee, sequence, lieu_id, categorie_id, description, demandeur_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(r.entite_id, r.numero, r.annee, 99999, r.lieu_id, r.categorie_id, 'Doublon de numéro', 1), /UNIQUE/);
  // Un numéro présent (reprise, par exemple) est sauté par le compteur.
  db().prepare("UPDATE sequences SET dernier = 0 WHERE entite_id = ? AND type = 'demande' AND annee = 2026").run(ea.id);
  const n = deposer(ea.id, new Date('2026-11-06T08:00:00Z'));
  assert.equal(n.numero, 'AA-DI-2026-00007', 'les rangs 1 à 6 existent déjà');
});

test('réglages de la numérotation : responsable seul, format et choix contrôlés, journal', async () => {
  const liste = await resp.get('/api/parametres-entite?groupe=numerotation');
  assert.equal(liste.status, 200);
  const type = liste.body.data.find((p) => p.cle === 'numerotation.demande_type');
  assert.equal(type.valeur, 'DI');
  assert.equal(type.motif, '^[A-Z]{1,6}$');
  const remise = liste.body.data.find((p) => p.cle === 'numerotation.remise');
  assert.deepEqual(remise.choix.map((c) => c.valeur), ['annuelle', 'continue']);
  assert.equal((await resp.put('/api/parametres-entite/numerotation.demande_type', { valeur: 'di' })).status, 400, 'majuscules');
  assert.equal((await resp.put('/api/parametres-entite/numerotation.demande_type', { valeur: 'TROPLONG' })).status, 400);
  assert.equal((await resp.put('/api/parametres-entite/numerotation.demande_type', { valeur: '  ' })).status, 400, 'obligatoire');
  assert.equal((await resp.put('/api/parametres-entite/numerotation.remise', { valeur: 'mensuelle' })).status, 400);
  const ok = await resp.put('/api/parametres-entite/numerotation.demande_type', { valeur: ' WO ' });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.valeur, 'WO');
  const j = db().prepare("SELECT details_json FROM audit_log WHERE action = 'parametre_entite.update' ORDER BY id DESC LIMIT 1").get();
  assert.deepEqual(JSON.parse(j.details_json), { cle: 'numerotation.demande_type', avant: 'DI', apres: 'WO' });
  assert.equal((await resp.del('/api/parametres-entite/numerotation.demande_type')).status, 200, 'retour au défaut DI');
});

test('migration 005 : espaces retirés des textes déjà en base, cas bloquants signalés, journal, rejouable', () => {
  const d = db();
  const v1 = d.prepare("INSERT INTO listes_valeurs (entite_id, liste, code, libelle_fr, libelle_nl) VALUES (?, 'type_lieu', 'mobilier_x', 'Mobilier ', ' Meubilair')").run(eb.id).lastInsertRowid;
  const v2 = d.prepare("INSERT INTO listes_valeurs (entite_id, liste, code, libelle_fr, libelle_nl) VALUES (?, 'type_lieu', 'vide_x', '   ', 'Leeg')").run(eb.id).lastInsertRowid;
  const l1 = d.prepare("INSERT INTO lieux (entite_id, nature, code, nom_fr, nom_nl, adresse) VALUES (?, 'local', 'B12', 'Bureau 12', 'Bureau 12', '   ')").run(eb.id).lastInsertRowid;
  const l2 = d.prepare("INSERT INTO lieux (entite_id, nature, code, nom_fr, nom_nl) VALUES (?, 'local', 'B12 ', ' Bureau 12 bis', 'Bureau 12 bis')").run(eb.id).lastInsertRowid;
  d.prepare("INSERT INTO app_settings (key, value) VALUES ('app.organisation_fr', ' Commune fictive ') ON CONFLICT(key) DO UPDATE SET value = excluded.value").run();
  const u = d.prepare("SELECT id FROM users WHERE email = 'resp.num@exemple.test'").get().id;
  d.prepare("UPDATE users SET first_name = ' Prénom ' WHERE id = ?").run(u);
  const hash = d.prepare('SELECT password_hash FROM users WHERE id = ?').get(u).password_hash;

  const r = nettoyerBase(d);
  const valeur = (id) => d.prepare('SELECT libelle_fr, libelle_nl FROM listes_valeurs WHERE id = ?').get(id);
  assert.deepEqual({ ...valeur(v1) }, { libelle_fr: 'Mobilier', libelle_nl: 'Meubilair' });
  assert.equal(valeur(v2).libelle_fr, '   ', 'libellé obligatoire qui deviendrait vide : laissé');
  assert.equal(d.prepare('SELECT adresse FROM lieux WHERE id = ?').get(l1).adresse, '', 'adresse facultative vidée');
  const lieu2 = d.prepare('SELECT code, nom_fr FROM lieux WHERE id = ?').get(l2);
  assert.equal(lieu2.code, 'B12 ', 'code en conflit avec B12 : laissé');
  assert.equal(lieu2.nom_fr, 'Bureau 12 bis', 'les autres champs de la fiche sont nettoyés');
  assert.equal(d.prepare("SELECT value FROM app_settings WHERE key = 'app.organisation_fr'").get().value, 'Commune fictive');
  assert.equal(d.prepare('SELECT first_name FROM users WHERE id = ?').get(u).first_name, 'Prénom');
  assert.equal(d.prepare('SELECT password_hash FROM users WHERE id = ?').get(u).password_hash, hash, 'mot de passe intact');

  assert.ok(r.corriges >= 5);
  assert.deepEqual(r.bloques.map((b) => `${b.table}.${b.colonne}`).sort(), ['lieux.code', 'listes_valeurs.libelle_fr']);
  const j = d.prepare("SELECT * FROM audit_log WHERE action = 'systeme.espaces' AND entity_type = 'listes_valeurs' AND entity_id = ?").get(v1);
  assert.equal(j.channel, 'cli');
  assert.equal(j.user_id, null);
  assert.equal(j.entite_id, eb.id);
  assert.deepEqual(JSON.parse(j.details_json), { avant: { libelle_fr: 'Mobilier ', libelle_nl: ' Meubilair' }, apres: { libelle_fr: 'Mobilier', libelle_nl: 'Meubilair' } });
  const updated = d.prepare('SELECT updated_by FROM listes_valeurs WHERE id = ?').get(v1);
  assert.equal(updated.updated_by, null, 'mention de modification non touchée');

  const encore = nettoyerBase(d);
  assert.equal(encore.corriges, 0, 'seconde passe : rien à corriger');
  assert.equal(encore.bloques.length, 2, 'les cas bloquants restent signalés');
});

test('migration 005 sur une base 0.4.1 : tables créées, textes nettoyés, journal, pas de relance', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { spawnSync } = require('child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gmao-m005-'));
  const env = { PATH: process.env.PATH, NODE_ENV: 'test', APP_TEST_MODE: '1', DB_PATH: path.join(dir, 'm.db') };
  const run = (code) => spawnSync(process.execPath, ['-e', code], { cwd: path.join(__dirname, '..'), env, encoding: 'utf8' });
  // Base 0.4.1 : migrations 001 à 004, une entité, une valeur « Mobilier » avec une espace finale (recette du 24/10/2026).
  const prep = run(`
    const initSqlJs = require('sql.js'); const fs = require('fs');
    const { MIGRATIONS } = require('./src/database');
    initSqlJs().then((SQL) => {
      const db = new SQL.Database();
      db.run("CREATE TABLE schema_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, applied_at TEXT DEFAULT (datetime('now')))");
      for (const [name, sql] of MIGRATIONS.slice(0, 4)) { for (const s of sql.split(';').map((x) => x.trim()).filter(Boolean)) db.run(s); db.run('INSERT INTO schema_migrations (name) VALUES (?)', [name]); }
      db.run("INSERT INTO entites (code, nom_fr, nom_nl) VALUES ('CPAS', 'CPAS', 'OCMW')");
      db.run("INSERT INTO listes_valeurs (entite_id, liste, code, libelle_fr, libelle_nl) VALUES (1, 'type_lieu', 'mobilier', 'Mobilier ', 'Meubilair')");
      fs.writeFileSync(process.env.DB_PATH, Buffer.from(db.export()));
    });`);
  assert.equal(prep.status, 0, prep.stderr);
  const up = run(`require('./src/database').initDb().then((db) => {
    console.log(JSON.stringify({
      migrations: db.prepare('SELECT name FROM schema_migrations ORDER BY id').all().map((m) => m.name),
      mobilier: db.prepare("SELECT libelle_fr FROM listes_valeurs WHERE code = 'mobilier'").get().libelle_fr,
      journal: db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'systeme.espaces'").get().n,
      demandes: db.prepare('SELECT COUNT(*) AS n FROM demandes').get().n,
    }));
  })`);
  assert.equal(up.status, 0, up.stderr);
  assert.match(up.stdout, /\[DB\] Espaces retirés sur 1 fiche\(s\)/);
  assert.match(up.stdout, /\[DB\] Migration 005_demandes appliquée/);
  const out = JSON.parse(up.stdout.trim().split('\n').pop());
  assert.equal(out.migrations.at(-1), '007_pieces_jointes');
  assert.equal(out.mobilier, 'Mobilier');
  assert.equal(out.journal, 1);
  assert.equal(out.demandes, 0);
  const again = run("require('./src/database').initDb().then(() => console.log('ok'))");
  assert.equal(again.status, 0, again.stderr);
  assert.doesNotMatch(again.stdout, /Migration 005|Espaces retirés/);
});
