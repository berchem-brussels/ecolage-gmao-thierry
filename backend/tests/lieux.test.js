/**
 * Référentiel des lieux et listes de valeurs (version 0.2.0) : REF-01, REF-02, REF-08, LNG-02, règles 1 à 7
 * validées le 21/10/2026, photo (dépôt, contrôle, métadonnées retirées, suppression réelle), commande de démonstration.
 * La cloison entre entités est dans cloison.test.js.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { startServer, client, setup, person, INSTALL } = require('./helpers');
const { jpeg, png } = require('./fixtures');
const { getDb } = require('../src/database');
const { PHOTOS_DIR } = require('../src/config');

let srv;
let admin;
let ea;
let eb;
let gest;
let resp;
let agent;
let types;

const parse = (r) => JSON.parse(r.body.result.content[0].text);
const tool = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));
const typeId = (code) => types.find((t) => t.code === code).id;

/** Dépôt d'une photo en formulaire multipart (champ « fichier ») par le cookie de session et le jeton anti-CSRF, comme le navigateur. */
async function upload(c, id, buf, type = 'image/jpeg', { csrf = true } = {}) {
  const headers = { Cookie: c.cookie };
  if (csrf) headers['X-CSRF-Token'] = c.csrf;
  const body = new FormData();
  body.append('fichier', new Blob([buf], { type }), 'photo');
  const res = await fetch(`${srv.base}/api/lieux/${id}/photo`, { method: 'POST', headers, body });
  return { status: res.status, body: await res.json() };
}

const fichiers = () => (fs.existsSync(PHOTOS_DIR) ? fs.readdirSync(PHOTOS_DIR).filter((f) => !f.endsWith('.tmp')) : []);

async function creer(c, body) {
  const r = await c.post('/api/lieux', body);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.data;
}

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  gest = await person(srv.base, admin, 'gest@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  resp = await person(srv.base, admin, 'resp@exemple.test', ea.id, [[ea.id, 'responsable']]);
  agent = await person(srv.base, admin, 'agent@exemple.test', ea.id);
  types = (await agent.get('/api/listes-valeurs?liste=type_lieu&limit=200')).body.data;
});
after(() => srv.stop());

/* ---------- Listes de valeurs ---------- */

test('types de lieux livrés pour chaque entité, en FR et en NL, dans l’ordre', async () => {
  assert.equal(types.length, 10);
  assert.deepEqual(types.map((t) => t.code), ['bureau', 'salle_reunion', 'atelier', 'garage', 'classe', 'cuisine', 'sanitaires', 'stockage', 'technique', 'exterieur']);
  assert.ok(types.every((t) => t.libelle_fr && t.libelle_nl && t.entite_id === ea.id));
  assert.equal(types.find((t) => t.code === 'exterieur').libelle_nl, 'Buitenruimte');
  const n = getDb().prepare("SELECT COUNT(*) AS n FROM listes_valeurs WHERE entite_id = ? AND liste = 'type_lieu'").get(eb.id).n;
  assert.equal(n, 10, 'seconde entité');
});

test('une entité créée ensuite reçoit aussi les valeurs livrées', async () => {
  const cc = (await admin.post('/api/entites', { code: 'CC', nom_fr: 'Régie fictive', nom_nl: 'Fictieve regie' })).body.data;
  assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM listes_valeurs WHERE entite_id = ?').get(cc.id).n, 10);
});

test('listes : lecture pour tout rôle de l’entité ; écriture par le responsable seul', async () => {
  const body = { liste: 'type_lieu', code: 'chaufferie', libelle_fr: 'Chaufferie', libelle_nl: 'Stookruimte' };
  assert.equal((await agent.post('/api/listes-valeurs', body)).status, 403);
  assert.equal((await gest.post('/api/listes-valeurs', body)).status, 403, 'le gestionnaire ne règle pas les listes');
  const r = await resp.post('/api/listes-valeurs', body);
  assert.equal(r.status, 201);
  assert.equal(r.body.data.ordre, 110, 'rangée après la dernière valeur');
  assert.equal((await resp.post('/api/listes-valeurs', body)).body.code, 'VALEUR_DUPLICATE');
  assert.equal((await resp.post('/api/listes-valeurs', { ...body, code: 'Chaufferie 2' })).status, 400, 'code en minuscules');
  assert.equal((await resp.post('/api/listes-valeurs', { ...body, code: 'autre', libelle_nl: '' })).status, 400, 'libellé NL obligatoire (LNG-02)');
  assert.equal((await resp.post('/api/listes-valeurs', { ...body, liste: 'inconnue' })).status, 400);
  const u = await resp.put(`/api/listes-valeurs/${r.body.data.id}`, { libelle_nl: 'Stookplaats', ordre: 5 });
  assert.equal(u.body.data.libelle_nl, 'Stookplaats');
  assert.equal((await resp.put(`/api/listes-valeurs/${r.body.data.id}`, { code: 'x' })).status, 400, 'code figé');
  assert.equal((await agent.get('/api/listes-valeurs?liste=type_lieu')).body.data[0].code, 'chaufferie', 'ordre respecté');
});

test('listes : désactivation avec motif, réactivation, journal d’audit', async () => {
  const v = (await resp.post('/api/listes-valeurs', { liste: 'type_lieu', code: 'archives', libelle_fr: 'Archives', libelle_nl: 'Archief' })).body.data;
  assert.equal((await resp.del(`/api/listes-valeurs/${v.id}`, {})).status, 400, 'motif exigé');
  const d = await resp.del(`/api/listes-valeurs/${v.id}`, { motif: 'Doublon' });
  assert.equal(d.body.data.is_active, 0);
  assert.equal((await resp.del(`/api/listes-valeurs/${v.id}`, { motif: 'x' })).body.code, 'CANCELLED');
  assert.equal((await agent.get('/api/listes-valeurs?liste=type_lieu&is_active=1')).body.data.some((x) => x.id === v.id), false);
  assert.equal((await resp.put(`/api/listes-valeurs/${v.id}`, { is_active: 1 })).body.data.motif_desactivation, null);
  const actions = getDb().prepare("SELECT action FROM audit_log WHERE entity_type = 'liste_valeur' AND entity_id = ? ORDER BY id").all(v.id).map((a) => a.action);
  assert.deepEqual(actions, ['valeur.create', 'valeur.deactivate', 'valeur.update']);
});

/* ---------- Lieux : droits et règles ---------- */

let site;
let bat;
let niv;

test('lieux : le demandeur lit ; gestionnaire et responsable créent ; administrateur sans rôle métier ne crée pas', async () => {
  const body = { nature: 'site', code: 'S1', nom_fr: 'Site central', nom_nl: 'Centrale site', adresse: 'Rue Fictive 1', code_postal: '9999', commune: 'Démoville' };
  assert.equal((await agent.post('/api/lieux', body)).status, 403);
  assert.equal((await admin.post('/api/lieux', body)).status, 403);
  site = await creer(gest, body);
  assert.equal(site.statut, 'en_service');
  assert.equal(site.has_photo, 0);
  assert.equal((await agent.get(`/api/lieux/${site.id}`)).body.data.nom_nl, 'Centrale site');
  assert.equal((await creer(resp, { nature: 'site', code: 'S2', nom_fr: 'Second site', nom_nl: 'Tweede site' })).code, 'S2');
});

test('règle 1 : bâtiment sous un site, niveau sous un bâtiment ; règle 5 : adresse reprise du site', async () => {
  bat = await creer(gest, { nature: 'batiment', parent_id: site.id, code: 'B1', nom_fr: 'Bâtiment A', nom_nl: 'Gebouw A', surface_m2: 1250.5 });
  assert.equal(bat.adresse, 'Rue Fictive 1');
  assert.equal(bat.commune, 'Démoville');
  assert.equal(bat.surface_m2, 1250.5);
  niv = await creer(gest, { nature: 'niveau', parent_id: bat.id, code: 'B1-R0', nom_fr: 'Rez-de-chaussée', nom_nl: 'Gelijkvloers' });
  const propre = await creer(gest, { nature: 'batiment', parent_id: site.id, code: 'B2', nom_fr: 'Annexe', nom_nl: 'Bijgebouw', adresse: 'Autre rue 2' });
  assert.equal(propre.adresse, 'Autre rue 2', 'une adresse saisie prime');
  for (const [body, code] of [
    [{ nature: 'niveau', parent_id: site.id, code: 'N9', nom_fr: 'x', nom_nl: 'x' }, 'LIEU_PARENT'],
    [{ nature: 'batiment', parent_id: bat.id, code: 'B9', nom_fr: 'x', nom_nl: 'x' }, 'LIEU_PARENT'],
    [{ nature: 'batiment', code: 'B8', nom_fr: 'x', nom_nl: 'x' }, 'LIEU_PARENT'],
    [{ nature: 'site', parent_id: site.id, code: 'S9', nom_fr: 'x', nom_nl: 'x' }, 'LIEU_PARENT'],
    [{ nature: 'batiment', parent_id: 99999, code: 'B7', nom_fr: 'x', nom_nl: 'x' }, 'LIEU_PARENT'],
  ]) {
    const r = await gest.post('/api/lieux', body);
    assert.equal(r.status, 409, JSON.stringify(body));
    assert.equal(r.body.code, code);
  }
});

test('règles 1, 2 et 7 : local sous un niveau, un bâtiment ou un site ; type exigé, de la bonne liste', async () => {
  const l1 = await creer(gest, { nature: 'local', parent_id: niv.id, code: 'B1-L01', nom_fr: 'Accueil', nom_nl: 'Onthaal', type_id: typeId('bureau') });
  assert.equal(l1.type_code, 'bureau');
  assert.equal(l1.type_libelle_nl, 'Kantoor');
  assert.equal((await creer(gest, { nature: 'local', parent_id: bat.id, code: 'B1-L02', nom_fr: 'Atelier', nom_nl: 'Werkplaats', type_id: typeId('atelier') })).parent_id, bat.id);
  assert.equal((await creer(gest, { nature: 'local', parent_id: site.id, code: 'S1-X01', nom_fr: 'Cour', nom_nl: 'Binnenplaats', type_id: typeId('exterieur') })).parent_id, site.id);
  const sansType = await gest.post('/api/lieux', { nature: 'local', parent_id: niv.id, code: 'B1-L09', nom_fr: 'x', nom_nl: 'x' });
  assert.equal(sansType.body.code, 'TYPE_REQUIS');
  const sousLocal = await gest.post('/api/lieux', { nature: 'local', parent_id: l1.id, code: 'B1-L10', nom_fr: 'x', nom_nl: 'x', type_id: typeId('bureau') });
  assert.equal(sousLocal.body.code, 'LIEU_PARENT');
  assert.equal((await gest.post('/api/lieux', { nature: 'local', parent_id: niv.id, code: 'B1-L11', nom_fr: 'x', nom_nl: 'x', type_id: 99999 })).body.code, 'VALEUR_INVALIDE');
});

test('règle 7 : un type désactivé ne se choisit plus, le lieu qui le porte le garde et se réenregistre', async () => {
  const v = (await resp.post('/api/listes-valeurs', { liste: 'type_lieu', code: 'vestiaire', libelle_fr: 'Vestiaire', libelle_nl: 'Kleedruimte' })).body.data;
  const l = await creer(gest, { nature: 'local', parent_id: niv.id, code: 'B1-L03', nom_fr: 'Vestiaire', nom_nl: 'Kleedruimte', type_id: v.id });
  await resp.del(`/api/listes-valeurs/${v.id}`, { motif: 'Remplacé' });
  assert.equal((await gest.put(`/api/lieux/${l.id}`, { nom_fr: 'Vestiaire du personnel', type_id: v.id })).status, 200);
  assert.equal((await gest.get(`/api/lieux/${l.id}`)).body.data.type_code, 'vestiaire');
  const neuf = await gest.post('/api/lieux', { nature: 'local', parent_id: niv.id, code: 'B1-L04', nom_fr: 'x', nom_nl: 'x', type_id: v.id });
  assert.equal(neuf.body.code, 'VALEUR_INVALIDE');
});

test('règle 3 : code unique dans l’entité ; nature figée ; champ inconnu refusé', async () => {
  assert.equal((await gest.post('/api/lieux', { nature: 'site', code: 'S1', nom_fr: 'x', nom_nl: 'x' })).body.code, 'LIEU_CODE_DUPLICATE');
  assert.equal((await gest.put(`/api/lieux/${bat.id}`, { code: 'S1' })).body.code, 'LIEU_CODE_DUPLICATE');
  assert.equal((await gest.put(`/api/lieux/${bat.id}`, { nature: 'site' })).status, 400);
  assert.equal((await gest.post('/api/lieux', { nature: 'site', code: 'S5', nom_fr: 'x', nom_nl: 'x', entite_id: eb.id })).status, 400, 'entité jamais lue dans le corps');
  assert.equal((await gest.post('/api/lieux', { nature: 'site', code: 'S6', nom_fr: 'x', nom_nl: '' })).status, 400, 'nom NL obligatoire');
  assert.equal((await gest.post('/api/lieux', { nature: 'site', code: 'a b', nom_fr: 'x', nom_nl: 'x' })).status, 400);
  assert.equal((await gest.post('/api/lieux', { nature: 'site', code: 'S7', nom_fr: 'x', nom_nl: 'x', surface_m2: -3 })).status, 400);
});

test('statut en service, hors service, cédé ; déplacement sous un autre parent admis', async () => {
  assert.equal((await gest.put(`/api/lieux/${bat.id}`, { statut: 'hors_service' })).body.data.statut, 'hors_service');
  assert.equal((await gest.put(`/api/lieux/${bat.id}`, { statut: 'vendu' })).status, 400);
  await gest.put(`/api/lieux/${bat.id}`, { statut: 'en_service' });
  const s2 = (await gest.get('/api/lieux?nature=site&q=Second')).body.data[0];
  const b3 = await creer(gest, { nature: 'batiment', parent_id: site.id, code: 'B3', nom_fr: 'Pavillon', nom_nl: 'Paviljoen' });
  assert.equal((await gest.put(`/api/lieux/${b3.id}`, { parent_id: s2.id })).body.data.parent_id, s2.id);
  assert.equal((await gest.put(`/api/lieux/${b3.id}`, { parent_id: niv.id })).body.code, 'LIEU_PARENT');
});

test('règle 4 : désactivation refusée tant qu’un lieu actif dépend du lieu ; réactivation sous un parent actif', async () => {
  const b = await creer(gest, { nature: 'batiment', parent_id: site.id, code: 'B4', nom_fr: 'Hangar', nom_nl: 'Loods' });
  const n = await creer(gest, { nature: 'niveau', parent_id: b.id, code: 'B4-R0', nom_fr: 'Rez', nom_nl: 'Gelijkvloers' });
  assert.equal((await gest.del(`/api/lieux/${b.id}`, {})).status, 400, 'motif exigé');
  const refus = await gest.del(`/api/lieux/${b.id}`, { motif: 'Démoli' });
  assert.equal(refus.status, 409);
  assert.equal(refus.body.code, 'LIEU_ENFANTS');
  assert.equal((await gest.del(`/api/lieux/${n.id}`, { motif: 'Démoli' })).body.data.is_active, 0);
  const d = await gest.del(`/api/lieux/${b.id}`, { motif: 'Démoli' });
  assert.equal(d.body.data.is_active, 0);
  assert.equal(d.body.data.motif_desactivation, 'Démoli');
  assert.equal((await gest.put(`/api/lieux/${b.id}`, { nom_fr: 'x' })).body.code, 'CANCELLED');
  assert.equal((await gest.put(`/api/lieux/${n.id}`, { is_active: 1 })).body.code, 'PARENT_INACTIF');
  assert.equal((await gest.post('/api/lieux', { nature: 'niveau', parent_id: b.id, code: 'B4-R1', nom_fr: 'x', nom_nl: 'x' })).body.code, 'PARENT_INACTIF');
  assert.equal((await gest.put(`/api/lieux/${b.id}`, { is_active: 1 })).body.data.is_active, 1);
  assert.equal((await gest.put(`/api/lieux/${n.id}`, { is_active: 1 })).body.data.is_active, 1);
  assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM lieux WHERE id = ?').get(b.id).n, 1, 'aucune suppression physique');
});

test('arbre de l’entité : sites, bâtiments, niveaux, locaux imbriqués ; lieux désactivés sur demande', async () => {
  const x = await creer(gest, { nature: 'local', parent_id: niv.id, code: 'B1-L05', nom_fr: 'Réserve', nom_nl: 'Berging', type_id: typeId('stockage') });
  await gest.del(`/api/lieux/${x.id}`, { motif: 'Fermé' });
  const a = (await agent.get('/api/lieux/arbre')).body.data;
  assert.deepEqual(a.racines.map((r) => r.code), ['S1', 'S2']);
  const s1 = a.racines[0];
  assert.deepEqual(s1.enfants.map((e) => e.code), ['B1', 'B2', 'B4', 'S1-X01'], 'B3 déplacé sous S2');
  assert.deepEqual(a.racines[1].enfants.map((e) => e.code), ['B3']);
  const r0 = s1.enfants[0].enfants.find((e) => e.code === 'B1-R0');
  assert.ok(!r0.enfants.some((e) => e.code === 'B1-L05'), 'désactivé absent');
  const tout = (await agent.get('/api/lieux/arbre?inclure_inactifs=1')).body.data;
  assert.ok(tout.racines[0].enfants[0].enfants.find((e) => e.code === 'B1-R0').enfants.some((e) => e.code === 'B1-L05'));
  assert.equal((await agent.get('/api/lieux/arbre?inclure_inactifs=2')).status, 400);
});

test('recherche par code, nom FR ou NL, adresse ; filtres et pagination', async () => {
  assert.deepEqual((await agent.get('/api/lieux?q=Onthaal')).body.data.map((l) => l.code), ['B1-L01']);
  assert.ok((await agent.get('/api/lieux?q=Fictive')).body.data.some((l) => l.code === 'B1'));
  const p = await agent.get('/api/lieux?nature=local&limit=2&offset=0');
  assert.equal(p.body.data.length, 2);
  assert.ok(p.body.pagination.total >= 4);
  assert.equal((await agent.get('/api/lieux?limit=500')).status, 400, 'liste bornée');
});

test('journal d’audit : création, modification, désactivation des lieux', async () => {
  const actions = getDb().prepare("SELECT DISTINCT action FROM audit_log WHERE entity_type = 'lieu'").all().map((a) => a.action);
  for (const a of ['lieu.create', 'lieu.update', 'lieu.deactivate', 'lieu.reactivate']) assert.ok(actions.includes(a), a);
});

/* ---------- Photo ---------- */

test('photo : dépôt JPEG, métadonnées retirées sur le disque, lecture par le cookie seul', async () => {
  const avant = fichiers().length;
  const r = await upload(gest, bat.id, jpeg());
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.has_photo, 1);
  assert.ok(r.body.data.photo_at);
  assert.doesNotMatch(JSON.stringify(r.body), /photo_fichier|\.jpg/, 'le nom du fichier sur le disque n’est pas rendu');
  const liste = fichiers();
  assert.equal(liste.length, avant + 1);
  const disque = fs.readFileSync(path.join(PHOTOS_DIR, liste.find((f) => f.endsWith('.jpg'))));
  assert.doesNotMatch(disque.toString('latin1'), /Exif|GPS|APPAREIL|COMMENTAIRE/);
  assert.equal(disque[0], 0xff);
  const res = await fetch(`${srv.base}/api/lieux/${bat.id}/photo`, { headers: { Cookie: agent.cookie } });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/jpeg');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.match(res.headers.get('cache-control'), /no-store/);
  assert.ok(Buffer.from(await res.arrayBuffer()).equals(disque));
  assert.equal((await client(srv.base).get(`/api/lieux/${bat.id}/photo`)).status, 401, 'sans session');
});

test('photo : une nouvelle photo efface réellement l’ancienne (règle 6), même d’un autre format', async () => {
  const avant = fichiers();
  const r = await upload(gest, bat.id, png(), 'image/png');
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const apres = fichiers();
  assert.equal(apres.length, avant.length);
  assert.ok(apres.some((f) => f.endsWith('.png')));
  assert.ok(!apres.some((f) => avant.includes(f) && f.endsWith('.jpg')), 'ancien JPEG effacé');
  const disque = fs.readFileSync(path.join(PHOTOS_DIR, apres.find((f) => f.endsWith('.png'))));
  assert.doesNotMatch(disque.toString('latin1'), /tEXt|AUTEUR/);
  const actions = getDb().prepare("SELECT action, details_json FROM audit_log WHERE entity_type = 'lieu' AND entity_id = ? AND action LIKE 'lieu.photo%' ORDER BY id").all(bat.id);
  assert.deepEqual(actions.map((a) => a.action), ['lieu.photo.set', 'lieu.photo.replace']);
  assert.doesNotMatch(actions.map((a) => a.details_json).join(''), /[a-f0-9]{32}/, 'journal sans nom de fichier');
});

test('photo : contrôle du contenu et non de l’étiquette', async () => {
  const exe = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(200, 0x90)]);
  assert.equal((await upload(gest, bat.id, exe, 'image/jpeg')).body.code, 'FILE_TYPE', 'exécutable renommé');
  assert.equal((await upload(gest, bat.id, png(), 'image/jpeg')).body.code, 'FILE_TYPE', 'type annoncé faux');
  assert.equal((await upload(gest, bat.id, Buffer.from('<svg onload=alert(1)>'), 'image/svg+xml')).body.code, 'FILE_TYPE', 'SVG refusé');
  const tronque = jpeg().subarray(0, 60);
  assert.equal((await upload(gest, bat.id, tronque)).body.code, 'FILE_INVALID', 'structure tronquée');
  assert.equal((await upload(gest, bat.id, jpeg({ width: 9000, height: 100 }))).body.code, 'FILE_INVALID', 'dimensions trop grandes');
  const gros = await upload(gest, bat.id, Buffer.concat([jpeg(), Buffer.alloc(1100 * 1024)]));
  assert.equal(gros.status, 413);
  assert.equal(gros.body.code, 'PAYLOAD_TOO_LARGE');
  assert.equal((await gest.get(`/api/lieux/${bat.id}`)).body.data.has_photo, 1, 'la photo en place reste');
});

test('photo : droits, jeton anti-CSRF, lieu désactivé', async () => {
  assert.equal((await upload(agent, bat.id, jpeg())).status, 403);
  assert.equal((await upload(gest, bat.id, jpeg(), 'image/jpeg', { csrf: false })).body.code, 'CSRF');
  assert.equal((await upload(gest, 99999, jpeg())).status, 404);
  const s = await creer(gest, { nature: 'site', code: 'S8', nom_fr: 'Fermé', nom_nl: 'Gesloten' });
  await gest.del(`/api/lieux/${s.id}`, { motif: 'Fermé' });
  assert.equal((await upload(gest, s.id, jpeg())).body.code, 'CANCELLED');
});

test('photo : suppression réelle, fichier effacé du disque, journal ; lecture ensuite 404', async () => {
  assert.equal((await agent.del(`/api/lieux/${bat.id}/photo`)).status, 403);
  const avant = fichiers().length;
  const r = await gest.del(`/api/lieux/${bat.id}/photo`);
  assert.equal(r.status, 200);
  assert.equal(r.body.data.has_photo, 0);
  assert.equal(fichiers().length, avant - 1);
  assert.equal((await gest.get(`/api/lieux/${bat.id}/photo`)).body.code, 'NO_PHOTO');
  assert.equal((await gest.del(`/api/lieux/${bat.id}/photo`)).body.code, 'NO_PHOTO');
  assert.ok(getDb().prepare("SELECT 1 FROM audit_log WHERE action = 'lieu.photo.delete' AND entity_id = ?").get(bat.id));
});

/* ---------- MCP ---------- */

test('MCP : arbre, création et effacement de photo en deux appels, sous les droits de la personne', async () => {
  const a = await tool(agent, 'get_lieux_arbre');
  assert.deepEqual(a.data.racines.map((r) => r.code), ['S1', 'S2']);
  assert.equal((await tool(agent, 'create_lieu', { nature: 'site', code: 'M1', nom_fr: 'x', nom_nl: 'x' })).code, 'FORBIDDEN');
  const m = await tool(gest, 'create_lieu', { nature: 'site', code: 'M1', nom_fr: 'Par MCP', nom_nl: 'Via MCP' });
  assert.equal(m.data.code, 'M1');
  assert.equal(getDb().prepare("SELECT channel FROM audit_log WHERE action = 'lieu.create' AND entity_id = ?").get(m.data.id).channel, 'mcp');
  await upload(gest, m.data.id, jpeg());
  assert.equal((await tool(agent, 'prepare_delete_lieu_photo', { id: m.data.id })).code, 'FORBIDDEN', 'aucun jeton sans le droit');
  const p = await tool(gest, 'prepare_delete_lieu_photo', { id: m.data.id });
  assert.equal(p.data.definitif, true);
  const c = await tool(gest, 'confirm_delete_lieu_photo', { confirmation_token: p.data.confirmation_token });
  assert.equal(c.data.has_photo, 0);
  const t = await tool(resp, 'create_liste_valeur', { liste: 'type_lieu', code: 'local_velos', libelle_fr: 'Local vélos', libelle_nl: 'Fietsenberging' });
  assert.equal(t.data.libelle_nl, 'Fietsenberging');
  const pd = await tool(gest, 'prepare_deactivate_lieu', { id: site.id, motif: 'x' });
  assert.ok(pd.data.confirmation_token, 'la vérification des enfants a lieu à la confirmation');
  assert.equal((await tool(gest, 'confirm_deactivate_lieu', { confirmation_token: pd.data.confirmation_token })).code, 'LIEU_ENFANTS');
});

/* ---------- Démonstration ---------- */

test('commande de démonstration : lieux fictifs par entité, rejouable sans écraser, retirés par --retirer', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gmao-demo-lieux-'));
  const env = { PATH: process.env.PATH, NODE_ENV: 'test', APP_TEST_MODE: '1', DB_PATH: path.join(dir, 'd.db'), DEMO_ALLOWED: '1' };
  const run = (args = [], code = '') => spawnSync(process.execPath, code ? ['-e', code] : ['src/demo.js', ...args], { cwd: path.join(__dirname, '..'), env, encoding: 'utf8' });
  const install = run([], `require('./src/database').initDb().then((db) => {
    const e1 = db.prepare("INSERT INTO entites (code, nom_fr, nom_nl) VALUES ('AC', 'A', 'A')").run().lastInsertRowid;
    db.prepare("INSERT INTO entites (code, nom_fr, nom_nl) VALUES ('CPAS', 'C', 'C')").run();
    db.prepare("INSERT INTO users (email, first_name, last_name, user_role, entite_id) VALUES ('x@exemple.test', 'x', 'x', 'admin', ?)").run(e1);
    require('./src/services/listes-valeurs').seedAll();
    require('./src/database').saveNow();
  })`);
  assert.equal(install.status, 0, install.stderr);
  const r1 = run();
  assert.equal(r1.status, 0, r1.stderr);
  assert.match(r1.stdout, /31 lieu\(x\) de démonstration créé/);
  const q = (sql) => JSON.parse(run([], `require('./src/database').initDb().then((db) => console.log(JSON.stringify(db.prepare(${JSON.stringify(sql)}).all())))`).stdout.trim().split('\n').pop());
  const lieux = q('SELECT l.code, l.nature, l.is_demo, p.code AS parent, t.code AS type FROM lieux l LEFT JOIN lieux p ON p.id = l.parent_id LEFT JOIN listes_valeurs t ON t.id = l.type_id ORDER BY l.code');
  assert.ok(lieux.every((l) => l.is_demo === 1));
  const by = Object.fromEntries(lieux.map((l) => [l.code, l]));
  assert.equal(by['AC-B1-L02'].parent, 'AC-B1-R0');
  assert.equal(by['AC-B2-L01'].parent, 'AC-B2', 'bâtiment sans niveau (règle 1)');
  assert.equal(by['AC-S2-X01'].parent, 'AC-S2', 'extérieur sous le site (règle 2)');
  assert.equal(by['CPAS-S1-X01'].type, 'exterieur');
  assert.equal(by['CPAS-B2'].nature, 'batiment');
  assert.ok(lieux.filter((l) => l.nature === 'local').every((l) => l.type), 'type sur chaque local (règle 7)');
  run([], `require('./src/database').initDb().then((db) => { db.prepare("UPDATE lieux SET nom_fr = 'Corrigé' WHERE code = 'AC-B1'").run(); require('./src/database').saveNow(); })`);
  const r2 = run();
  assert.match(r2.stdout, /0 lieu\(x\) de démonstration créé/);
  assert.equal(q("SELECT nom_fr FROM lieux WHERE code = 'AC-B1'")[0].nom_fr, 'Corrigé', 'lieu existant gardé');
  const r3 = run(['--retirer']);
  assert.match(r3.stdout, /31 lieu\(x\) de démonstration désactivé/);
  assert.equal(q('SELECT COUNT(*) AS n FROM lieux WHERE is_active = 1')[0].n, 0);
  run();
  assert.equal(q('SELECT COUNT(*) AS n FROM lieux WHERE is_active = 1')[0].n, 31, 'réactivés à la relance');
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '..', 'src', 'demo.js'), 'utf8'), /\.jpe?g|\.png|base64,/, 'aucune photo livrée');
  assert.ok(INSTALL);
});
