/**
 * Notifications de la cloche (0.17.0, étape 13, point 1 ; NOT-01, NOT-02, NOT-06, DEM-07, DEM-12) : migration 015,
 * catalogue des événements, accusé de réception au demandeur (lu s'il vient de l'envoyer lui-même, non lu s'il est encodé
 * par le service), au bénéficiaire ; texte composé en FR et en NL sans texte libre ; lecture, compteur, entité active et
 * autres entités ; personne d'autre ne lit la notification d'une personne ; module éteint ; conservation ; MCP.
 * La cloison entre entités est aussi essayée dans cloison.test.js.
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
let chef;
let multi;
let lieu;
let lieuB;
let eclairage;
let demenagement;

const parse = (r) => JSON.parse(r.body.result.content[0].text);
const tool = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args })).data;
const ligne = (id) => getDb().prepare('SELECT * FROM notifications WHERE id = ?').get(id);

async function deposer(c, extra = {}, categorie = eclairage, ou = lieu) {
  const r = await c.post('/api/demandes', { lieu_id: ou, categorie_id: categorie.id, description: 'Le néon du couloir clignote depuis lundi.', ...extra });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.data;
}

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  gest = await person(srv.base, admin, 'gest.not@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  agent = await person(srv.base, admin, 'agent.not@exemple.test', ea.id);
  collegue = await person(srv.base, admin, 'collegue.not@exemple.test', ea.id);
  chef = await person(srv.base, admin, 'chef.not@exemple.test', ea.id, [[ea.id, 'valideur']]);
  multi = await person(srv.base, admin, 'multi.not@exemple.test', ea.id, [[eb.id, 'agent']]);
  lieu = (await gest.post('/api/lieux', { nature: 'site', code: 'NS', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis' })).body.data.id;
  const gestB = await person(srv.base, admin, 'gest.notb@exemple.test', eb.id, [[eb.id, 'gestionnaire']]);
  lieuB = (await gestB.post('/api/lieux', { nature: 'site', code: 'NB', nom_fr: 'CPAS', nom_nl: 'OCMW' })).body.data.id;
  eclairage = (await agent.get('/api/categories?niveau=nature&q=eclairage')).body.data[0];
  demenagement = (await agent.get('/api/categories?niveau=nature&q=demenagement')).body.data[0];
  const service = (await admin.post('/api/services', { entite_id: ea.id, code: 'NOT', nom_fr: 'Secrétariat', nom_nl: 'Secretariaat', valideur_id: chef.id })).body.data;
  assert.equal((await admin.put(`/api/users/${agent.id}`, { service_id: service.id })).status, 200);
});
after(() => srv.stop());

test('migration 015_notifications appliquée ; table sans colonne de texte libre (NOT-06)', () => {
  const db = getDb();
  assert.ok(db.prepare("SELECT 1 FROM schema_migrations WHERE name = '015_notifications'").get());
  const colonnes = db.prepare('PRAGMA table_info(notifications)').all().map((c) => c.name);
  assert.deepEqual(colonnes, ['id', 'user_id', 'entite_id', 'evenement', 'variante', 'objet', 'objet_id', 'numero', 'lien', 'lue_le', 'created_at']);
});

test('catalogue (NOT-01) : événements en données, FR et NL ; émis ceux des demandes et des tickets (points 1, 4, 5 et 6), ceux des modules à venir avec leur étape', async () => {
  const r = await agent.get('/api/notifications/evenements');
  assert.equal(r.status, 200);
  const ev = r.body.data;
  for (const code of ['demande.recue', 'demande.validation_demandee', 'demande.validee', 'demande.refusee_validation', 'demande.etat', 'demande.message',
    'demande.mention', 'demande.echeance_proche', 'demande.retard', 'demande.danger_sans_validation', 'reservation.confirmee', 'reservation.refusee',
    'materiel.rappel_retour', 'controle.echu', 'ticket.cree', 'ticket.reponse']) assert.ok(ev.find((e) => e.code === code), code);
  // 0.21.0 (point 5, SUI-03) : date prévue modifiée.
  assert.deepEqual(ev.filter((e) => e.disponible).map((e) => e.code), ['demande.recue', 'demande.validation_demandee', 'demande.validee', 'demande.refusee_validation', 'demande.danger_sans_validation', 'demande.etat',
    'demande.date_prevue', 'demande.message', 'demande.mention', 'demande.echeance_proche', 'demande.retard', 'ticket.cree', 'ticket.reponse']);
  for (const e of ev) {
    assert.ok(e.libelle_fr && e.libelle_nl && e.destinataires_fr && e.destinataires_nl, e.code);
    assert.ok(e.variantes.find((v) => v.code === 'defaut'), `${e.code} : variante defaut`);
    for (const v of e.variantes) assert.ok(v.fr.includes('{numero}') && v.nl.includes('{numero}'), `${e.code}/${v.code} : numéro`);
    if (!e.disponible) assert.ok(e.etape, `${e.code} : étape notée`);
  }
  assert.equal(ev.find((e) => e.code === 'reservation.confirmee').module, 'salles');
});

test('accusé de réception (DEM-12) : la personne qui envoie sa demande le trouve lu, sans allumer la cloche', async () => {
  const d = await deposer(agent);
  const r = await agent.get('/api/notifications');
  assert.equal(r.status, 200);
  const n = r.body.data.find((x) => x.objet_id === d.id);
  assert.ok(n, 'accusé présent');
  assert.equal(n.evenement, 'demande.recue');
  assert.equal(n.lue, 1);
  assert.equal(n.numero, d.numero);
  assert.equal(n.lien, `/demandes?demande=${d.id}`);
  assert.equal(n.texte_fr, `Votre demande ${d.numero} est bien reçue par le service technique.`);
  assert.equal(n.texte_nl, `Uw aanvraag ${d.numero} is goed ontvangen door de technische dienst.`);
  assert.ok(!JSON.stringify(n).includes('néon'), 'aucun texte de la demande (NOT-06)');
  assert.equal(r.body.meta.non_lues, 0);
  assert.deepEqual((await agent.get('/api/notifications/compteur')).body.data, { non_lues: 0, autres_entites: 0 });
  assert.equal((await gest.get('/api/notifications')).body.data.filter((x) => x.objet_id === d.id).length, 0, 'le service n’a pas d’accusé');
});

test('demande à valider : variante « attend l’accord de votre chef de service »', async () => {
  const d = await deposer(agent, {}, demenagement);
  assert.equal(d.etat, 'en_validation');
  const n = (await agent.get('/api/notifications')).body.data.find((x) => x.objet_id === d.id);
  assert.equal(n.variante, 'validation');
  assert.equal(n.texte_fr, `Votre demande ${d.numero} est enregistrée ; elle attend l'accord de votre chef de service.`);
  assert.equal(n.texte_nl, `Uw aanvraag ${d.numero} is geregistreerd; ze wacht op het akkoord van uw diensthoofd.`);
});

test('demande encodée par le service pour un agent : l’accusé de l’agent est non lu ; rien pour qui encode', async () => {
  const avant = (await agent.get('/api/notifications/compteur')).body.data.non_lues;
  const d = await deposer(gest, { demandeur_id: agent.id, canal: 'telephone' });
  assert.equal((await agent.get('/api/notifications/compteur')).body.data.non_lues, avant + 1);
  const n = (await agent.get('/api/notifications?non_lues=1')).body.data[0];
  assert.equal(n.objet_id, d.id);
  assert.equal(n.lue, 0);
  assert.equal((await gest.get('/api/notifications')).body.data.filter((x) => x.objet_id === d.id).length, 0);
});

test('bénéficiaire (DEM-07) : notification non lue, variante « faite pour vous »', async () => {
  const d = await deposer(agent, { beneficiaire_id: collegue.id });
  const n = (await collegue.get('/api/notifications')).body.data.find((x) => x.objet_id === d.id);
  assert.equal(n.variante, 'beneficiaire');
  assert.equal(n.lue, 0);
  assert.equal(n.texte_fr, `Une demande faite pour vous est enregistrée : ${d.numero}.`);
  assert.equal(n.lien, `/demandes?demande=${d.id}`);
  assert.equal((await collegue.get(n.lien.replace('/demandes?demande=', '/api/demandes/'))).status, 200, 'le lien ouvre une demande que le bénéficiaire lit');
});

test('marquer lue, puis toutes ; une autre personne de l’entité reçoit 404 (API et MCP) ; rien au journal', async () => {
  await deposer(gest, { demandeur_id: agent.id, canal: 'telephone' });
  const n = (await agent.get('/api/notifications?non_lues=1')).body.data[0];
  const journalAvant = getDb().prepare('SELECT COUNT(*) AS n FROM audit_log').get().n;
  assert.equal((await collegue.put(`/api/notifications/${n.id}/lue`, {})).status, 404);
  assert.equal((await collegue.get(`/api/notifications/${n.id}`)).status, 404);
  const viaMcp = await collegue.mcp('tools/call', { name: 'marquer_notification_lue', arguments: { id: n.id } });
  assert.ok(viaMcp.body.result.isError, 'MCP refusé aussi');
  assert.equal(ligne(n.id).lue_le, null, 'pas lue par un autre');
  assert.equal((await agent.put(`/api/notifications/${n.id}/lue`, { pirate: 1 })).status, 400, 'corps refusé');
  const r = await agent.put(`/api/notifications/${n.id}/lue`, {});
  assert.equal(r.status, 200);
  assert.equal(r.body.data.lue, 1);
  const toutes = await agent.put('/api/notifications/lues', {});
  assert.equal(toutes.status, 200);
  assert.equal(toutes.body.data.non_lues, 0);
  assert.equal((await agent.get('/api/notifications?non_lues=1')).body.data.length, 0);
  assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM audit_log').get().n, journalAvant, 'la lecture ne s’inscrit pas au journal');
});

test('plusieurs entités : la liste ne montre que l’entité active ; le compteur donne les autres ; l’autre entité répond 403', async () => {
  const dB = (await gest.post('/api/demandes', { lieu_id: lieu, categorie_id: eclairage.id, description: 'Prise arrachée au rez-de-chaussée.', demandeur_id: multi.id, canal: 'courriel' })).body.data;
  assert.ok(dB, 'demande encodée pour multi dans A');
  const nA = (await multi.get('/api/notifications')).body.data.find((x) => x.objet_id === dB.id);
  assert.equal(nA.entite_id, ea.id);
  assert.equal((await multi.put('/api/auth/entite', { entite_id: eb.id })).status, 200);
  assert.equal((await multi.get('/api/notifications')).body.data.length, 0, 'rien de A dans B');
  assert.deepEqual((await multi.get('/api/notifications/compteur')).body.data, { non_lues: 0, autres_entites: 1 });
  assert.equal((await multi.put(`/api/notifications/${nA.id}/lue`, {})).status, 403);
  assert.equal((await multi.get(`/api/notifications/${nA.id}`)).status, 403);
  assert.equal(ligne(nA.id).lue_le, null);
  const propre = await deposer(multi, {}, (await multi.get('/api/categories?niveau=nature&q=eclairage')).body.data[0], lieuB);
  assert.equal((await multi.get('/api/notifications')).body.data[0].objet_id, propre.id, 'accusé dans B');
  assert.equal((await multi.put('/api/auth/entite', { entite_id: ea.id })).status, 200);
  assert.deepEqual((await multi.get('/api/notifications/compteur')).body.data, { non_lues: 1, autres_entites: 0 }, 'l’accusé de B, envoyé par multi, est lu');
});

test('module éteint : ses notifications ne sont ni listées ni comptées ni lisibles ; elles reviennent au rallumage', async () => {
  const db = getDb();
  const id = db.prepare(`INSERT INTO notifications (user_id, entite_id, evenement, objet, objet_id, numero, lien)
    VALUES (?, ?, 'reservation.confirmee', 'reservation', 1, 'AA-RS-2026-00001', '/reservations?reservation=1')`).run(collegue.id, ea.id).lastInsertRowid;
  db.prepare("INSERT INTO app_settings (key, value) VALUES ('module.salles', '0') ON CONFLICT (key) DO UPDATE SET value = '0'").run();
  const avant = (await collegue.get('/api/notifications/compteur')).body.data.non_lues;
  assert.ok(!(await collegue.get('/api/notifications')).body.data.some((x) => x.id === id));
  assert.equal((await collegue.get(`/api/notifications/${id}`)).body.code, 'MODULE_DISABLED');
  assert.equal((await collegue.put('/api/notifications/lues', {})).status, 200);
  assert.equal(ligne(id).lue_le, null, '« tout lire » ne touche pas un module éteint');
  db.prepare("UPDATE app_settings SET value = '1' WHERE key = 'module.salles'").run();
  assert.equal((await collegue.get('/api/notifications/compteur')).body.data.non_lues, 1);
  const n = (await collegue.get(`/api/notifications/${id}`)).body.data;
  assert.equal(n.texte_fr, 'Votre réservation AA-RS-2026-00001 est confirmée.');
  assert.equal(n.module, 'salles');
  assert.ok(avant >= 0);
  db.prepare('DELETE FROM notifications WHERE id = ?').run(id);
  db.prepare("DELETE FROM app_settings WHERE key = 'module.salles'").run();
});

test('émission : événement inconnu ou à venir refusé ; compte inactif ou sans rôle dans l’entité sauté ; doublons fusionnés', () => {
  const { notifier } = require('../src/services/notifications');
  const db = getDb();
  const base = { entiteId: ea.id, objet: 'demande', objetId: 1, numero: 'AA-DI-2026-00001' };
  assert.throws(() => notifier(db, { ...base, evenement: 'demande.inconnue', destinataires: [] }), /inconnu ou à venir/);
  assert.throws(() => notifier(db, { ...base, evenement: 'controle.echu', destinataires: [] }), /inconnu ou à venir/, 'à venir (module des contrôles)');
  const gestB = db.prepare("SELECT id FROM users WHERE email = 'gest.notb@exemple.test'").get().id;
  const n = notifier(db, { ...base, evenement: 'demande.recue', destinataires: [
    { userId: collegue.id, lien: '/demandes?demande=1' }, { userId: collegue.id, lien: '/demandes?demande=1' }, { userId: gestB, lien: '/demandes?demande=1' }, { userId: null, lien: '/x' }] });
  assert.equal(n, 1, 'une seule : doublon et compte de l’autre entité sautés');
  db.prepare('DELETE FROM notifications WHERE objet_id = 1 AND numero = ?').run(base.numero);
});

test('conservation : lue depuis plus de 90 jours et non lue depuis plus de 365 jours effacées à l’émission suivante', async () => {
  const db = getDb();
  const ins = (lue, cree) => db.prepare(`INSERT INTO notifications (user_id, entite_id, evenement, objet, objet_id, numero, lien, lue_le, created_at)
    VALUES (?, ?, 'demande.recue', 'demande', 1, 'AA-DI-2026-09999', '/demandes', ${lue ? `datetime('now', '-${lue} days')` : 'NULL'}, datetime('now', '-${cree} days'))`)
    .run(collegue.id, ea.id).lastInsertRowid;
  const vieilleLue = ins(91, 100);
  const recenteLue = ins(10, 100);
  const nonLue = ins(null, 200);
  const tresVieille = ins(null, 366);
  await deposer(agent);
  assert.equal(ligne(vieilleLue), undefined);
  assert.ok(ligne(recenteLue));
  assert.ok(ligne(nonLue));
  assert.equal(ligne(tresVieille), undefined);
  db.prepare("DELETE FROM notifications WHERE numero = 'AA-DI-2026-09999'").run();
});

test('MCP : mêmes listes, compteur et lecture que l’API', async () => {
  await deposer(gest, { demandeur_id: agent.id, canal: 'telephone' });
  const api = (await agent.get('/api/notifications')).body;
  const mcp = await tool(agent, 'list_notifications', {});
  assert.deepEqual(mcp.rows.map((n) => n.id), api.data.map((n) => n.id));
  assert.equal(mcp.non_lues, api.meta.non_lues);
  assert.deepEqual(await tool(agent, 'get_compteur_notifications'), (await agent.get('/api/notifications/compteur')).body.data);
  const id = mcp.rows.find((n) => !n.lue).id;
  assert.equal((await tool(agent, 'marquer_notification_lue', { id })).lue, 1);
  assert.equal((await tool(agent, 'marquer_notifications_lues')).non_lues, 0);
  assert.ok((await tool(agent, 'list_evenements_notification')).length >= 16);
});

test('sans session : 401', async () => {
  const r = await fetch(`${srv.base}/api/notifications`);
  assert.equal(r.status, 401);
});
