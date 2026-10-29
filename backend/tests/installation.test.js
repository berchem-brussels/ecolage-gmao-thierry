/**
 * Assistant d'installation avec la langue par défaut et les modules (standard v3.2, section 17.7 ; écart E-08).
 * Chaque fichier de test a sa base neuve : l'installation se joue ici une fois, puis se ferme.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, client, INSTALL } = require('./helpers');
const { getDb } = require('../src/database');

let srv;
before(async () => { srv = await startServer(); });
after(() => srv.stop());

test('avant l’installation, la page publique propose les modules réglables, sans le noyau ni les modules à venir', async () => {
  const r = await client(srv.base).get('/api/settings/public');
  assert.equal(r.body.data.installed, false);
  assert.deepEqual(r.body.data.modules_installables.map((m) => m.code), ['patrimoine']);
  const m = r.body.data.modules_installables[0];
  assert.ok(m.libelle_fr && m.libelle_nl && m.description_fr && m.description_nl);
  assert.equal(m.actif_defaut, true);
});

test('choix refusés : langue inconnue, module du noyau, module à venir, module inconnu', async () => {
  const c = client(srv.base);
  for (const extra of [{ default_lang: 'de' }, { modules: ['demandes'] }, { modules: ['vehicules'] }, { modules: ['inconnu'] }, { modules: 'patrimoine' }]) {
    const r = await c.post('/api/install', { ...INSTALL, ...extra });
    assert.equal(r.status, 400, JSON.stringify(extra));
  }
  assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM users').get().n, 0, 'rien n’est créé');
});

test('installation en néerlandais avec le module Patrimoine éteint : langue de l’instance et de l’administrateur, module noté', async () => {
  const c = client(srv.base);
  const r = await c.post('/api/install', { ...INSTALL, default_lang: 'nl', modules: [] });
  assert.equal(r.status, 201);
  const pub = (await client(srv.base).get('/api/settings/public')).body.data;
  assert.equal(pub.app.default_lang, 'nl');
  assert.equal(pub.installed, true);
  assert.equal(pub.modules_installables, undefined, 'plus de catalogue public après l’installation');
  const me = (await c.get('/api/auth/me')).body.data;
  assert.equal(me.preferred_lang, 'nl');
  const mods = (await c.get('/api/modules')).body.data;
  assert.equal(mods.find((m) => m.code === 'patrimoine').actif, false);
  assert.equal(mods.find((m) => m.code === 'demandes').actif, true);
  const a = JSON.parse(getDb().prepare("SELECT details_json FROM audit_log WHERE action = 'install.first_admin'").get().details_json);
  assert.equal(a.langue, 'nl');
  assert.deepEqual(a.modules, []);
  assert.doesNotMatch(JSON.stringify(a), /password|mot-de-passe/);
  const n = await c.post('/api/auth/login', { email: INSTALL.email, password: INSTALL.password });
  assert.equal(n.status, 200);
  assert.equal((await client(srv.base).post('/api/install', INSTALL)).status, 409, 'installation fermée ensuite');
});
