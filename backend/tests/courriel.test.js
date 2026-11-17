/**
 * Courriel (0.17.0, étape 13, point 2 ; NOT-02, NOT-04, NOT-06 ; standard section 7, « Courriel » et « Règles communes ») :
 * réglages réservés à l'administrateur, mot de passe chiffré jamais rendu ; mode test livré, où rien ne part et tout est
 * retenu, lisible par l'administrateur ; envoi réel à un serveur SMTP factice qui répond comme un relais réel (succès,
 * refus du compte, refus du destinataire) ; file avec trois essais ; conservation ; sécurité de nodemailer ; MCP.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { getDb } = require('../src/database');
const { demarrerSmtp } = require('./smtp-factice');

let srv;
let admin;
let ea;
let gest;
let smtp;

const parse = (r) => JSON.parse(r.body.result.content[0].text);
const outil = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));
const ligne = (id) => getDb().prepare('SELECT * FROM courriels WHERE id = ?').get(id);
const attendre = (ms) => new Promise((r) => { setTimeout(r, ms); });
const smtpReglages = (extra = {}) => ({ mode: 'smtp', host: '127.0.0.1', port: smtp.port, securite: 'aucune', user: 'gmao', password: 'mot de passe smtp', from: 'gmao@exemple.test', from_name: 'GMAO fictive', ...extra });

before(async () => {
  srv = await startServer();
  ({ admin, ea } = await setup(srv.base));
  gest = await person(srv.base, admin, 'gest.mail@exemple.test', ea.id, [[ea.id, 'gestionnaire'], [ea.id, 'responsable']]);
  smtp = await demarrerSmtp({ compte: { user: 'gmao', pass: 'mot de passe smtp' } });
});
after(async () => { await smtp.stop(); await srv.stop(); });

test('livré en mode test, rien de réglé ; réservé à l’administrateur (API et MCP)', async () => {
  const r = await admin.get('/api/settings/courriel');
  assert.equal(r.status, 200);
  assert.equal(r.body.data.mode, 'test');
  assert.equal(r.body.data.password_set, false);
  assert.equal(r.body.data.port, 587);
  assert.equal(r.body.data.securite, 'starttls');
  for (const [m, u, b] of [['get', '/api/settings/courriel'], ['put', '/api/settings/courriel', { mode: 'test' }], ['post', '/api/settings/courriel/essai', {}], ['get', '/api/courriels']]) {
    assert.equal((await gest[m](u, b)).status, 403, `${m} ${u}`);
  }
  assert.equal((await outil(gest, 'get_mail_settings')).code, 'FORBIDDEN');
  assert.equal((await outil(gest, 'send_test_mail')).code, 'FORBIDDEN');
});

test('réglages : mode smtp sans serveur ni expéditeur refusé ; valeurs contrôlées ; mot de passe chiffré, jamais rendu, masqué au journal', async () => {
  assert.equal((await admin.put('/api/settings/courriel', { mode: 'smtp' })).body.code, 'SMTP_INCOMPLET');
  assert.equal((await admin.put('/api/settings/courriel', { host: 'smtp exemple' })).status, 400, 'serveur avec espace');
  assert.equal((await admin.put('/api/settings/courriel', { from_name: 'GMAO <pirate@x>' })).status, 400, 'nom avec chevrons');
  assert.equal((await admin.put('/api/settings/courriel', { from: 'pas-une-adresse' })).status, 400);
  assert.equal((await admin.put('/api/settings/courriel', { port: 70000 })).status, 400);
  assert.equal((await admin.put('/api/settings/courriel', { public_url: 'http://gmao.exemple.test' })).status, 400, 'https seulement');
  const r = await admin.put('/api/settings/courriel', { host: 'smtp.exemple.test', port: 25, securite: 'aucune', user: 'gmao', password: 'secret smtp', from: 'gmao@exemple.test', public_url: 'https://gmao.exemple.test/' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.mode, 'test', 'le mode ne change pas sans le demander');
  assert.equal(r.body.data.password_set, true);
  assert.equal(r.body.data.adresse_liens, 'https://gmao.exemple.test');
  assert.ok(!JSON.stringify(r.body).includes('secret smtp'), 'mot de passe jamais rendu');
  const brut = getDb().prepare("SELECT value FROM app_settings WHERE key = 'mail.password'").get().value;
  assert.ok(brut.startsWith('enc:') && !brut.includes('secret'), 'chiffré en base');
  const j = JSON.parse(getDb().prepare("SELECT details_json FROM audit_log WHERE action = 'settings.courriel' ORDER BY id DESC").get().details_json);
  assert.equal(j.password, '***');
  assert.ok(r.body.data.enregistre.le);
});

test('mode test : l’essai est retenu, rien ne part ; l’administrateur le lit ; journal', async () => {
  await admin.put('/api/settings/courriel', { ...smtpReglages(), mode: 'test' });
  const avant = smtp.recus.length;
  const r = await admin.post('/api/settings/courriel/essai', {});
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.mode, 'test');
  assert.equal(r.body.data.resultat, 'retenu');
  assert.equal(r.body.data.destinataire, 'admin@exemple.test');
  await attendre(100);
  assert.equal(smtp.recus.length, avant, 'rien envoyé');
  const c = (await admin.get(`/api/courriels/${r.body.data.id}`)).body.data;
  assert.equal(c.etat, 'test');
  assert.equal(c.evenement, 'essai');
  assert.match(c.sujet, /^Courriel d'essai de /);
  assert.match(c.corps, /peut envoyer des courriels/);
  const l = await admin.get('/api/courriels?etat=test');
  assert.equal(l.body.meta.mode, 'test');
  assert.ok(l.body.data.some((x) => x.id === c.id));
  assert.equal(l.body.data[0].corps, undefined, 'la liste ne rend pas le texte');
  assert.ok(getDb().prepare("SELECT 1 FROM audit_log WHERE action = 'courriel.essai' AND entity_id = ?").get(c.id));
});

test('mode smtp : essai envoyé au serveur (expéditeur, destinataire, sujet) ; compte refusé → échec EAUTH, rendu tel quel', async () => {
  assert.equal((await admin.put('/api/settings/courriel', smtpReglages())).status, 200);
  const r = await admin.post('/api/settings/courriel/essai', { destinataire: 'essai@exemple.test' });
  assert.equal(r.body.data.resultat, 'envoye', JSON.stringify(r.body));
  const m = smtp.recus.at(-1);
  assert.equal(m.from, '<gmao@exemple.test>');
  assert.deepEqual(m.to, ['<essai@exemple.test>']);
  assert.match(m.data, /^From: GMAO fictive <gmao@exemple\.test>/m);
  assert.match(m.data, /^Subject: Courriel d'essai de /m);
  assert.match(m.data, /Content-Type: text\/plain/);
  assert.equal(ligne(r.body.data.id).etat, 'envoye');
  await admin.put('/api/settings/courriel', { password: 'mauvais' });
  const k = await admin.post('/api/settings/courriel/essai', { destinataire: 'essai@exemple.test' });
  assert.equal(k.body.data.resultat, 'echec');
  assert.equal(k.body.data.erreur, 'EAUTH');
  assert.equal(ligne(k.body.data.id).etat, 'echec');
  assert.equal(ligne(k.body.data.id).erreur, 'EAUTH');
  await admin.put('/api/settings/courriel', { password: 'mot de passe smtp' });
});

test('file : mise en file dans la transaction, envoi après ; destinataire refusé : trois essais espacés, puis échec gardé', async () => {
  const courriel = require('../src/services/courriel');
  const db = getDb();
  const base = { userId: null, entiteId: ea.id, langue: 'fr', evenement: 'demande.recue', objet: 'demande', objetId: 1, numero: 'AA-DI-2026-00001', sujet: 'Demande AA-DI-2026-00001', corps: 'Votre demande AA-DI-2026-00001 est reçue.' };
  const id = db.transaction(() => courriel.mettreEnFile(db, { ...base, destinataire: 'agent@exemple.test' }))();
  assert.equal(ligne(id).etat, 'en_attente');
  await attendre(300);
  assert.equal(ligne(id).etat, 'envoye', 'parti après la transaction');
  assert.ok(smtp.recus.some((m) => m.to.includes('<agent@exemple.test>')));
  const refuse = db.transaction(() => courriel.mettreEnFile(db, { ...base, destinataire: 'refus@exemple.test' }))();
  await attendre(300);
  let l = ligne(refuse);
  assert.equal(l.etat, 'en_attente');
  assert.equal(l.essais, 1);
  assert.ok(l.erreur, 'code de l’erreur gardé');
  assert.ok(!/Recipient/.test(l.erreur), 'jamais le message du serveur');
  assert.ok(db.prepare("SELECT 1 FROM courriels WHERE id = ? AND prochain_essai > datetime('now', '+4 minutes')").get(refuse), 'deuxième essai dans 5 minutes');
  for (let i = 0; i < 2; i += 1) {
    db.prepare("UPDATE courriels SET prochain_essai = datetime('now', '-1 minute') WHERE id = ?").run(refuse);
    await courriel.traiter();
  }
  l = ligne(refuse);
  assert.equal(l.etat, 'echec');
  assert.equal(l.essais, 3);
  assert.equal((await admin.get('/api/settings/courriel')).body.data.file.echec >= 1, true);
});

test('mode test : un courriel mis en file est retenu et ne part jamais, même au traitement de la file', async () => {
  const courriel = require('../src/services/courriel');
  await admin.put('/api/settings/courriel', { mode: 'test' });
  const db = getDb();
  const avant = smtp.recus.length;
  const id = db.transaction(() => courriel.mettreEnFile(db, { entiteId: ea.id, destinataire: 'agent@exemple.test', langue: 'nl', evenement: 'demande.recue', sujet: 'Aanvraag', corps: 'Tekst' }))();
  await courriel.traiter();
  await attendre(100);
  assert.equal(ligne(id).etat, 'test');
  assert.equal(ligne(id).mode, 'test');
  assert.equal(smtp.recus.length, avant);
});

test('sécurité de nodemailer : ni fichier ni adresse web depuis un message, certificat vérifié, délais bornés', async () => {
  const nodemailer = require('nodemailer');
  const vraie = nodemailer.createTransport;
  let options = null;
  nodemailer.createTransport = (o) => { options = o; return vraie(o); };
  try {
    await admin.put('/api/settings/courriel', smtpReglages());
    await admin.post('/api/settings/courriel/essai', { destinataire: 'essai@exemple.test' });
  } finally { nodemailer.createTransport = vraie; }
  assert.equal(options.disableFileAccess, true);
  assert.equal(options.disableUrlAccess, true);
  assert.equal(options.tls.rejectUnauthorized, true);
  assert.ok(options.connectionTimeout && options.socketTimeout);
  await admin.put('/api/settings/courriel', { mode: 'test' });
});

test('conservation : courriels de plus de 90 jours effacés, sauf ceux qui attendent encore', async () => {
  const courriel = require('../src/services/courriel');
  const db = getDb();
  const ins = (etat, mode, jours) => db.prepare(`INSERT INTO courriels (destinataire, evenement, sujet, corps, mode, etat, created_at)
    VALUES ('vieux@exemple.test', 'essai', 'S', 'C', ?, ?, datetime('now', ?))`).run(mode, etat, `-${jours} days`).lastInsertRowid;
  const vieux = ins('envoye', 'smtp', 91);
  const recent = ins('envoye', 'smtp', 30);
  const attend = ins('en_attente', 'smtp', 120);
  db.transaction(() => courriel.mettreEnFile(db, { destinataire: 'agent@exemple.test', evenement: 'essai', sujet: 'S', corps: 'C' }))();
  assert.equal(ligne(vieux), undefined);
  assert.ok(ligne(recent));
  assert.ok(ligne(attend));
  db.prepare('DELETE FROM courriels WHERE id = ?').run(attend);
});

test('MCP : essai rendu (outil asynchrone), journal lu, réglage en deux appels', async () => {
  await admin.put('/api/settings/courriel', smtpReglages());
  const e = (await outil(admin, 'send_test_mail', { destinataire: 'mcp@exemple.test' })).data;
  assert.equal(e.resultat, 'envoye');
  assert.ok(smtp.recus.some((m) => m.to.includes('<mcp@exemple.test>')));
  const l = (await outil(admin, 'list_courriels', { etat: 'envoye' })).data;
  assert.ok(l.rows.some((c) => c.id === e.id));
  assert.match((await outil(admin, 'get_courriel', { id: e.id })).data.corps, /peut envoyer/);
  const prep = (await outil(admin, 'prepare_update_mail_settings', { mode: 'test', password: 'nouveau secret' })).data;
  assert.ok(prep.confirmation_token);
  assert.doesNotMatch(JSON.stringify(prep), /nouveau secret/, 'mot de passe masqué dans le résumé');
  assert.equal((await admin.get('/api/settings/courriel')).body.data.mode, 'smtp', 'rien changé avant la confirmation');
  const c = (await outil(admin, 'confirm_update_mail_settings', { confirmation_token: prep.confirmation_token })).data;
  assert.equal(c.mode, 'test');
});
