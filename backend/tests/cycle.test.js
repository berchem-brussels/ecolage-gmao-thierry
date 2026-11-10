/**
 * Cycle de vie d'une demande, socle serveur (0.14.0, étape 9, point 2 ; CYC-01, CYC-02, CYC-04, CYC-05, CLO-01,
 * API-04, API-06 ; décision DV-118) : passages en données, refus hors table (409) après la permission (403),
 * motifs, commentaires, compte rendu, historique avec canal, lecture du demandeur sans nom ni commentaire interne,
 * journal sans texte libre, libellés des états par entité, migration 012 sur une base 0.13.0.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { getDb } = require('../src/database');
const cycle = require('../src/services/cycle');

let srv;
let admin;
let ea;
let eb;
let gest;
let resp;
let agent;
let gestB;
let lieu;
let categorie;
const V = {};
const parse = (r) => JSON.parse(r.body.result.content[0].text);
const tool = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));

async function deposer(c = agent, description = 'La lampe du couloir ne s’allume plus.') {
  const r = await c.post('/api/demandes', { lieu_id: lieu, categorie_id: categorie.id, description });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.data;
}
async function qualifier(id) {
  const r = await gest.post(`/api/demandes/${id}/qualifier`, { categorie_id: categorie.id, lieu_id: lieu, priorite: categorie.priorite_effective || 'P3', motif_priorite: 'Essai' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.data;
}
const passer = (c, id, body) => c.post(`/api/demandes/${id}/transitions`, body);
const valeur = async (c, liste, code) => (await c.get(`/api/listes-valeurs?liste=${liste}&limit=200`)).body.data.find((v) => v.code === code).id;

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  gest = await person(srv.base, admin, 'gest.cy@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  resp = await person(srv.base, admin, 'resp.cy@exemple.test', ea.id, [[ea.id, 'responsable']]);
  agent = await person(srv.base, admin, 'agent.cy@exemple.test', ea.id);
  gestB = await person(srv.base, admin, 'gest.cyb@exemple.test', eb.id, [[eb.id, 'gestionnaire']]);
  lieu = (await gest.post('/api/lieux', { nature: 'site', code: 'CY', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis' })).body.data.id;
  categorie = (await agent.get('/api/categories?niveau=nature&q=eclairage')).body.data[0];
  V.piece = await valeur(gest, 'motif_attente', 'piece');
  V.demandeur = await valeur(gest, 'motif_attente', 'demandeur');
  V.usure = await valeur(gest, 'cause_panne', 'usure');
  V.doublon = await valeur(gest, 'motif_refus', 'doublon');
  V.pieceB = await valeur(gestB, 'motif_attente', 'piece');
});
after(() => srv.stop());

test('table des passages copiée de la configuration, lisible par tout rôle de l’entité ; listes livrées', async () => {
  const r = await agent.get('/api/etats-demande/transitions');
  assert.equal(r.status, 200);
  assert.equal(r.body.data.length, cycle.CONFIG.transitions.length);
  assert.ok(r.body.data.every((t) => t.is_active === 1));
  // DV-118 : « Planifiée » et « Confiée à un prestataire » restent fermés ; le gestionnaire démarre et termine.
  assert.ok(!r.body.data.some((t) => ['planifiee', 'externe'].includes(t.vers_etat)));
  assert.ok(r.body.data.some((t) => t.de_etat === 'qualifiee' && t.vers_etat === 'en_cours' && t.permission === 'demandes:traiter'));
  assert.ok(r.body.data.some((t) => t.de_etat === 'en_cours' && t.vers_etat === 'terminee'));
  for (const liste of ['motif_attente', 'motif_refus', 'cause_panne']) {
    assert.ok((await agent.get(`/api/listes-valeurs?liste=${liste}`)).body.data.length >= 4, liste);
  }
});

test('dépôt : première étape de l’historique, canal écran ou MCP ; état daté', async () => {
  const d = await deposer();
  assert.equal(d.etat, 'a_qualifier');
  assert.ok(d.etat_depuis);
  assert.equal(d.etat_libelle_fr, 'Reçue par le service technique');
  const h = getDb().prepare('SELECT * FROM demande_historique WHERE demande_id = ?').all(d.id);
  assert.equal(h.length, 1);
  assert.equal(h[0].de_etat, null);
  assert.equal(h[0].vers_etat, 'a_qualifier');
  assert.equal(h[0].canal, 'ecran');
  assert.equal(h[0].user_id, agent.id);
  const m = await tool(agent, 'create_demande', { lieu_id: lieu, categorie_id: categorie.id, description: 'Déposée par le MCP, lampe.' });
  assert.equal(getDb().prepare('SELECT canal FROM demande_historique WHERE demande_id = ?').get(m.data.id).canal, 'mcp');
});

test('ordre des contrôles : le demandeur reçoit 403 (jamais 409) ; hors table 409 ; qualification par sa route', async () => {
  const d = await deposer();
  // Le demandeur ne vise jamais « En cours » ni « Clôturée » ; une personne qui n'est pas concernée ne vise rien.
  for (const etat of ['en_cours', 'cloturee']) {
    const r = await passer(agent, d.id, { etat, commentaire: 'x' });
    assert.equal(r.status, 403, etat);
  }
  const etranger = await person(srv.base, admin, 'etranger.cy@exemple.test', ea.id);
  assert.equal((await passer(etranger, d.id, { etat: 'annulee', commentaire: 'x' })).status, 403);
  const hors = await passer(gest, d.id, { etat: 'en_cours' });
  assert.equal(hors.status, 409);
  assert.equal(hors.body.code, 'TRANSITION_INTERDITE');
  const q = await passer(gest, d.id, { etat: 'qualifiee' });
  assert.equal(q.body.code, 'TRANSITION_PAR_QUALIFICATION');
  assert.equal((await passer(gest, d.id, { etat: 'inconnu' })).status, 400);
  assert.equal((await passer(gest, 999999, { etat: 'en_cours' })).status, 404);
  assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM demande_historique WHERE demande_id = ?').get(d.id).n, 1, 'rien d’écrit');
});

test('qualification : passage inscrit à l’historique, une seule fois ; état daté', async () => {
  const d = await deposer();
  const q = await qualifier(d.id);
  assert.equal(q.etat, 'qualifiee');
  await qualifier(d.id);
  const h = getDb().prepare('SELECT de_etat, vers_etat, user_id FROM demande_historique WHERE demande_id = ? ORDER BY id').all(d.id);
  assert.deepEqual(h.map((x) => `${x.de_etat}>${x.vers_etat}`), ['null>a_qualifier', 'a_qualifier>qualifiee']);
  assert.equal(h[1].user_id, gest.id);
  assert.ok(q.transitions.some((t) => t.vers === 'en_cours'), 'passages permis sur la fiche du service');
  assert.ok(!q.transitions.some((t) => t.vers === 'planifiee'), 'Planifiée fermée (DV-118)');
});

test('parcours complet : attente avec motif, reprise, fin, retour, clôture avec cause et compte rendu', async () => {
  const d = await deposer();
  await qualifier(d.id);
  // Motif exigé, de la bonne liste et de l'entité.
  assert.equal((await passer(gest, d.id, { etat: 'en_attente' })).body.code, 'MOTIF_REQUIS');
  assert.equal((await passer(gest, d.id, { etat: 'en_attente', motif_id: V.usure })).body.code, 'VALEUR_INVALIDE', 'autre liste');
  assert.equal((await passer(gest, d.id, { etat: 'en_attente', motif_id: V.pieceB })).body.code, 'VALEUR_INVALIDE', 'autre entité');
  let r = await passer(gest, d.id, { etat: 'en_attente', motif_id: V.piece, commentaire: 'Ampoule spéciale commandée, livraison mardi.' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.etat, 'en_attente');
  assert.equal((await passer(gest, d.id, { etat: 'en_cours', motif_id: V.piece })).body.code, 'MOTIF_INUTILE');
  r = await passer(gest, d.id, { etat: 'en_cours' });
  assert.equal(r.body.data.etat, 'en_cours');
  assert.equal((await passer(gest, d.id, { etat: 'terminee', compte_rendu: 'Trop tôt' })).body.code, 'COMPTE_RENDU_INUTILE');
  r = await passer(gest, d.id, { etat: 'terminee', commentaire: 'Note interne : ampoule LED 12 W.' });
  assert.equal(r.body.data.etat, 'terminee');
  assert.equal((await passer(gest, d.id, { etat: 'en_cours' })).body.code, 'COMMENTAIRE_REQUIS');
  r = await passer(gest, d.id, { etat: 'en_cours', commentaire: 'Le support tient mal, à refixer.' });
  assert.equal(r.body.data.etat, 'en_cours');
  await passer(gest, d.id, { etat: 'terminee' });
  assert.equal((await passer(gest, d.id, { etat: 'cloturee' })).body.code, 'MOTIF_REQUIS', 'cause de la panne exigée');
  r = await passer(gest, d.id, { etat: 'cloturee', motif_id: V.usure, compte_rendu: 'Ampoule et support remplacés.', commentaire: 'L’éclairage est réparé.' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.etat, 'cloturee');
  assert.equal(r.body.data.cause_code, 'usure');
  assert.equal(r.body.data.compte_rendu, 'Ampoule et support remplacés.');
  assert.deepEqual(r.body.data.transitions, [], 'aucun passage du service depuis « Clôturée » en 0.14.0, point 2');
  // Le demandeur ne lit ni la cause ni le compte rendu ni les passages.
  const vue = (await agent.get(`/api/demandes/${d.id}`)).body.data;
  assert.equal(vue.etat_libelle_fr, 'Clôturée');
  for (const k of ['cause_id', 'cause_code', 'compte_rendu', 'transitions']) assert.equal(vue[k], undefined, k);
  // Historique complet, dans l'ordre.
  const h = (await gest.get(`/api/demandes/${d.id}/historique`)).body.data;
  assert.deepEqual(h.map((x) => x.vers_etat), ['a_qualifier', 'qualifiee', 'en_attente', 'en_cours', 'terminee', 'en_cours', 'terminee', 'cloturee']);
  assert.equal(h[2].motif_code, 'piece');
  assert.equal(h[2].auteur_nom, 'Nom');
  assert.equal(h.at(-1).motif_code, 'usure');
});

test('historique lu par le demandeur : ni nom d’agent, ni canal, ni commentaire interne ; libellés de l’entité', async () => {
  const d = await deposer();
  await qualifier(d.id);
  await passer(gest, d.id, { etat: 'en_attente', motif_id: V.demandeur, commentaire: 'Merci de préciser l’étage.' });
  await passer(gest, d.id, { etat: 'en_cours' });
  await passer(gest, d.id, { etat: 'terminee', commentaire: 'Interne : échelle de 3 m.' });
  const h = (await agent.get(`/api/demandes/${d.id}/historique`)).body.data;
  assert.equal(h[0].auteur, 'demandeur');
  assert.ok(h.slice(1).every((x) => x.auteur === 'service'));
  for (const x of h) for (const k of ['user_id', 'auteur_prenom', 'auteur_nom', 'canal']) assert.equal(x[k], undefined, k);
  assert.equal(h[2].commentaire, 'Merci de préciser l’étage.');
  assert.equal(h[2].motif_libelle_fr, 'Réponse du demandeur attendue');
  assert.equal(h[4].commentaire, null, 'commentaire interne caché');
  assert.equal(h[1].etat_libelle_fr, 'Prise en charge');
  // Personne hors de la demande : refusée.
  const autre = await person(srv.base, admin, 'autre.cy@exemple.test', ea.id);
  assert.equal((await autre.get(`/api/demandes/${d.id}/historique`)).status, 403);
  assert.equal((await gestB.get(`/api/demandes/${d.id}/historique`)).status, 403);
});

test('refus avec motif, annulation avec commentaire obligatoire ; aucune suppression (CYC-05)', async () => {
  const a = await deposer();
  assert.equal((await passer(gest, a.id, { etat: 'refusee' })).body.code, 'MOTIF_REQUIS');
  const r = await passer(gest, a.id, { etat: 'refusee', motif_id: V.doublon });
  assert.equal(r.body.data.etat, 'refusee');
  assert.equal(r.body.data.ouverte, 0);
  const b = await deposer();
  assert.equal((await passer(gest, b.id, { etat: 'annulee' })).body.code, 'COMMENTAIRE_REQUIS');
  assert.equal((await passer(gest, b.id, { etat: 'annulee', commentaire: 'Demande faite par erreur.' })).body.data.etat, 'annulee');
  assert.ok(getDb().prepare('SELECT 1 FROM demandes WHERE id = ?').get(b.id), 'la demande reste en base');
  assert.equal((await gest.del(`/api/demandes/${b.id}`, { motif: 'x' })).status, 409, 'DELETE annule (déjà annulée : refus), il ne supprime jamais');
  assert.ok(getDb().prepare('SELECT 1 FROM demandes WHERE id = ?').get(b.id));
});

test('journal : passage noté sans texte libre, motif nommé à la lecture', async () => {
  const d = await deposer();
  await qualifier(d.id);
  await passer(gest, d.id, { etat: 'en_attente', motif_id: V.piece, commentaire: 'Texte libre qui ne doit pas aller au journal.' });
  const lignes = (await admin.get('/api/audit?action=demande.transition&limit=200')).body.data.filter((l) => l.entity_id === d.id);
  assert.equal(lignes.length, 1);
  assert.deepEqual(lignes[0].details, { numero: d.numero, de: 'qualifiee', vers: 'en_attente', motif_id: V.piece, commentaire_donne: 1, suspendu: 0 });
  assert.equal(lignes[0].noms.motif_id.nom_fr, 'Pièce à commander');
  const brut = getDb().prepare("SELECT details_json FROM audit_log WHERE action = 'demande.transition' AND entity_id = ?").get(d.id).details_json;
  assert.doesNotMatch(brut, /Texte libre/);
});

test('passages en données : un passage désactivé en base est refusé et n’est jamais réactivé au démarrage', async () => {
  const d = await deposer();
  await qualifier(d.id);
  getDb().prepare("UPDATE demande_transitions SET is_active = 0 WHERE de_etat = 'qualifiee' AND vers_etat = 'en_cours'").run();
  try {
    assert.equal((await passer(gest, d.id, { etat: 'en_cours' })).body.code, 'TRANSITION_INTERDITE');
    assert.ok(!(await gest.get(`/api/demandes/${d.id}`)).body.data.transitions.some((t) => t.vers === 'en_cours'));
    cycle.seedTransitions();
    assert.equal(getDb().prepare("SELECT is_active FROM demande_transitions WHERE de_etat = 'qualifiee' AND vers_etat = 'en_cours'").get().is_active, 0);
  } finally {
    getDb().prepare("UPDATE demande_transitions SET is_active = 1 WHERE de_etat = 'qualifiee' AND vers_etat = 'en_cours'").run();
  }
});

test('MCP : passage en deux appels ; la préparation n’écrit rien ; canal MCP ; demandeur refusé', async () => {
  const d = await deposer();
  await qualifier(d.id);
  const p = await tool(gest, 'prepare_change_etat_demande', { id: d.id, etat: 'en_attente', motif_id: V.piece, commentaire: 'Pièce commandée.' });
  assert.equal(p.data.de, 'qualifiee');
  assert.equal(p.data.vers, 'en_attente');
  assert.equal(p.data.motif.code, 'piece');
  assert.equal(p.data.commentaire_lu_par_le_demandeur, 1);
  assert.equal((await gest.get(`/api/demandes/${d.id}`)).body.data.etat, 'qualifiee', 'rien d’écrit à la préparation');
  const c = await tool(gest, 'confirm_change_etat_demande', { confirmation_token: p.data.confirmation_token });
  assert.equal(c.data.etat, 'en_attente');
  assert.equal(getDb().prepare('SELECT canal FROM demande_historique WHERE demande_id = ? ORDER BY id DESC').get(d.id).canal, 'mcp');
  assert.equal((await tool(agent, 'prepare_change_etat_demande', { id: d.id, etat: 'en_cours' })).code, 'FORBIDDEN');
  assert.equal((await tool(gest, 'prepare_change_etat_demande', { id: d.id, etat: 'terminee' })).code, 'TRANSITION_INTERDITE');
  const h = await tool(agent, 'get_historique_demande', { id: d.id });
  assert.equal(h.data.at(-1).commentaire, 'Pièce commandée.');
});

test('libellés des états par entité (CYC-04) : lus par tous, réglés par le responsable, journalisés, sans toucher l’autre entité', async () => {
  const l = await agent.get('/api/etats-demande');
  assert.equal(l.status, 200);
  assert.deepEqual(l.body.data.map((e) => e.code), cycle.ETATS);
  const att = l.body.data.find((e) => e.code === 'en_attente');
  assert.equal(att.suspend, 'selon_motif');
  assert.equal(att.trace.etat, 'livree');
  assert.equal((await gest.put('/api/etats-demande/en_attente', { libelle_fr: 'Suspendue' })).status, 403);
  assert.equal((await resp.put('/api/etats-demande/inconnu', { libelle_fr: 'X' })).status, 400);
  assert.equal((await resp.put('/api/etats-demande/en_attente', { libelle_fr: '' })).status, 400);
  const u = await resp.put('/api/etats-demande/en_attente', { libelle_fr: 'En attente d’un élément', grc_fr: 'En attente' });
  assert.equal(u.status, 200, JSON.stringify(u.body));
  assert.equal(u.body.data.libelle_fr, 'En attente d’un élément');
  assert.equal(u.body.data.livre_fr, 'En attente');
  assert.equal(u.body.data.trace.etat, 'modifiee');
  const a = (await admin.get('/api/audit?action=etat_demande.update')).body.data[0];
  assert.deepEqual(a.details, { code: 'en_attente', avant: { libelle_fr: 'En attente' }, apres: { libelle_fr: 'En attente d’un élément' } });
  const d = await deposer();
  await qualifier(d.id);
  await passer(gest, d.id, { etat: 'en_attente', motif_id: V.piece });
  assert.equal((await agent.get(`/api/demandes/${d.id}`)).body.data.etat_libelle_fr, 'En attente d’un élément');
  assert.equal((await gestB.get('/api/etats-demande')).body.data.find((e) => e.code === 'en_attente').libelle_fr, 'En attente', 'autre entité inchangée');
  const m = await tool(resp, 'update_etat_demande', { code: 'en_attente', libelle_nl: 'Wacht op een element' });
  assert.equal(m.data.libelle_nl, 'Wacht op een element');
});

test('migration 012 sur une base 0.13.0 : historique repris de la fiche, état daté, passages et libellés livrés', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { spawnSync } = require('child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gmao-m012-'));
  const env = { PATH: process.env.PATH, NODE_ENV: 'test', APP_TEST_MODE: '1', DB_PATH: path.join(dir, 'm.db') };
  const run = (code) => spawnSync(process.execPath, ['-e', code], { cwd: path.join(__dirname, '..'), env, encoding: 'utf8' });
  const prep = run(`
    const initSqlJs = require('sql.js'); const fs = require('fs');
    const { MIGRATIONS } = require('./src/database');
    initSqlJs().then((SQL) => {
      const db = new SQL.Database();
      db.run("CREATE TABLE schema_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, applied_at TEXT DEFAULT (datetime('now')))");
      for (const [name, sql] of MIGRATIONS.slice(0, 11)) { for (const s of sql.split(';').map((x) => x.trim()).filter(Boolean)) db.run(s); db.run('INSERT INTO schema_migrations (name) VALUES (?)', [name]); }
      db.run("INSERT INTO entites (code, nom_fr, nom_nl) VALUES ('AC', 'AC', 'GB')");
      db.run("INSERT INTO users (email, first_name, last_name) VALUES ('a@exemple.test', 'A', 'B')");
      db.run("INSERT INTO lieux (entite_id, nature, code, nom_fr, nom_nl) VALUES (1, 'site', 'AC-S', 'Site', 'Site')");
      db.run("INSERT INTO categories (entite_id, code, libelle_fr, libelle_nl) VALUES (1, 'eclairage', 'Éclairage', 'Verlichting')");
      db.run("INSERT INTO demandes (entite_id, numero, annee, sequence, lieu_id, categorie_id, description, demandeur_id, created_at) VALUES (1, 'AC-DI-2026-00001', 2026, 1, 1, 1, 'Lampe en panne au couloir', 1, '2026-11-01 08:00:00')");
      db.run("INSERT INTO demandes (entite_id, numero, annee, sequence, lieu_id, categorie_id, description, demandeur_id, canal, etat, qualifiee_par, qualifiee_le, created_at) VALUES (1, 'AC-DI-2026-00002', 2026, 2, 1, 1, 'Fuite sous l évier', 1, 'mcp', 'qualifiee', 1, '2026-11-03 09:00:00', '2026-11-02 08:00:00')");
      fs.writeFileSync(process.env.DB_PATH, Buffer.from(db.export()));
    });`);
  assert.equal(prep.status, 0, prep.stderr);
  const up = run(`require('./src/database').initDb().then((db) => {
    console.log(JSON.stringify({
      migration: db.prepare('SELECT name FROM schema_migrations ORDER BY id DESC').get().name,
      historique: db.prepare('SELECT demande_id, de_etat, vers_etat, canal, created_at FROM demande_historique ORDER BY demande_id, id').all(),
      depuis: db.prepare('SELECT etat_depuis FROM demandes ORDER BY id').all().map((d) => d.etat_depuis),
      transitions: db.prepare('SELECT COUNT(*) AS n FROM demande_transitions').get().n,
      etats: db.prepare('SELECT COUNT(*) AS n FROM demande_etats WHERE entite_id = 1').get().n,
    }));
  })`);
  assert.equal(up.status, 0, up.stderr);
  assert.match(up.stdout, /\[DB\] Migration 012_cycle_de_vie appliquée/);
  const out = JSON.parse(up.stdout.trim().split('\n').pop());
  assert.equal(out.migration, '013_messages', 'les migrations suivantes passent aussi (0.15.0)');
  assert.deepEqual(out.historique, [
    { demande_id: 1, de_etat: null, vers_etat: 'a_qualifier', canal: 'ecran', created_at: '2026-11-01 08:00:00' },
    { demande_id: 2, de_etat: null, vers_etat: 'a_qualifier', canal: 'mcp', created_at: '2026-11-02 08:00:00' },
    { demande_id: 2, de_etat: 'a_qualifier', vers_etat: 'qualifiee', canal: 'ecran', created_at: '2026-11-03 09:00:00' },
  ]);
  assert.deepEqual(out.depuis, ['2026-11-01 08:00:00', '2026-11-03 09:00:00']);
  assert.equal(out.transitions, cycle.CONFIG.transitions.length);
  assert.equal(out.etats, cycle.ETATS.length);
  const again = run("require('./src/database').initDb().then((db) => console.log(db.prepare('SELECT COUNT(*) AS n FROM demande_historique').get().n))");
  assert.equal(again.status, 0, again.stderr);
  assert.equal(again.stdout.trim().split('\n').pop(), '3', 'pas de relance');
});

// 0.14.0, point 5 (SUI-05, E-21) : complément et annulation par le demandeur ou le bénéficiaire.
test('demandeur : complément daté tant que la demande est ouverte ; description inchangée ; journal sans texte ; MCP', async () => {
  const d = await deposer();
  assert.equal(d.completable, 1);
  assert.equal(d.annulable, 1);
  const r = await agent.put(`/api/demandes/${d.id}`, { complement: '  C’est la lampe près de la fenêtre.  ' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.description, d.description);
  assert.equal(r.body.data.complements.length, 1);
  assert.equal(r.body.data.complements[0].texte, 'C’est la lampe près de la fenêtre.');
  assert.equal(r.body.data.complements[0].auteur, 'demandeur');
  // Le service technique lit le complément ; une personne non concernée ne complète pas.
  assert.equal((await gest.get(`/api/demandes/${d.id}`)).body.data.complements.length, 1);
  assert.equal((await gest.put(`/api/demandes/${d.id}`, { complement: 'Ajout du service' })).status, 403);
  assert.equal((await agent.put(`/api/demandes/${d.id}`, { complement: '' })).status, 400);
  const a = (await admin.get('/api/audit?action=demande.complement&limit=200')).body.data.find((l) => l.entity_id === d.id);
  assert.deepEqual(Object.keys(a.details).sort(), ['complement_id', 'longueur', 'numero']);
  const m = await tool(agent, 'complete_demande', { id: d.id, complement: 'Par Claude : elle clignote aussi.' });
  assert.equal(m.data.complements.length, 2);
  // Demande fermée : plus de complément.
  await passer(gest, d.id, { etat: 'refusee', motif_id: V.doublon });
  const ferme = await agent.put(`/api/demandes/${d.id}`, { complement: 'Encore ?' });
  assert.equal(ferme.status, 409);
  assert.equal(ferme.body.code, 'DEMANDE_FERMEE');
  assert.equal((await agent.get(`/api/demandes/${d.id}`)).body.data.completable, 0);
});

test('demandeur : annulation avec motif tant que les travaux n’ont pas commencé, aussi depuis « En attente » ; jamais après « En cours »', async () => {
  const a = await deposer();
  assert.equal((await agent.del(`/api/demandes/${a.id}`, {})).status, 400);
  const r = await agent.del(`/api/demandes/${a.id}`, { motif: 'Le problème s’est réglé tout seul.' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.etat, 'annulee');
  const h = getDb().prepare('SELECT de_etat, vers_etat, user_id, commentaire, commentaire_public FROM demande_historique WHERE demande_id = ? ORDER BY id DESC').get(a.id);
  assert.deepEqual(h, { de_etat: 'a_qualifier', vers_etat: 'annulee', user_id: agent.id, commentaire: 'Le problème s’est réglé tout seul.', commentaire_public: 1 });
  // En attente sans être passée par « En cours » : annulable.
  const b = await deposer();
  await qualifier(b.id);
  await passer(gest, b.id, { etat: 'en_attente', motif_id: V.demandeur });
  assert.equal((await agent.get(`/api/demandes/${b.id}`)).body.data.annulable, 1);
  assert.equal((await agent.del(`/api/demandes/${b.id}`, { motif: 'Plus besoin.' })).body.data.etat, 'annulee');
  // Travaux commencés puis mis en attente : plus annulable par le demandeur.
  const c = await deposer();
  await qualifier(c.id);
  await passer(gest, c.id, { etat: 'en_cours' });
  assert.equal((await agent.get(`/api/demandes/${c.id}`)).body.data.annulable, 0);
  assert.equal((await agent.del(`/api/demandes/${c.id}`, { motif: 'x' })).body.code, 'TRANSITION_INTERDITE');
  await passer(gest, c.id, { etat: 'en_attente', motif_id: V.piece });
  const k = await agent.del(`/api/demandes/${c.id}`, { motif: 'x' });
  assert.equal(k.status, 409);
  assert.equal(k.body.code, 'TRAVAUX_COMMENCES');
  assert.equal((await agent.get(`/api/demandes/${c.id}`)).body.data.annulable, 0);
  // MCP en deux appels ; le résumé n'écrit rien.
  const e = await deposer();
  const p = await tool(agent, 'prepare_cancel_demande', { id: e.id, motif: 'Doublon de ma demande.' });
  assert.equal(p.data.action, 'cancel_demande');
  assert.equal((await agent.get(`/api/demandes/${e.id}`)).body.data.etat, 'a_qualifier');
  assert.equal((await tool(agent, 'confirm_cancel_demande', { confirmation_token: p.data.confirmation_token })).data.etat, 'annulee');
});

test('bénéficiaire : complète et annule ; qui suit seulement (« Moi aussi ») ne le peut pas', async () => {
  const benef = await person(srv.base, admin, 'benef.cy@exemple.test', ea.id);
  const suiveur = await person(srv.base, admin, 'suiveur.cy@exemple.test', ea.id);
  const d = (await agent.post('/api/demandes', { lieu_id: lieu, categorie_id: categorie.id, description: 'Pour un collègue : prise arrachée.', beneficiaire_id: benef.id })).body.data;
  await suiveur.post(`/api/demandes/${d.id}/suivre`, {});
  const vu = (await suiveur.get(`/api/demandes/${d.id}`)).body.data;
  assert.equal(vu.completable, 0);
  assert.equal(vu.annulable, 0);
  assert.equal((await suiveur.put(`/api/demandes/${d.id}`, { complement: 'Moi aussi' })).status, 403);
  assert.equal((await suiveur.del(`/api/demandes/${d.id}`, { motif: 'x' })).status, 403);
  const c = await benef.put(`/api/demandes/${d.id}`, { complement: 'Bureau 3, à gauche.' });
  assert.equal(c.body.data.complements[0].auteur, 'beneficiaire');
  assert.equal((await benef.del(`/api/demandes/${d.id}`, { motif: 'Réparée par un collègue.' })).body.data.etat, 'annulee');
});

test('demandeur : photo ajoutée à une demande envoyée, dans le plafond ; refusée à une demande fermée et à qui n’est pas concerné', async () => {
  const { jpeg } = require('./fixtures');
  const envoyer = async (c, id) => {
    const body = new FormData();
    body.append('fichier', new Blob([jpeg()], { type: 'image/jpeg' }), 'photo.jpg');
    const res = await fetch(`${srv.base}/api/demandes/${id}/pieces`, { method: 'POST', headers: { Cookie: c.cookie, 'X-CSRF-Token': c.csrf }, body });
    return { status: res.status, body: await res.json() };
  };
  const d = await deposer();
  const r = await envoyer(agent, d.id);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.data.demande_id, d.id);
  assert.equal(r.body.data.brouillon, 0);
  assert.equal((await agent.get(`/api/demandes/${d.id}`)).body.data.pieces.length, 1);
  const j = (await admin.get('/api/audit?action=piece.add&limit=200')).body.data.find((l) => l.entity_id === r.body.data.id);
  assert.equal(j.details.numero, d.numero);
  assert.equal((await envoyer(gest, d.id)).status, 403, 'le service ne dépose pas au nom du demandeur');
  for (let i = 1; i < 5; i += 1) assert.equal((await envoyer(agent, d.id)).status, 201);
  const plein = await envoyer(agent, d.id);
  assert.equal(plein.status, 409);
  assert.equal(plein.body.code, 'PIECES_PLAFOND');
  const e = await deposer();
  await passer(gest, e.id, { etat: 'annulee', commentaire: 'Erreur.' });
  assert.equal((await envoyer(agent, e.id)).body.code, 'DEMANDE_FERMEE');
});

// 0.14.0, point 6 (SUI-06) : avis à la clôture et réouverture dans le délai de l'entité.
async function cloturee() {
  const d = await deposer();
  await qualifier(d.id);
  await passer(gest, d.id, { etat: 'terminee' });
  const r = await passer(gest, d.id, { etat: 'cloturee', motif_id: V.usure, compte_rendu: 'Fait.' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.data;
}

test('avis : seulement à la clôture, un par clôture, note de 1 à 5 ; lu par le service ; journal sans commentaire ; MCP', async () => {
  const ouverte = await deposer();
  assert.equal((await agent.post(`/api/demandes/${ouverte.id}/avis`, { note: 4 })).body.code, 'AVIS_PAS_CLOTUREE');
  const d = await cloturee();
  const vue = (await agent.get(`/api/demandes/${d.id}`)).body.data;
  assert.equal(vue.avis_possible, 1);
  assert.deepEqual(vue.avis, []);
  assert.equal((await agent.post(`/api/demandes/${d.id}/avis`, { note: 6 })).status, 400);
  assert.equal((await gest.post(`/api/demandes/${d.id}/avis`, { note: 5 })).status, 403, 'le service ne note pas à la place du demandeur');
  const r = await agent.post(`/api/demandes/${d.id}/avis`, { note: 4, commentaire: 'Rapide, merci.' });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.data.avis_possible, 0);
  assert.equal(r.body.data.avis[0].note, 4);
  assert.equal(r.body.data.avis[0].auteur, 'demandeur');
  assert.equal((await agent.post(`/api/demandes/${d.id}/avis`, { note: 1 })).body.code, 'AVIS_DEJA_DONNE');
  const s = (await gest.get(`/api/demandes/${d.id}`)).body.data;
  assert.equal(s.avis[0].commentaire, 'Rapide, merci.');
  const j = (await admin.get('/api/audit?action=demande.avis&limit=200')).body.data.find((l) => l.entity_id === d.id);
  assert.deepEqual(j.details, { numero: d.numero, note: 4, commentaire_donne: 1 });
  const e = await cloturee();
  assert.equal((await tool(agent, 'give_avis_demande', { id: e.id, note: 5 })).data.avis[0].note, 5);
});

test('réouverture : dans le délai, avec ce qui ne va pas ; délais repartis de la réouverture ; file à qualifier ; nouvel avis après la nouvelle clôture', async () => {
  const d = await cloturee();
  const vue = (await agent.get(`/api/demandes/${d.id}`)).body.data;
  assert.equal(vue.reouvrable, 1);
  const attendu = new Date(new Date(`${vue.etat_depuis.replace(' ', 'T')}Z`).getTime() + 7 * 86400000).toISOString().replace('T', ' ').slice(0, 19);
  assert.equal(vue.reouvrable_jusqu_au, attendu);
  assert.equal((await passer(agent, d.id, { etat: 'rouverte' })).body.code, 'COMMENTAIRE_REQUIS');
  // Temps suspendu d'avant la clôture : remis à zéro à la réouverture.
  // Réception reculée de 30 jours : des délais comptés depuis la réception seraient déjà dépassés.
  getDb().prepare("UPDATE demandes SET suspendu_ouvrable_min = 90, suspendu_calendaire_min = 600, created_at = datetime('now', '-30 days'), prise_en_charge_le = datetime('now', '-29 days'), echeance_le = datetime('now', '-20 days') WHERE id = ?").run(d.id);
  const avantPrise = getDb().prepare('SELECT prise_en_charge_le FROM demandes WHERE id = ?').get(d.id).prise_en_charge_le;
  const bord = (await gest.get('/api/demandes/tableau-bord')).body.data.a_qualifier;
  const r = await passer(agent, d.id, { etat: 'rouverte', commentaire: 'La lampe clignote de nouveau.' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.etat, 'rouverte');
  const b = getDb().prepare('SELECT * FROM demandes WHERE id = ?').get(d.id);
  assert.ok(b.decompte_depuis);
  assert.ok(b.prise_en_charge_le > avantPrise, 'prise en charge recalculée depuis la réouverture');
  assert.equal(b.suspendu_ouvrable_min, 0);
  assert.equal(b.suspendu_calendaire_min, 0);
  assert.equal((await gest.get('/api/demandes/tableau-bord')).body.data.a_qualifier, bord + 1);
  assert.ok((await gest.get('/api/demandes?perimetre=entite&etats=a_qualifier,rouverte&limit=200')).body.data.some((x) => x.id === d.id));
  const s = (await gest.get(`/api/demandes/${d.id}`)).body.data;
  assert.equal(s.retard, 0);
  assert.equal(s.echeance_type, 'prise_en_charge');
  assert.ok(s.transitions.some((t) => t.vers === 'qualifiee' && t.via === 'qualifier'));
  // Nouvelle qualification : la fin se compte depuis la réouverture.
  const q = await qualifier(d.id);
  assert.ok(q.echeance_le > b.decompte_depuis, 'fin comptée depuis la réouverture, pas depuis la réception');
  assert.equal(q.retard, 0);
  await passer(gest, d.id, { etat: 'en_cours' });
  await passer(gest, d.id, { etat: 'terminee' });
  await passer(gest, d.id, { etat: 'cloturee', motif_id: V.usure });
  assert.equal((await agent.get(`/api/demandes/${d.id}`)).body.data.avis_possible, 1, 'nouvelle clôture, nouvel avis');
});

test('réouverture refusée après le délai, ou fermée par l’entité (0 jour) ; personne non concernée refusée', async () => {
  const d = await cloturee();
  getDb().prepare('UPDATE demandes SET etat_depuis = ? WHERE id = ?').run(new Date(Date.now() - 8 * 86400000).toISOString().replace('T', ' ').slice(0, 19), d.id);
  assert.equal((await agent.get(`/api/demandes/${d.id}`)).body.data.reouvrable, 0);
  const k = await passer(agent, d.id, { etat: 'rouverte', commentaire: 'Toujours en panne.' });
  assert.equal(k.status, 409);
  assert.equal(k.body.code, 'DELAI_REOUVERTURE');
  const e = await cloturee();
  await resp.put('/api/parametres-entite/demandes.delai_reouverture_jours', { valeur: '0' });
  try {
    assert.equal((await agent.get(`/api/demandes/${e.id}`)).body.data.reouvrable, 0);
    assert.equal((await passer(agent, e.id, { etat: 'rouverte', commentaire: 'x' })).body.code, 'DELAI_REOUVERTURE');
  } finally { await resp.del('/api/parametres-entite/demandes.delai_reouverture_jours'); }
  const etranger = await person(srv.base, admin, 'etranger2.cy@exemple.test', ea.id);
  assert.equal((await passer(etranger, e.id, { etat: 'rouverte', commentaire: 'x' })).status, 403);
  assert.equal((await passer(gest, e.id, { etat: 'rouverte', commentaire: 'x' })).body.code, 'TRANSITION_INTERDITE', 'le service ne rouvre pas à la place du demandeur');
});

// 0.15.0 (correction notée à la recette de la 0.14.0) : les notes de livraison annonçaient 25 passages, le catalogue en
// compte 26. Les nombres d'états et de passages cités par les notes et la documentation suivent le catalogue.
test('documentation : nombres d’états et de passages égaux au catalogue', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const racine = path.join(__dirname, '..', '..');
  const fichiers = ['NOTES_LIVRAISON_v0.14.0.md', 'CHANGELOG.md', 'docs/fr/ARCHITECTURE.md', 'docs/en/ARCHITECTURE.md', 'docs/nl/ARCHITECTURE.md'];
  let vus = 0;
  for (const f of fichiers) {
    const texte = fs.readFileSync(path.join(racine, f), 'utf8');
    for (const m of texte.matchAll(/(\d+) (passages|transitions|overgangen)\b/g)) { vus += 1; assert.equal(Number(m[1]), cycle.CONFIG.transitions.length, `${f} : « ${m[0]} »`); }
    for (const m of texte.matchAll(/(\d+) (états|statuses|statussen)\b/g)) { vus += 1; assert.equal(Number(m[1]), Object.keys(cycle.CONFIG.etats).length, `${f} : « ${m[0]} »`); }
  }
  assert.ok(vus >= 6, `${vus} mentions trouvées`);
});
