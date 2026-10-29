/**
 * Notes de version à la première connexion après une mise à jour (standard v3.2, sections 13.1 et 17.8 ; écart E-07).
 * Compte existant : note rendue par le profil jusqu'au « lu » ; compte nouveau : aucune note en cours (décision du
 * 22/10/2026) ; lignes filtrées selon le public ; toutes les notes relisibles ; FR et NL ; MCP.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { startServer, setup, person, client, INSTALL } = require('./helpers');
const { getDb } = require('../src/database');
const { VERSION } = require('../src/config');
const notes = require('../src/services/notes-version');

let srv;
let admin;
let ea;
let agent;
let resp;
const parse = (r) => JSON.parse(r.body.result.content[0].text);
const tool = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));
// Note la plus récente qui a une ligne pour tout le monde : la plus récente que lit un demandeur (la 0.4.1 n'en a pas).
const CATALOGUE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'notes-version.json'), 'utf8')).notes;
const DERNIERE_TOUS = CATALOGUE.find((n) => n.lignes.some((l) => l.public === 'tous')).version;
const relogin = async (email, password) => {
  const c = client(srv.base);
  const r = await c.post('/api/auth/login', { email, password });
  return { c, user: r.body.data.user };
};

before(async () => {
  srv = await startServer();
  ({ admin, ea } = await setup(srv.base));
  agent = await person(srv.base, admin, 'n.agent@exemple.test', ea.id);
  resp = await person(srv.base, admin, 'n.resp@exemple.test', ea.id, [[ea.id, 'responsable']]);
});
after(() => srv.stop());

test('catalogue des notes : version installée en tête, lignes FR et NL non vides, publics connus', () => {
  const brut = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'notes-version.json'), 'utf8')).notes;
  assert.equal(brut[0].version, VERSION, 'la note de la version installée existe');
  const perms = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'roles.json'), 'utf8')).roles.flatMap((r) => r.permissions));
  for (const n of brut) {
    assert.ok(n.lignes.length >= 1 && n.lignes.length <= 5, `${n.version} : une à cinq lignes`);
    for (const l of n.lignes) {
      assert.ok(l.fr.trim() && l.nl.trim(), n.version);
      assert.ok(l.public === 'tous' || l.public === 'admin' || perms.has(l.public), `${n.version} : public ${l.public}`);
    }
  }
  assert.ok(notes.comparer('0.10.0', '0.9.1') > 0);
  assert.equal(notes.comparer('0.3.0', '0.3.0'), 0);
});

test('compte nouveau : aucune note de la version en cours à sa première connexion', async () => {
  const me = (await agent.get('/api/auth/me')).body.data;
  assert.deepEqual(me.nouveautes, []);
  assert.equal(getDb().prepare('SELECT version_vue FROM users WHERE id = ?').get(agent.id).version_vue, VERSION);
});

test('compte qui a connu la 0.3.0 : notes de la 0.7.0, de la 0.5.2, de la 0.5.1, de la 0.5.0, de la 0.4.0 et de la 0.3.1, la plus récente en tête', async () => {
  getDb().prepare("UPDATE users SET version_vue = '0.3.0' WHERE id = ?").run(agent.id);
  const a = (await agent.get('/api/auth/me')).body.data.nouveautes;
  assert.deepEqual(a.map((n) => n.version), ['0.7.1', '0.7.0', '0.5.2', '0.5.1', '0.5.0', '0.4.0', '0.3.1']);
  assert.match(a[6].lignes[0].fr, /Android/);
  await agent.put('/api/auth/nouveautes', {});
});

test('note de la 0.4.0 : le demandeur lit la ligne sur les délais ; le responsable, en plus, catégories et délais', async () => {
  getDb().prepare("UPDATE users SET version_vue = '0.3.1' WHERE id IN (?, ?)").run(agent.id, resp.id);
  const a = (await agent.get('/api/auth/me')).body.data.nouveautes;
  assert.deepEqual(a.map((n) => n.version), ['0.7.1', '0.7.0', '0.5.2', '0.5.1', '0.5.0', '0.4.0']);
  assert.equal(a[5].lignes.length, 1);
  assert.match(a[5].lignes[0].fr, /délai/);
  const r = (await resp.get('/api/auth/me')).body.data.nouveautes;
  const r040 = r.find((n) => n.version === '0.4.0');
  assert.equal(r040.lignes.length, 3);
  assert.ok(r040.lignes.some((l) => /Catégories et délais/.test(l.fr) && /Categorieën en termijnen/.test(l.nl)));
  await agent.put('/api/auth/nouveautes', {});
  await resp.put('/api/auth/nouveautes', {});
});

test('note de la 0.4.1 : rien pour le demandeur ; mention et simulateur pour le responsable ; journal pour l’administrateur', async () => {
  getDb().prepare("UPDATE users SET version_vue = '0.4.0' WHERE id IN (?, ?)").run(agent.id, resp.id);
  getDb().prepare("UPDATE users SET version_vue = '0.4.0' WHERE email = ?").run(INSTALL.email);
  assert.deepEqual((await agent.get('/api/auth/me')).body.data.nouveautes.map((n) => n.version), ['0.7.1', '0.7.0', '0.5.2', '0.5.1', '0.5.0'], 'aucune ligne de la 0.4.1 pour le demandeur');
  const r = (await resp.get('/api/auth/me')).body.data.nouveautes;
  assert.deepEqual(r.map((n) => n.version), ['0.7.1', '0.7.0', '0.5.2', '0.5.1', '0.5.0', '0.4.1']);
  assert.equal(r[5].lignes.length, 2);
  assert.ok(r[5].lignes.some((l) => /Valeur livrée/.test(l.fr) && /Geleverde waarde/.test(l.nl)));
  assert.ok(r[5].lignes.some((l) => /simulateur/.test(l.fr) && /Android/.test(l.fr)));
  const a = (await admin.get('/api/auth/me')).body.data.nouveautes;
  assert.ok(a.find((n) => n.version === '0.4.1').lignes.some((l) => /journal d'audit/.test(l.fr) && /oude en de nieuwe waarde/.test(l.nl)));
  await agent.put('/api/auth/nouveautes', {});
  await resp.put('/api/auth/nouveautes', {});
  await admin.put('/api/auth/nouveautes', {});
});

test('note de la 0.5.0 : dépôt et suivi pour tous ; demandes de l’entité et numérotation pour le responsable', async () => {
  getDb().prepare("UPDATE users SET version_vue = '0.4.1' WHERE id IN (?, ?)").run(agent.id, resp.id);
  const a = (await agent.get('/api/auth/me')).body.data.nouveautes;
  assert.deepEqual(a.map((n) => n.version), ['0.7.1', '0.7.0', '0.5.2', '0.5.1', '0.5.0']);
  assert.equal(a[4].lignes.length, 3, 'demandeur : lignes « tous »');
  assert.ok(a[4].lignes.some((l) => /Nouvelle demande/.test(l.fr) && /Nieuwe aanvraag/.test(l.nl)));
  const r = (await resp.get('/api/auth/me')).body.data.nouveautes;
  assert.equal(r[4].lignes.length, 5, 'responsable : plus les demandes de l’entité et la numérotation');
  assert.ok(r[4].lignes.some((l) => /numérotation/.test(l.fr) && /nummering/.test(l.nl)));
  await agent.put('/api/auth/nouveautes', {});
  await resp.put('/api/auth/nouveautes', {});
});

test('compte qui a connu la version précédente : la note s’affiche, filtrée selon son public, jusqu’au « lu »', async () => {
  getDb().prepare("UPDATE users SET version_vue = '0.2.0' WHERE id IN (?, ?)").run(agent.id, resp.id);
  const a = (await agent.get('/api/auth/me')).body.data.nouveautes;
  assert.equal(a[0].version, DERNIERE_TOUS, 'la plus récente qui le concerne en tête');
  assert.ok(a.every((n) => notes.comparer(n.version, '0.2.0') > 0 && notes.comparer(n.version, VERSION) <= 0), 'notes après la dernière lue, jusqu’à la version installée');
  const n030 = (l) => l.find((n) => n.version === '0.3.0');
  assert.equal(n030(a).lignes.length, 2, 'demandeur : lignes « tous » seulement');
  const r = (await resp.get('/api/auth/me')).body.data.nouveautes;
  assert.equal(n030(r).lignes.length, 3, 'responsable : plus la ligne de ses réglages');
  assert.ok(n030(r).lignes.some((l) => /Réglages de l'entité/.test(l.fr) && /Instellingen van de entiteit/.test(l.nl)));
  const lu = await agent.put('/api/auth/nouveautes', {});
  assert.equal(lu.status, 200);
  assert.deepEqual(lu.body.data.nouveautes, []);
  assert.deepEqual((await agent.get('/api/auth/me')).body.data.nouveautes, [], 'une seule fois');
  assert.ok(getDb().prepare("SELECT 1 FROM audit_log WHERE action = 'nouveautes.lues' AND user_id = ?").get(agent.id));
  const n = getDb().prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'nouveautes.lues'").get().n;
  await agent.put('/api/auth/nouveautes', {});
  assert.equal(getDb().prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'nouveautes.lues'").get().n, n, 'déjà lu : rien de plus');
});

test('la note est aussi rendue à la connexion, et l’administrateur voit ses lignes', async () => {
  getDb().prepare("UPDATE users SET version_vue = '0.2.0' WHERE email = ?").run(INSTALL.email);
  const { user } = await relogin(INSTALL.email, INSTALL.password);
  const lignes = user.nouveautes.flatMap((n) => n.lignes);
  assert.ok(lignes.some((l) => /Paramètres/.test(l.fr)));
  assert.ok(!lignes.some((l) => /Réglages de l'entité/.test(l.fr)), 'sans rôle de responsable : pas la ligne du responsable');
});

test('compte sans version notée : aucune note (jamais d’erreur)', async () => {
  getDb().prepare('UPDATE users SET version_vue = NULL WHERE id = ?').run(resp.id);
  assert.deepEqual((await resp.get('/api/auth/me')).body.data.nouveautes, []);
});

test('toutes les notes relisibles, de la plus récente à la plus ancienne ; une version inconnue : 404', async () => {
  const l = (await agent.get('/api/notes-version')).body.data;
  assert.equal(l[0].version, DERNIERE_TOUS);
  // Depuis la 0.7.2 (note réservée à l'administrateur), seul l'administrateur lit à coup sûr la note de la version installée.
  assert.equal((await admin.get('/api/notes-version')).body.data[0].version, VERSION, 'l’administrateur lit la note de la version installée');
  assert.ok(l.length >= 3);
  assert.ok(l.every((n) => n.lignes.every((x) => x.fr && x.nl && !('public' in x))));
  assert.equal((await agent.get('/api/notes-version/0.1.0')).status, 200);
  assert.equal((await agent.get('/api/notes-version/9.9.9')).status, 404);
  assert.equal((await agent.get('/api/notes-version/abc')).status, 400);
});

test('notes par MCP : lecture et « lu »', async () => {
  getDb().prepare("UPDATE users SET version_vue = '0.2.0' WHERE id = ?").run(agent.id);
  assert.equal((await tool(agent, 'list_notes_version')).data.rows[0].version, DERNIERE_TOUS);
  assert.equal((await tool(agent, 'get_note_version', { version: '0.2.0' })).data.version, '0.2.0');
  const p = await tool(agent, 'marquer_nouveautes_lues');
  assert.deepEqual(p.data.nouveautes, []);
  assert.equal(getDb().prepare("SELECT channel FROM audit_log WHERE action = 'nouveautes.lues' ORDER BY id DESC").get().channel, 'mcp');
});

test('note de la 0.5.1 : liste des bâtiments refermable et message sous un champ obligatoire, pour tous, en FR et en NL', async () => {
  getDb().prepare("UPDATE users SET version_vue = '0.5.0' WHERE id IN (?, ?)").run(agent.id, resp.id);
  const a = (await agent.get('/api/auth/me')).body.data.nouveautes;
  assert.deepEqual(a.map((n) => n.version), ['0.7.1', '0.7.0', '0.5.2', '0.5.1']);
  assert.equal(a[3].lignes.length, 2);
  assert.ok(a[3].lignes.some((l) => /Masquer la liste/.test(l.fr) && /Lijst verbergen/.test(l.nl)));
  assert.ok(a[3].lignes.some((l) => /Ce champ est obligatoire/.test(l.fr) && /Dit veld is verplicht/.test(l.nl)));
  const r = (await resp.get('/api/auth/me')).body.data.nouveautes;
  assert.deepEqual(r.map((n) => n.version), ['0.7.1', '0.7.0', '0.5.2', '0.5.1']);
  assert.equal(r[3].lignes.length, 2, 'aucune ligne réservée au responsable');
  await agent.put('/api/auth/nouveautes', {});
  await resp.put('/api/auth/nouveautes', {});
});

test('note de la 0.5.2 : téléphone sans agrandissement au toucher d’un champ et message de l’adresse e-mail, pour tous, en FR et en NL', async () => {
  getDb().prepare("UPDATE users SET version_vue = '0.5.1' WHERE id IN (?, ?)").run(agent.id, resp.id);
  const a = (await agent.get('/api/auth/me')).body.data.nouveautes;
  assert.deepEqual(a.map((n) => n.version), ['0.7.1', '0.7.0', '0.5.2']);
  assert.equal(a[2].lignes.length, 2);
  assert.ok(a[2].lignes.some((l) => /deux doigts/.test(l.fr) && /twee vingers/.test(l.nl)));
  assert.ok(a[2].lignes.some((l) => /Adresse e-mail non valide/.test(l.fr) && /Ongeldig e-mailadres/.test(l.nl)));
  const r = (await resp.get('/api/auth/me')).body.data.nouveautes;
  assert.deepEqual(r.map((n) => n.version), ['0.7.1', '0.7.0', '0.5.2']);
  assert.equal(r[2].lignes.length, 2, 'aucune ligne réservée au responsable');
  await agent.put('/api/auth/nouveautes', {});
  await resp.put('/api/auth/nouveautes', {});
});

test('note de la 0.7.0 : formulaire complet pour tous ; fiche pour le service technique, questions et mentions pour le responsable, en FR et en NL', async () => {
  getDb().prepare("UPDATE users SET version_vue = '0.5.2' WHERE id IN (?, ?)").run(agent.id, resp.id);
  const a = (await agent.get('/api/auth/me')).body.data.nouveautes;
  assert.deepEqual(a.map((n) => n.version), ['0.7.1', '0.7.0']);
  assert.equal(a[1].lignes.length, 3, 'trois lignes pour tous, aucune réservée');
  for (const [fr, nl] of [[/Moi aussi/, /Ik ook/], [/Danger/, /Gevaar/], [/Pour quelqu'un d'autre/, /Voor iemand anders/], [/Reprendre/, /Verdergaan/], [/En savoir plus/, /Meer weten/]]) {
    assert.ok(a[1].lignes.some((l) => fr.test(l.fr) && nl.test(l.nl)), String(fr));
  }
  for (const l of a[1].lignes) assert.doesNotMatch(`${l.fr} ${l.nl}`, /GMAO|\bDI\b|RGPD|AVG|MCP/, 'sans jargon');
  const r = (await resp.get('/api/auth/me')).body.data.nouveautes;
  assert.equal(r[1].lignes.length, 5, 'le responsable lit aussi les lignes du service technique, des questions et des mentions');
  assert.ok(r[1].lignes.some((l) => /Catégories et délais/.test(l.fr) && /Categorieën en termijnen/.test(l.nl)));
  assert.ok(r[1].lignes.some((l) => /Protection des données/.test(l.fr) && /Gegevensbescherming/.test(l.nl)));
  await agent.put('/api/auth/nouveautes', {});
  await resp.put('/api/auth/nouveautes', {});
});

test('note de la 0.7.1 : brouillon gardé avec le lieu proposé pour tous ; texte livré de la mention pour le responsable, en FR et en NL', async () => {
  getDb().prepare("UPDATE users SET version_vue = '0.7.0' WHERE id IN (?, ?)").run(agent.id, resp.id);
  const a = (await agent.get('/api/auth/me')).body.data.nouveautes;
  assert.deepEqual(a.map((n) => n.version), ['0.7.1']);
  assert.equal(a[0].lignes.length, 1, 'une ligne pour tous');
  assert.ok(/Brouillon enregistré/.test(a[0].lignes[0].fr) && /Ontwerp bewaard/.test(a[0].lignes[0].nl));
  assert.doesNotMatch(`${a[0].lignes[0].fr} ${a[0].lignes[0].nl}`, /GMAO|\bDI\b|RGPD|AVG|MCP/, 'sans jargon');
  const r = (await resp.get('/api/auth/me')).body.data.nouveautes;
  assert.equal(r[0].lignes.length, 2);
  assert.ok(r[0].lignes.some((l) => /Responsable du traitement/.test(l.fr) && /Verwerkingsverantwoordelijke/.test(l.nl)));
  await agent.put('/api/auth/nouveautes', {});
  await resp.put('/api/auth/nouveautes', {});
});

test('note de la 0.7.2 : une ligne pour l’administrateur seulement ; rien pour le demandeur ni pour le responsable, en FR et en NL', async () => {
  getDb().prepare("UPDATE users SET version_vue = '0.7.1' WHERE id IN (?, ?)").run(agent.id, resp.id);
  getDb().prepare("UPDATE users SET version_vue = '0.7.1' WHERE email = ?").run(INSTALL.email);
  assert.deepEqual((await agent.get('/api/auth/me')).body.data.nouveautes, [], 'aucune ligne pour le demandeur');
  assert.deepEqual((await resp.get('/api/auth/me')).body.data.nouveautes, [], 'aucune ligne pour le responsable');
  const a = (await admin.get('/api/auth/me')).body.data.nouveautes;
  assert.deepEqual(a.map((n) => n.version), ['0.7.4', '0.7.3', '0.7.2']);
  assert.equal(a[2].lignes.length, 1);
  assert.ok(/EUPL-1\.2/.test(a[2].lignes[0].fr) && /EUPL-1\.2/.test(a[2].lignes[0].nl));
  await agent.put('/api/auth/nouveautes', {});
  await resp.put('/api/auth/nouveautes', {});
  await admin.put('/api/auth/nouveautes', {});
});

test('note de la 0.7.3 : une ligne pour l’administrateur seulement (correctif de sécurité) ; rien pour le demandeur ni pour le responsable, en FR et en NL', async () => {
  getDb().prepare("UPDATE users SET version_vue = '0.7.2' WHERE id IN (?, ?)").run(agent.id, resp.id);
  getDb().prepare("UPDATE users SET version_vue = '0.7.2' WHERE email = ?").run(INSTALL.email);
  assert.deepEqual((await agent.get('/api/auth/me')).body.data.nouveautes, [], 'aucune ligne pour le demandeur');
  assert.deepEqual((await resp.get('/api/auth/me')).body.data.nouveautes, [], 'aucune ligne pour le responsable');
  const a = (await admin.get('/api/auth/me')).body.data.nouveautes;
  assert.deepEqual(a.map((n) => n.version), ['0.7.4', '0.7.3']);
  assert.equal(a[1].lignes.length, 1);
  assert.ok(/sécurité/.test(a[1].lignes[0].fr) && /Beveiligingscorrectie/.test(a[1].lignes[0].nl));
  for (const l of a[1].lignes) assert.doesNotMatch(`${l.fr} ${l.nl}`, /GMAO|\bDI\b|RGPD|AVG|MCP|body-parser|npm/, 'sans jargon');
  await agent.put('/api/auth/nouveautes', {});
  await resp.put('/api/auth/nouveautes', {});
  await admin.put('/api/auth/nouveautes', {});
});

test('note de la 0.7.4 : une ligne pour l’administrateur seulement (noms dans le journal d’audit) ; rien pour le demandeur ni pour le responsable, en FR et en NL', async () => {
  getDb().prepare("UPDATE users SET version_vue = '0.7.3' WHERE id IN (?, ?)").run(agent.id, resp.id);
  getDb().prepare("UPDATE users SET version_vue = '0.7.3' WHERE email = ?").run(INSTALL.email);
  assert.deepEqual((await agent.get('/api/auth/me')).body.data.nouveautes, [], 'aucune ligne pour le demandeur');
  assert.deepEqual((await resp.get('/api/auth/me')).body.data.nouveautes, [], 'aucune ligne pour le responsable');
  const a = (await admin.get('/api/auth/me')).body.data.nouveautes;
  assert.deepEqual(a.map((n) => n.version), ['0.7.4']);
  assert.equal(a[0].lignes.length, 1);
  assert.ok(/journal d'audit/.test(a[0].lignes[0].fr) && /auditlogboek/.test(a[0].lignes[0].nl));
  for (const l of a[0].lignes) assert.doesNotMatch(`${l.fr} ${l.nl}`, /GMAO|\bDI\b|RGPD|AVG|MCP|lieu_id|categorie_id/, 'sans jargon');
  await agent.put('/api/auth/nouveautes', {});
  await resp.put('/api/auth/nouveautes', {});
  await admin.put('/api/auth/nouveautes', {});
});
