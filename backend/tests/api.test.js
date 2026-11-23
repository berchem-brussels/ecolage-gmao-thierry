/** Suite de l'API : installation, comptes, entités, rôles par entité, entité active, contrat (version 0.1.0). */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, client, setup, person, INSTALL } = require('./helpers');
const { getDb } = require('../src/database');

let srv;
let admin;
let ea;
let eb;
let agentA;

async function login(email, password) {
  const c = client(srv.base);
  const r = await c.post('/api/auth/login', { email, password });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return c;
}

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  agentA = await person(srv.base, admin, 'a@exemple.test', ea.id);
});
after(() => srv.stop());

test('santé et version sans session, à l’enveloppe commune', async () => {
  const c = client(srv.base);
  for (const u of ['/api/health', '/api/version']) {
    const r = await c.get(u);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.version, require('../package.json').version);
    assert.equal(r.body.meta.envelope, 1);
    assert.equal(r.body.meta.version, r.body.data.version);
  }
});

test('installation : entité, nom du pouvoir local et administrateur créés ; fermée ensuite', async () => {
  const pub = await client(srv.base).get('/api/settings/public');
  assert.equal(pub.body.data.installed, true);
  assert.equal(pub.body.data.app.organisation_fr, INSTALL.organisation_fr);
  assert.equal(pub.body.data.app.organisation_nl, INSTALL.organisation_nl);
  assert.equal(ea.code, 'AA');
  const me = (await admin.get('/api/auth/me')).body.data;
  assert.equal(me.user_role, 'admin');
  assert.deepEqual(me.entites.map((e) => [e.code, e.roles]), [['AA', ['agent']]], 'administrateur : demandeur d’office, aucun rôle métier');
  const r = await client(srv.base).post('/api/install', { ...INSTALL, email: 'x@exemple.test' });
  assert.equal(r.status, 409);
  assert.equal(r.body.code, 'INSTALL_CLOSED');
});

test('installation : code d’entité invalide refusé', async () => {
  const r = await client(srv.base).post('/api/install', { ...INSTALL, entite_code: 'a b' });
  assert.equal(r.status, 400);
});

test('connexion refusée avec un mauvais mot de passe, message codé et traduit', async () => {
  const r = await client(srv.base).post('/api/auth/login', { email: INSTALL.email, password: 'faux' }, { headers: { 'Accept-Language': 'nl' } });
  assert.equal(r.status, 401);
  assert.equal(r.body.code, 'LOGIN_FAILED');
  assert.equal(r.body.message, 'Ongeldige aanmeldgegevens.');
});

test('entités : lecture pour toute personne connectée, gestion par l’administrateur seul', async () => {
  const l = await agentA.get('/api/entites');
  assert.equal(l.status, 200);
  assert.deepEqual(l.body.data.map((e) => e.code), ['AA', 'BB']);
  assert.equal((await agentA.get(`/api/entites/${eb.id}`)).body.data.nom_nl, 'Fictief centrum');
  assert.equal((await agentA.post('/api/entites', { code: 'CC', nom_fr: 'x', nom_nl: 'y' })).status, 403);
  assert.equal((await agentA.put(`/api/entites/${eb.id}`, { nom_fr: 'x' })).status, 403);
  assert.equal((await agentA.del(`/api/entites/${eb.id}`, { motif: 'x' })).status, 403);
});

test('entités : code unique et en majuscules, motif exigé pour désactiver, dernière entité protégée', async () => {
  assert.equal((await admin.post('/api/entites', { code: 'BB', nom_fr: 'x', nom_nl: 'y' })).body.code, 'CODE_DUPLICATE');
  assert.equal((await admin.post('/api/entites', { code: 'cc', nom_fr: 'x', nom_nl: 'y' })).status, 400);
  const cc = (await admin.post('/api/entites', { code: 'CC', nom_fr: 'Régie fictive', nom_nl: 'Fictieve regie' })).body.data;
  assert.equal((await admin.put(`/api/entites/${cc.id}`, { nom_nl: 'Fictieve regie bis' })).body.data.nom_nl, 'Fictieve regie bis');
  assert.equal((await admin.put(`/api/entites/${cc.id}`, { is_active: 0 })).status, 400, 'désactivation par PUT refusée');
  assert.equal((await admin.del(`/api/entites/${cc.id}`, {})).status, 400, 'motif exigé');
  const d = await admin.del(`/api/entites/${cc.id}`, { motif: 'Essai' });
  assert.equal(d.status, 200);
  assert.equal(d.body.data.is_active, 0);
  assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM entites WHERE id = ?').get(cc.id).n, 1, 'la ligne reste');
  assert.equal((await admin.put(`/api/entites/${cc.id}`, { is_active: 1 })).body.data.is_active, 1, 'réactivation');
  await admin.del(`/api/entites/${cc.id}`, { motif: 'Fin de l’essai' });
});

test('compte : entité de rattachement exigée ; rôle de demandeur d’office (ROL-01)', async () => {
  assert.equal((await admin.post('/api/users', { email: 'sans@exemple.test', first_name: 'S', last_name: 'S' })).status, 400);
  assert.equal((await admin.post('/api/users', { email: 'inconnu@exemple.test', first_name: 'S', last_name: 'S', entite_id: 999 })).body.code, 'ENTITE_REQUIRED');
  const r = await admin.post('/api/users', { email: 'r@exemple.test', first_name: 'R', last_name: 'R', entite_id: eb.id });
  assert.equal(r.status, 201);
  assert.ok(r.body.data.generated_password, 'mot de passe généré rendu une fois');
  assert.deepEqual(r.body.data.roles.map((x) => [x.entite_code, x.role]), [['BB', 'agent']]);
  const c = await login('r@exemple.test', r.body.data.generated_password);
  const me = (await c.get('/api/auth/me')).body.data;
  assert.equal(me.must_change_password, 0, 'case décochée par défaut');
  assert.ok(me.csrf_token);
  assert.equal(me.entite_active_id, eb.id);
});

test('rôles par entité : attribution, doublon refusé, rôle d’office protégé, retrait avec motif', async () => {
  const p = await person(srv.base, admin, 'g@exemple.test', ea.id);
  const g = await admin.post('/api/roles-utilisateurs', { user_id: p.id, entite_id: ea.id, role: 'gestionnaire' });
  assert.equal(g.status, 201);
  assert.equal(g.body.data.entite_code, 'AA');
  assert.equal((await admin.post('/api/roles-utilisateurs', { user_id: p.id, entite_id: ea.id, role: 'gestionnaire' })).body.code, 'ROLE_DUPLICATE');
  assert.equal((await admin.post('/api/roles-utilisateurs', { user_id: p.id, entite_id: ea.id, role: 'admin' })).status, 400, 'admin hors catalogue des rôles d’entité');
  const agentRole = (await admin.get(`/api/roles-utilisateurs?user_id=${p.id}&role=agent`)).body.data[0];
  assert.equal((await admin.del(`/api/roles-utilisateurs/${agentRole.id}`, { motif: 'x' })).body.code, 'ROLE_DEFAUT');
  assert.equal((await admin.put(`/api/roles-utilisateurs/${agentRole.id}`, { role: 'lecteur' })).body.code, 'ROLE_DEFAUT');
  const u = await admin.put(`/api/roles-utilisateurs/${g.body.data.id}`, { role: 'responsable' });
  assert.equal(u.body.data.role, 'responsable');
  assert.equal((await admin.del(`/api/roles-utilisateurs/${g.body.data.id}`, {})).status, 400, 'motif exigé');
  const d = await admin.del(`/api/roles-utilisateurs/${g.body.data.id}`, { motif: 'Changement de fonction' });
  assert.equal(d.body.data.is_active, 0);
  assert.equal((await admin.get(`/api/roles-utilisateurs/${g.body.data.id}`)).body.data.motif_retrait, 'Changement de fonction');
  assert.equal((await admin.post('/api/roles-utilisateurs', { user_id: p.id, entite_id: ea.id, role: 'gestionnaire' })).status, 201, 'rôle de nouveau attribuable');
});

test('rôles par entité : réservés à l’administrateur', async () => {
  assert.equal((await agentA.get('/api/roles-utilisateurs')).status, 403);
  assert.equal((await agentA.post('/api/roles-utilisateurs', { user_id: agentA.id, entite_id: ea.id, role: 'responsable' })).status, 403);
});

test('rôle dans une entité désactivée ou pour un compte désactivé refusé', async () => {
  const dd = (await admin.post('/api/entites', { code: 'DD', nom_fr: 'Temporaire', nom_nl: 'Tijdelijk' })).body.data;
  await admin.del(`/api/entites/${dd.id}`, { motif: 'Essai' });
  assert.equal((await admin.post('/api/roles-utilisateurs', { user_id: agentA.id, entite_id: dd.id, role: 'lecteur' })).body.code, 'ENTITE_INACTIVE');
  const z = await admin.post('/api/users', { email: 'z@exemple.test', first_name: 'Z', last_name: 'Z', entite_id: ea.id });
  await admin.del(`/api/users/${z.body.data.id}`);
  assert.equal((await admin.post('/api/roles-utilisateurs', { user_id: z.body.data.id, entite_id: ea.id, role: 'lecteur' })).body.code, 'USER_INACTIVE');
});

test('entité active : changement vers une entité où l’on a un rôle ; refus ailleurs (ROL-03)', async () => {
  const m = await person(srv.base, admin, 'multi@exemple.test', ea.id, [[ea.id, 'gestionnaire'], [eb.id, 'gestionnaire']]);
  let me = (await m.get('/api/auth/me')).body.data;
  assert.equal(me.entite_active_id, ea.id, 'entité de rattachement à l’ouverture');
  assert.deepEqual(me.entites.map((e) => [e.code, e.roles]), [['AA', ['agent', 'gestionnaire']], ['BB', ['gestionnaire']]]);
  const s = await m.put('/api/auth/entite', { entite_id: eb.id });
  assert.equal(s.status, 200);
  assert.equal(s.body.data.entite_active_id, eb.id);
  me = (await m.get('/api/auth/me')).body.data;
  assert.equal(me.entite_active_id, eb.id, 'gardée sur la session');
  assert.equal((await agentA.put('/api/auth/entite', { entite_id: eb.id })).status, 403, 'aucun rôle dans BB');
  assert.equal((await agentA.put('/api/auth/entite', { entite_id: 999 })).status, 403);
});

test('entité active perdue quand son dernier rôle est retiré', async () => {
  const p = await person(srv.base, admin, 'perte@exemple.test', ea.id, [[eb.id, 'lecteur']]);
  await p.put('/api/auth/entite', { entite_id: eb.id });
  const role = (await admin.get(`/api/roles-utilisateurs?user_id=${p.id}&entite_id=${eb.id}`)).body.data[0];
  await admin.del(`/api/roles-utilisateurs/${role.id}`, { motif: 'Fin' });
  const me = (await p.get('/api/auth/me')).body.data;
  assert.equal(me.entite_active_id, null);
  assert.deepEqual(me.entites.map((e) => e.code), ['AA']);
});

test('changement d’entité de rattachement : rôle de demandeur ajouté dans la nouvelle', async () => {
  const p = await person(srv.base, admin, 'mute@exemple.test', ea.id);
  const u = await admin.put(`/api/users/${p.id}`, { entite_id: eb.id });
  assert.equal(u.status, 200);
  assert.deepEqual(u.body.data.roles.map((x) => `${x.entite_code}:${x.role}`).sort(), ['AA:agent', 'BB:agent']);
});

test('catalogue des rôles : libellés FR et NL, portée, aligné sur la contrainte de la base', async () => {
  const r = await agentA.get('/api/roles');
  assert.equal(r.status, 200);
  const codes = r.body.data.map((x) => x.code);
  assert.equal(codes.length, 11);
  for (const x of r.body.data) { assert.ok(x.label_fr && x.label_nl && x.description_fr && x.description_nl, x.code); }
  assert.equal((await agentA.get('/api/roles/gestionnaire')).body.data.label_nl, 'Technisch beheerder');
  assert.equal((await agentA.get('/api/roles/inconnu')).status, 404);
  const ddl = getDb().prepare("SELECT sql FROM sqlite_master WHERE name = 'user_roles'").get().sql;
  const inCheck = ddl.match(/role IN \(([^)]+)\)/)[1].split(',').map((s) => s.trim().replace(/'/g, ''));
  assert.deepEqual(inCheck.sort(), r.body.data.filter((x) => x.portee === 'entite').map((x) => x.code).sort());
});

test('comptes : un agent ne liste pas, ne crée pas, ne modifie pas', async () => {
  assert.equal((await agentA.get('/api/users')).status, 403);
  assert.equal((await agentA.post('/api/users', { email: 'y@exemple.test', first_name: 'Y', last_name: 'Y', entite_id: ea.id })).status, 403);
  assert.equal((await agentA.put('/api/users/1', { user_role: 'agent' })).status, 403);
  assert.equal((await agentA.get('/api/users/1')).status, 403, 'fiche d’autrui');
  assert.equal((await agentA.get(`/api/users/${agentA.id}`)).status, 200, 'sa propre fiche');
});

test('liste des comptes : rôles par entité et filtre par entité', async () => {
  const r = await admin.get(`/api/users?entite_id=${eb.id}&limit=200`);
  assert.equal(r.status, 200);
  assert.ok(r.body.data.every((u) => u.entite_id === eb.id));
  assert.ok(r.body.data.every((u) => Array.isArray(u.roles)));
});

test('le dernier administrateur ne peut être ni rétrogradé ni désactivé (ROL-06)', async () => {
  const me = (await admin.get('/api/auth/me')).body.data;
  const r1 = await admin.put(`/api/users/${me.id}`, { user_role: 'agent' });
  assert.equal(r1.status, 409);
  assert.equal(r1.body.code, 'LAST_ADMIN');
  assert.equal((await admin.del(`/api/users/${me.id}`)).status, 409);
});

test('désactiver un compte ferme ses sessions', async () => {
  const c = await person(srv.base, admin, 'c@exemple.test', ea.id);
  assert.equal((await c.get('/api/entites')).status, 200);
  assert.equal((await admin.del(`/api/users/${c.id}`)).status, 200);
  assert.equal((await c.get('/api/entites')).status, 401);
});

test('déconnexion : le jeton rejoué est refusé', async () => {
  const r = await admin.post('/api/users', { email: 'd@exemple.test', first_name: 'D', last_name: 'D', entite_id: ea.id });
  const c = client(srv.base);
  const l = await c.post('/api/auth/login', { email: 'd@exemple.test', password: r.body.data.generated_password });
  assert.equal(l.body.meta.envelope, 1);
  assert.ok(Array.isArray(l.body.data.user.entites));
  const token = l.body.data.token;
  assert.equal((await c.post('/api/auth/logout', {})).status, 200);
  assert.equal((await client(srv.base).get('/api/entites', { bearer: token })).status, 401);
});

test('création sur le modèle Microsoft 365 : mot de passe encodé et changement imposé coché', async () => {
  const r = await admin.post('/api/users', { email: 'm@exemple.test', first_name: 'M', last_name: 'M', entite_id: ea.id, password_mode: 'manual', password: 'encode-par-le-gestionnaire', must_change_password: true });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.generated_password, undefined, 'aucun mot de passe rendu quand il est encodé');
  const c = await login('m@exemple.test', 'encode-par-le-gestionnaire');
  assert.equal((await c.get('/api/auth/me')).body.data.must_change_password, 1);
  const sans = await admin.post('/api/users', { email: 'n@exemple.test', first_name: 'N', last_name: 'N', entite_id: ea.id, password_mode: 'manual' });
  assert.equal(sans.status, 400, 'mot de passe exigé en mode encodé');
  const court = await admin.post('/api/users', { email: 'o@exemple.test', first_name: 'O', last_name: 'O', entite_id: ea.id, password_mode: 'manual', password: 'court' });
  assert.equal(court.status, 400, '8 caractères au moins');
  const audit = getDb().prepare("SELECT details_json FROM audit_log WHERE action = 'user.create'").all().map((x) => x.details_json).join(' ');
  assert.doesNotMatch(audit, /encode-par-le-gestionnaire|password/);
});

test('changement de mot de passe : ancien mot de passe exigé, drapeau levé', async () => {
  const r = await admin.post('/api/users', { email: 'e@exemple.test', first_name: 'E', last_name: 'E', entite_id: ea.id, must_change_password: true });
  const c = await login('e@exemple.test', r.body.data.generated_password);
  assert.equal((await c.get('/api/auth/me')).body.data.must_change_password, 1);
  assert.equal((await c.put('/api/auth/password', { current_password: 'faux', new_password: 'nouveau-mot-de-passe' })).status, 400);
  assert.equal((await c.put('/api/auth/password', { current_password: r.body.data.generated_password, new_password: 'nouveau-mot-de-passe' })).status, 200);
  assert.equal((await c.get('/api/auth/me')).body.data.must_change_password, 0);
});

test('préférences enregistrées en base', async () => {
  const r = await agentA.put('/api/auth/preferences', { preferred_lang: 'nl', ui_mode: 'complet', theme: 'sombre' });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.preferred_lang, 'nl');
  assert.equal((await agentA.put('/api/auth/preferences', { user_role: 'admin' })).status, 400);
});

test('journal d’audit : entités, rôles et changement d’entité active inscrits', () => {
  const actions = new Set(getDb().prepare('SELECT action FROM audit_log').all().map((x) => x.action));
  for (const a of ['install.first_admin', 'entite.create', 'entite.update', 'entite.deactivate', 'role.grant', 'role.update', 'role.retrait', 'session.entite', 'user.create', 'user.update', 'login.success', 'login.failure']) {
    assert.ok(actions.has(a), a);
  }
});

test('champ inconnu ou rôle dans le corps refusé (mass assignment)', async () => {
  assert.equal((await admin.post('/api/entites', { code: 'EE', nom_fr: 'x', nom_nl: 'y', created_by: 1 })).status, 400);
  assert.equal((await agentA.put('/api/auth/entite', { entite_id: ea.id, role: 'responsable' })).status, 400);
  assert.equal((await admin.put(`/api/roles-utilisateurs/1`, { role: 'lecteur', user_id: 2 })).status, 400);
});

test('pagination bornée à 200 ; identifiant non numérique refusé', async () => {
  assert.equal((await agentA.get('/api/entites?limit=500')).status, 400);
  assert.equal((await agentA.get('/api/entites?limit=abc')).status, 400);
  assert.equal((await agentA.get('/api/entites/abc')).status, 400);
});

test('contrat OpenAPI : réservé aux personnes connectées, toutes les routes présentes', async () => {
  assert.equal((await client(srv.base).get('/api/openapi.json')).status, 401);
  const r = await agentA.get('/api/openapi.json');
  assert.equal(r.status, 200);
  assert.equal(r.body.openapi, '3.1.0');
  for (const p of ['/api/entites', '/api/entites/{id}', '/api/entites/{id}/membres', '/api/roles', '/api/roles/{code}',
    '/api/roles-utilisateurs', '/api/roles-utilisateurs/{id}', '/api/users', '/api/users/{id}', '/api/auth/entite']) assert.ok(r.body.paths[p], p);
  assert.ok(r.body.paths['/api/entites'].post.requestBody);
  assert.equal(r.body.paths['/api/roles/{code}'].get.parameters[0].schema.type, 'string');
});

test('route inconnue sous /api : 404 codé', async () => {
  const r = await agentA.get('/api/inexistant');
  assert.equal(r.status, 404);
  assert.equal(r.body.code, 'NOT_FOUND');
});
