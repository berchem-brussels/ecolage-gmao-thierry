/**
 * Modules activables (cahier des charges ADM-02, API-04 ; standard v3.2, sections 6.2 et 7.4).
 * Pour toute l'instance ; noyau et modules à venir non réglables ; Patrimoine éteint ferme les écritures des lieux,
 * par l'API et par le MCP, et laisse leur lecture ouverte ; rôle contrôlé avant le module.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { getDb } = require('../src/database');
const { collectRoutes } = require('../src/openapi');
const { jpeg } = require('./fixtures');

let srv;
let admin;
let ea;
let eb;
let gest;
let gestB;
let agent;
let site;
const parse = (r) => JSON.parse(r.body.result.content[0].text);
const tool = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));
const photo = (c, id) => fetch(`${srv.base}/api/lieux/${id}/photo`, {
  method: 'POST', headers: { 'Content-Type': 'image/jpeg', Cookie: c.cookie, 'X-CSRF-Token': c.csrf }, body: jpeg(),
});

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  gest = await person(srv.base, admin, 'm.gest@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  gestB = await person(srv.base, admin, 'm.gestb@exemple.test', eb.id, [[eb.id, 'gestionnaire']]);
  agent = await person(srv.base, admin, 'm.agent@exemple.test', ea.id);
  site = (await gest.post('/api/lieux', { nature: 'site', code: 'MS1', nom_fr: 'Site', nom_nl: 'Site' })).body.data;
});
after(() => srv.stop());

test('catalogue des modules lisible par toute personne connectée : noyau, disponibles, à venir', async () => {
  const r = await agent.get('/api/modules');
  assert.equal(r.status, 200);
  const by = Object.fromEntries(r.body.data.map((m) => [m.code, m]));
  assert.deepEqual(Object.keys(by), ['demandes', 'patrimoine', 'salles', 'materiel', 'preventif', 'controles', 'compteurs', 'stock', 'vehicules', 'grc', 'portail_public']);
  assert.equal(by.demandes.noyau, true);
  assert.equal(by.demandes.actif, true);
  assert.equal(by.demandes.disponible, true, 'rendu disponible en 0.5.0');
  assert.equal(by.patrimoine.disponible, true);
  assert.equal(by.patrimoine.actif, true);
  assert.ok(by.patrimoine.ferme_fr && by.patrimoine.ferme_nl);
  assert.equal(by.portail_public.actif, false, 'réglage le plus fermé par défaut');
  for (const m of r.body.data) assert.ok(m.libelle_fr && m.libelle_nl && m.description_fr && m.description_nl, m.code);
  assert.equal((await agent.get('/api/modules?disponible=1')).body.data.length, 2);
  assert.equal((await agent.get('/api/modules/inconnu')).status, 400);
});

test('réglage réservé à l’administrateur ; noyau et modules à venir refusés', async () => {
  assert.equal((await gest.put('/api/modules/patrimoine', { actif: 0 })).status, 403);
  const n = await admin.put('/api/modules/demandes', { actif: 0 });
  assert.equal(n.status, 409);
  assert.equal(n.body.code, 'MODULE_NOYAU');
  const v = await admin.put('/api/modules/vehicules', { actif: 0 });
  assert.equal(v.status, 409);
  assert.equal(v.body.code, 'MODULE_A_VENIR');
  assert.equal((await admin.put('/api/modules/patrimoine', { actif: 2 })).status, 400);
});

test('Patrimoine éteint : toutes les écritures des lieux refusées, lecture ouverte, journal', async () => {
  const off = await admin.put('/api/modules/patrimoine', { actif: 0 });
  assert.equal(off.status, 200);
  assert.equal(off.body.data.actif, false);
  assert.ok(getDb().prepare("SELECT 1 FROM audit_log WHERE action = 'module.desactiver' AND details_json LIKE '%patrimoine%'").get());

  // Chaque route d'écriture de /api/lieux, énumérée sur l'application montée : 403 MODULE_DISABLED.
  const ecritures = collectRoutes(srv.app).filter((r) => r.path.startsWith('/api/lieux') && r.method !== 'GET');
  assert.equal(ecritures.length, 5, ecritures.map((r) => `${r.method} ${r.path}`).join(', '));
  for (const r of ecritures) {
    const url = r.path.replace(':id', String(site.id));
    let res;
    if (r.path.endsWith('/photo') && r.method === 'POST') res = { status: (await photo(gest, site.id)).status, body: { code: 'MODULE_DISABLED' } };
    else {
      const body = r.method === 'POST' ? { nature: 'site', code: 'MS2', nom_fr: 'x', nom_nl: 'x' } : r.method === 'PUT' ? { nom_fr: 'y' } : (r.path.endsWith('/photo') ? {} : { motif: 'x' });
      res = await gest[{ POST: 'post', PUT: 'put', DELETE: 'del' }[r.method]](url, body);
    }
    assert.equal(res.status, 403, `${r.method} ${r.path}`);
    assert.equal(res.body.code, 'MODULE_DISABLED', `${r.method} ${r.path}`);
  }
  const p = await photo(gest, site.id);
  assert.equal((await p.json()).code, 'MODULE_DISABLED');

  assert.equal((await gest.get('/api/lieux')).status, 200, 'liste lisible');
  assert.equal((await gest.get('/api/lieux/arbre')).status, 200, 'arbre lisible');
  assert.equal((await gest.get(`/api/lieux/${site.id}`)).status, 200, 'fiche lisible');
  assert.equal((await gest.get('/api/listes-valeurs?liste=type_lieu')).status, 200, 'listes de valeurs ouvertes');
});

test('Patrimoine éteint : le rôle se contrôle avant le module (ordre API-04)', async () => {
  const r = await agent.post('/api/lieux', { nature: 'site', code: 'MS3', nom_fr: 'x', nom_nl: 'x' });
  assert.equal(r.status, 403);
  assert.equal(r.body.code, 'FORBIDDEN', 'un demandeur sans droit reçoit FORBIDDEN, pas MODULE_DISABLED');
});

test('Patrimoine éteint pour toute l’instance : l’autre entité aussi', async () => {
  const r = await gestB.post('/api/lieux', { nature: 'site', code: 'MS4', nom_fr: 'x', nom_nl: 'x' });
  assert.equal(r.body.code, 'MODULE_DISABLED');
});

test('Patrimoine éteint : outils MCP d’écriture retirés de la liste et refusés à l’appel, lecture ouverte', async () => {
  const names = (await gest.mcp('tools/list', {})).body.result.tools.map((t) => t.name);
  for (const n of ['create_lieu', 'update_lieu', 'prepare_deactivate_lieu', 'confirm_deactivate_lieu', 'prepare_delete_lieu_photo']) assert.ok(!names.includes(n), n);
  assert.ok(names.includes('get_lieux_arbre'));
  assert.equal((await tool(gest, 'create_lieu', { nature: 'site', code: 'MS5', nom_fr: 'x', nom_nl: 'x' })).code, 'MODULE_DISABLED');
  assert.equal((await tool(gest, 'prepare_deactivate_lieu', { id: site.id, motif: 'x' })).code, 'MODULE_DISABLED');
  assert.ok((await tool(gest, 'get_lieux_arbre')).data.racines.length >= 1);
});

test('Patrimoine rallumé : écritures rendues, liste des outils complète ; réglage aussi par MCP', async () => {
  const on = await tool(admin, 'update_module', { code: 'patrimoine', actif: 1 });
  assert.equal(on.data.actif, true);
  assert.equal(getDb().prepare("SELECT channel FROM audit_log WHERE action = 'module.activer' ORDER BY id DESC").get().channel, 'mcp');
  assert.equal((await gest.put(`/api/lieux/${site.id}`, { nom_fr: 'Site rendu' })).status, 200);
  assert.ok((await gest.mcp('tools/list', {})).body.result.tools.some((t) => t.name === 'create_lieu'));
  assert.equal((await tool(gest, 'update_module', { code: 'patrimoine', actif: 0 })).code, 'FORBIDDEN');
  assert.equal((await tool(admin, 'get_module', { code: 'demandes' })).data.noyau, true);
});

test('réglage inchangé : aucune ligne de journal de plus', async () => {
  const n = getDb().prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action LIKE 'module.%'").get().n;
  await admin.put('/api/modules/patrimoine', { actif: 1 });
  assert.equal(getDb().prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action LIKE 'module.%'").get().n, n);
});
