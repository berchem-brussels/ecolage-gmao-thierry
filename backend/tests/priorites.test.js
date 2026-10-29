/**
 * Priorités P1 à P4 et délais par entité (cahier des charges section 8.2, PRI-01, PRI-02 ; décision D-11).
 * Valeurs livrées, décompte (P1 en heures calendaires, P2 à P4 en jours ouvrables), cohérence des délais, droits,
 * cloison par l'entité active, retour aux valeurs livrées, journal, MCP.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { getDb } = require('../src/database');

let srv;
let admin;
let ea;
let eb;
let agent;
let gest;
let resp;
let multi;

const tool = async (c, name, args) => JSON.parse((await c.mcp('tools/call', { name, arguments: args })).body.result.content[0].text);

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  agent = await person(srv.base, admin, 'p.agent@exemple.test', ea.id);
  gest = await person(srv.base, admin, 'p.gest@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  resp = await person(srv.base, admin, 'p.resp@exemple.test', ea.id, [[ea.id, 'responsable']]);
  multi = await person(srv.base, admin, 'p.multi@exemple.test', ea.id, [[ea.id, 'responsable'], [eb.id, 'responsable']]);
});
after(() => srv.stop());

test('valeurs livrées du cahier des charges, décompte validé le 22/10/2026', async () => {
  const r = await agent.get('/api/priorites');
  assert.equal(r.status, 200);
  const p = Object.fromEntries(r.body.data.map((x) => [x.code, x]));
  assert.deepEqual(r.body.data.map((x) => x.code), ['P1', 'P2', 'P3', 'P4']);
  assert.deepEqual([p.P1.unite, p.P1.prise_en_charge, p.P1.fin], ['heures_calendaires', 1, 4]);
  assert.deepEqual([p.P2.unite, p.P2.prise_en_charge, p.P2.fin], ['jours_ouvrables', 1, 2]);
  assert.deepEqual([p.P3.unite, p.P3.prise_en_charge, p.P3.fin], ['jours_ouvrables', 2, 10]);
  assert.deepEqual([p.P4.unite, p.P4.prise_en_charge, p.P4.fin], ['jours_ouvrables', 5, null], 'P4 : date convenue');
  assert.equal(p.P1.libelle_nl, 'Veiligheid');
  assert.ok(r.body.data.every((x) => x.est_defaut && x.description_fr && x.description_nl));
  for (const ent of [ea, eb]) assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM priorites WHERE entite_id = ?').get(ent.id).n, 4);
});

test('réglage réservé au responsable ; lecture pour tout rôle de l’entité', async () => {
  assert.equal((await agent.get('/api/priorites/P2')).body.data.code, 'P2');
  for (const c of [agent, gest, admin]) {
    const r = await c.put('/api/priorites/P3', { fin: 8 });
    assert.equal(r.status, 403);
    assert.equal(r.body.code, 'FORBIDDEN');
  }
  assert.equal((await gest.del('/api/priorites/P3', {})).status, 403);
  assert.equal((await agent.get('/api/priorites/P5')).body.code, 'VALIDATION');
});

test('le responsable règle les délais ; l’ancienne et la nouvelle valeur vont au journal', async () => {
  const r = await resp.put('/api/priorites/P3', { prise_en_charge: 3, fin: 8, libelle_fr: 'Normale (atelier)', couleur: 'geekblue' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.fin, 8);
  assert.equal(r.body.data.est_defaut, false);
  assert.equal(r.body.data.defaut.fin, 10);
  const a = getDb().prepare("SELECT details_json, entite_id, entity_id FROM audit_log WHERE action = 'priorite.update' ORDER BY id DESC").get();
  const d = JSON.parse(a.details_json);
  assert.deepEqual(d.avant, { prise_en_charge: 2, fin: 10, libelle_fr: 'Normale', couleur: 'blue' });
  assert.deepEqual(d.apres, { prise_en_charge: 3, fin: 8, libelle_fr: 'Normale (atelier)', couleur: 'geekblue' });
  assert.equal(a.entite_id, ea.id);
  // Même valeur renvoyée : rien n'est écrit.
  const n = getDb().prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'priorite.update'").get().n;
  await resp.put('/api/priorites/P3', { fin: 8 });
  assert.equal(getDb().prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'priorite.update'").get().n, n);
});

test('cohérence des délais : fin vide ou au moins égale à la prise en charge, bornes selon l’unité', async () => {
  const refus = async (body) => {
    const r = await resp.put('/api/priorites/P2', body);
    assert.equal(r.status, 409, JSON.stringify(body));
    assert.equal(r.body.code, 'PRIORITE_DELAIS');
  };
  await refus({ prise_en_charge: 3 }); // fin 2 < 3
  await refus({ fin: 400 }); // jours ouvrables : 365 au plus
  await refus({ unite: 'jours_ouvrables', prise_en_charge: 366, fin: null });
  assert.equal((await resp.put('/api/priorites/P2', { prise_en_charge: 0 })).body.code, 'VALIDATION');
  assert.equal((await resp.put('/api/priorites/P2', { couleur: 'rose' })).body.code, 'VALIDATION');
  assert.equal((await resp.put('/api/priorites/P2', { unite: 'semaines' })).body.code, 'VALIDATION');
  assert.equal((await resp.put('/api/priorites/P2', { code: 'P1' })).body.code, 'VALIDATION');
  const h = await resp.put('/api/priorites/P2', { unite: 'heures_ouvrables', prise_en_charge: 8, fin: 400 });
  assert.equal(h.status, 200, 'heures : 720 au plus');
  const convenue = await resp.put('/api/priorites/P2', { fin: null });
  assert.equal(convenue.body.data.fin, null);
  assert.equal((await resp.get('/api/priorites/P2')).body.data.prise_en_charge, 8);
});

test('retour aux valeurs livrées', async () => {
  const r = await resp.del('/api/priorites/P2', {});
  assert.equal(r.status, 200);
  assert.deepEqual([r.body.data.unite, r.body.data.prise_en_charge, r.body.data.fin, r.body.data.est_defaut], ['jours_ouvrables', 1, 2, true]);
  assert.ok(getDb().prepare("SELECT 1 FROM audit_log WHERE action = 'priorite.reset' AND entite_id = ?").get(ea.id));
  const n = getDb().prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'priorite.reset'").get().n;
  await resp.del('/api/priorites/P2', {});
  assert.equal(getDb().prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'priorite.reset'").get().n, n, 'déjà aux valeurs livrées');
});

test('cloison : chaque entité a ses délais ; une personne des deux entités ne règle que l’entité active', async () => {
  await multi.put('/api/auth/entite', { entite_id: eb.id });
  await multi.put('/api/priorites/P4', { prise_en_charge: 10 });
  assert.equal((await multi.get('/api/priorites/P4')).body.data.prise_en_charge, 10);
  assert.equal((await resp.get('/api/priorites/P4')).body.data.prise_en_charge, 5, 'AA inchangée');
  await multi.put('/api/auth/entite', { entite_id: ea.id });
  assert.equal((await multi.get('/api/priorites/P4')).body.data.prise_en_charge, 5);
  assert.equal((await multi.get('/api/priorites/P3')).body.data.fin, 8, 'réglage de AA vu dans AA');
  assert.ok((await tool(multi, 'list_priorites', {})).data.rows.every((p) => p.entite_id === ea.id));
});

test('MCP : lecture, réglage et retour aux valeurs livrées en deux appels, sous les droits de la personne', async () => {
  assert.equal((await tool(agent, 'get_priorite', { code: 'P1' })).data.unite, 'heures_calendaires');
  assert.equal((await tool(agent, 'update_priorite', { code: 'P1', fin: 6 })).code, 'FORBIDDEN');
  const u = await tool(resp, 'update_priorite', { code: 'P1', fin: 6 });
  assert.equal(u.data.fin, 6);
  assert.equal(getDb().prepare("SELECT channel FROM audit_log WHERE action = 'priorite.update' ORDER BY id DESC").get().channel, 'mcp');
  assert.equal((await tool(agent, 'prepare_reset_priorite', { code: 'P1' })).code, 'FORBIDDEN');
  const p = await tool(resp, 'prepare_reset_priorite', { code: 'P1' });
  assert.equal(p.data.priorite.fin, 6);
  assert.equal((await tool(resp, 'confirm_reset_priorite', { confirmation_token: p.data.confirmation_token })).data.fin, 4);
});

test('une entité créée reçoit ses quatre priorités', async () => {
  const e = (await admin.post('/api/entites', { code: 'CC', nom_fr: 'Régie', nom_nl: 'Regie' })).body.data;
  assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM priorites WHERE entite_id = ?').get(e.id).n, 4);
});
