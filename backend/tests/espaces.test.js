/**
 * Espaces de début et de fin retirés par le serveur sur tous les champs texte, sauf les mots de passe (DV-37, 0.5.0).
 * Défaut relevé à la recette de la 0.4.1 : libellé « Mobilier » enregistré avec une espace finale au CPAS.
 * Même chemin pour les routes (validate, validateQuery, validateParams) et pour les outils MCP (callTool).
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, client, setup, person } = require('./helpers');
const { ajv, nettoyer, SANS_NETTOYAGE } = require('../src/validation');
const S = require('../src/schemas');
const { TOOLS } = require('../src/mcp');
const { getDb } = require('../src/database');

let srv;
let admin;
let resp;
let ea;
const parse = (r) => JSON.parse(r.body.result.content[0].text);
const call = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));

before(async () => {
  srv = await startServer();
  ({ admin, ea } = await setup(srv.base));
  resp = await person(srv.base, admin, 'resp.espaces@exemple.test', ea.id, [[ea.id, 'responsable']]);
});
after(() => srv.stop());

test('nettoyer : chaînes à toute profondeur, tableaux compris ; mots de passe et autres types intacts', () => {
  const v = nettoyer({
    a: '  x  ', b: 3, c: null, d: true, e: { f: '\ty\n', g: ['  z ', 4, { h: ' w ' }] },
    password: '  secret  ', current_password: ' ancien ', new_password: ' nouveau ',
  });
  assert.deepEqual(v, {
    a: 'x', b: 3, c: null, d: true, e: { f: 'y', g: ['z', 4, { h: 'w' }] },
    password: '  secret  ', current_password: ' ancien ', new_password: ' nouveau ',
  });
  assert.equal(nettoyer('  seul  '), 'seul');
  assert.equal(nettoyer(undefined), undefined);
  assert.deepEqual([...SANS_NETTOYAGE].sort(), ['current_password', 'new_password', 'password']);
});

test('tout champ texte obligatoire des schémas refuse une valeur faite seulement d’espaces', () => {
  let n = 0;
  const visiter = (nom, schema) => {
    for (const [cle, p] of Object.entries(schema.properties || {})) {
      const types = [].concat(p.type || []);
      if (!types.includes('string') || !(p.minLength >= 1) || SANS_NETTOYAGE.has(cle)) continue;
      const check = ajv.compile(schema);
      const corps = nettoyer({ [cle]: '   ' });
      assert.equal(check(corps), false, `${nom}.${cle} accepte des espaces`);
      assert.ok(check.errors.some((e) => e.instancePath === `/${cle}`), `${nom}.${cle} : erreur attendue sur le champ`);
      n += 1;
    }
  };
  for (const [nom, schema] of Object.entries(S)) visiter(nom, schema);
  for (const t of TOOLS) visiter(`mcp.${t.name}`, t.schema);
  assert.ok(n >= 40, `${n} champs obligatoires contrôlés`);
});

test('écran : un libellé avec des espaces autour est enregistré sans ; espaces seuls refusés (400)', async () => {
  const r = await resp.post('/api/listes-valeurs', { liste: 'type_lieu', code: ' mobilier ', libelle_fr: ' Mobilier ', libelle_nl: '  Meubilair\t' });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.code, 'mobilier');
  assert.equal(r.body.data.libelle_fr, 'Mobilier');
  assert.equal(r.body.data.libelle_nl, 'Meubilair');
  const row = getDb().prepare('SELECT libelle_fr, libelle_nl FROM listes_valeurs WHERE id = ?').get(r.body.data.id);
  assert.deepEqual({ ...row }, { libelle_fr: 'Mobilier', libelle_nl: 'Meubilair' }, 'valeur en base');

  const vide = await resp.post('/api/listes-valeurs', { liste: 'type_lieu', code: 'vide', libelle_fr: '   ', libelle_nl: 'Leeg' });
  assert.equal(vide.status, 400);
  assert.equal(vide.body.code, 'VALIDATION');

  const maj = await resp.put(`/api/listes-valeurs/${r.body.data.id}`, { libelle_fr: '  Mobilier de bureau  ' });
  assert.equal(maj.status, 200);
  assert.equal(maj.body.data.libelle_fr, 'Mobilier de bureau');
  assert.equal((await resp.put(`/api/listes-valeurs/${r.body.data.id}`, { libelle_nl: ' ' })).status, 400);
});

test('écran : un motif fait seulement d’espaces est refusé', async () => {
  const v = (await resp.post('/api/listes-valeurs', { liste: 'type_lieu', code: 'motif_test', libelle_fr: 'Motif', libelle_nl: 'Reden' })).body.data;
  const r = await resp.del(`/api/listes-valeurs/${v.id}`, { motif: '    ' });
  assert.equal(r.status, 400);
  assert.equal(getDb().prepare('SELECT is_active FROM listes_valeurs WHERE id = ?').get(v.id).is_active, 1, 'valeur toujours active');
});

test('écran : la recherche ignore les espaces autour du texte cherché', async () => {
  const r = await resp.get('/api/listes-valeurs?liste=type_lieu&q=%20%20Mobilier%20');
  assert.equal(r.status, 200);
  assert.ok(r.body.data.some((v) => v.code === 'mobilier'));
});

test('MCP : mêmes règles que l’écran', async () => {
  const ok = await call(resp, 'create_liste_valeur', { liste: 'type_lieu', code: ' atelier_mcp ', libelle_fr: ' Atelier MCP ', libelle_nl: ' Werkplaats MCP ' });
  assert.equal(ok.data.code, 'atelier_mcp');
  assert.equal(ok.data.libelle_fr, 'Atelier MCP');
  assert.equal(ok.data.libelle_nl, 'Werkplaats MCP');
  const ko = await call(resp, 'create_liste_valeur', { liste: 'type_lieu', code: 'vide_mcp', libelle_fr: 'Vide', libelle_nl: '  ' });
  assert.equal(ko.code, 'VALIDATION');
  const prep = await call(resp, 'prepare_deactivate_liste_valeur', { id: ok.data.id, motif: '   ' });
  assert.equal(prep.code, 'VALIDATION', 'motif vide refusé avant le jeton');
});

test('mots de passe : les espaces sont gardés tels quels, à la création, à la connexion et au changement', async () => {
  const mdp = '  espaces autour  ';
  const r = await admin.post('/api/users', { email: ' espace@exemple.test ', first_name: ' Élise ', last_name: ' Espace ', entite_id: ea.id, password_mode: 'manual', password: mdp });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.email, 'espace@exemple.test', 'courriel nettoyé');
  assert.equal(r.body.data.first_name, 'Élise');

  const c = client(srv.base);
  assert.equal((await c.post('/api/auth/login', { email: 'espace@exemple.test', password: mdp.trim() })).status, 401, 'mot de passe rogné refusé');
  assert.equal((await c.post('/api/auth/login', { email: '  espace@exemple.test  ', password: mdp })).status, 200, 'courriel avec espaces accepté, mot de passe exact');

  const nouveau = ' nouveau mot de passe ';
  assert.equal((await c.put('/api/auth/password', { current_password: mdp, new_password: nouveau })).status, 200);
  const d = client(srv.base);
  assert.equal((await d.post('/api/auth/login', { email: 'espace@exemple.test', password: nouveau.trim() })).status, 401);
  assert.equal((await d.post('/api/auth/login', { email: 'espace@exemple.test', password: nouveau })).status, 200);
});
