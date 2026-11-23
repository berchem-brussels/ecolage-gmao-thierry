/**
 * Indisponibilités des ouvriers (0.21.0, étape 17, point 2 ; PLA-04 ; services/indisponibilites.js) : droits, motif rendu
 * au seul gestionnaire et responsable, contrôles (ouvrier, dates, demi-journée, chevauchement), suppression réelle, journal
 * sans motif, effet sur « Ouvriers proposés », cloison, MCP.
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
let resp;
let chef;
let ouvrier;
let ouvrier2;
let agent;
let gestB;
const parse = (r) => JSON.parse(r.body.result.content[0].text);
const tool = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));
const jour = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const saisir = (c, body) => c.post('/api/indisponibilites', body);
const journal = (id) => getDb().prepare("SELECT action, details_json AS d FROM audit_log WHERE entity_type = 'indisponibilite' AND entity_id = ? ORDER BY id").all(id)
  .map((x) => ({ action: x.action, ...JSON.parse(x.d) }));

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  gest = await person(srv.base, admin, 'gest.in@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  resp = await person(srv.base, admin, 'resp.in@exemple.test', ea.id, [[ea.id, 'responsable']]);
  chef = await person(srv.base, admin, 'chef.in@exemple.test', ea.id, [[ea.id, 'chef_equipe']]);
  ouvrier = await person(srv.base, admin, 'ouvrier.in@exemple.test', ea.id, [[ea.id, 'ouvrier']]);
  ouvrier2 = await person(srv.base, admin, 'ouvrier2.in@exemple.test', ea.id, [[ea.id, 'ouvrier']]);
  agent = await person(srv.base, admin, 'agent.in@exemple.test', ea.id);
  gestB = await person(srv.base, admin, 'gest.inb@exemple.test', eb.id, [[eb.id, 'gestionnaire']]);
});
after(() => srv.stop());

test('saisie par le gestionnaire ; motif lu par le gestionnaire et le responsable, jamais par le chef d’équipe ; ouvrier et agent refusés', async () => {
  const r = await saisir(gest, { user_id: ouvrier.id, du: jour(10), au: jour(12), motif: 'conge' });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.deepEqual([r.body.data.du, r.body.data.au, r.body.data.periode, r.body.data.motif], [jour(10), jour(12), 'journee', 'conge']);
  const id = r.body.data.id;
  assert.equal((await resp.get(`/api/indisponibilites/${id}`)).body.data.motif, 'conge');
  const c = await chef.get(`/api/indisponibilites?user_id=${ouvrier.id}`);
  assert.equal(c.status, 200);
  assert.equal(c.body.data.length, 1);
  assert.ok(!('motif' in c.body.data[0]), 'le chef d’équipe ne lit jamais la cause (PLA-04)');
  assert.equal((await chef.post('/api/indisponibilites', { user_id: ouvrier2.id, du: jour(3), motif: 'autre' })).status, 403, 'le chef ne saisit pas');
  assert.equal((await ouvrier.get('/api/indisponibilites')).status, 403);
  assert.equal((await agent.get('/api/indisponibilites')).status, 403);
  // Un seul jour : au vaut du.
  const un = await saisir(resp, { user_id: ouvrier2.id, du: jour(5), motif: 'formation' });
  assert.equal(un.body.data.au, jour(5));
});

test('contrôles : ouvrier de l’entité, dates dans l’ordre, un an au plus, demi-journée sur un jour, chevauchement', async () => {
  assert.equal((await saisir(gest, { user_id: agent.id, du: jour(20), motif: 'conge' })).body.code, 'OUVRIER_INVALIDE', 'un agent n’est pas un ouvrier');
  assert.equal((await saisir(gest, { user_id: ouvrier.id, du: jour(22), au: jour(21), motif: 'conge' })).body.code, 'INDISPO_DATES');
  assert.equal((await saisir(gest, { user_id: ouvrier.id, du: jour(30), au: jour(30 + 366), motif: 'conge' })).body.code, 'INDISPO_TROP_LONGUE');
  assert.equal((await saisir(gest, { user_id: ouvrier.id, du: jour(30), au: jour(31), periode: 'matin', motif: 'formation' })).body.code, 'INDISPO_DEMI_JOUR');
  assert.equal((await saisir(gest, { user_id: ouvrier.id, du: jour(30), motif: 'malade' })).status, 400, 'motif hors liste refusé (aucun texte libre)');
  assert.equal((await saisir(gest, { user_id: ouvrier.id, du: jour(11), motif: 'autre' })).body.code, 'INDISPO_CHEVAUCHEMENT', 'déjà en congé (test précédent)');
  const matin = await saisir(gest, { user_id: ouvrier.id, du: jour(40), periode: 'matin', motif: 'formation' });
  assert.equal(matin.status, 201);
  assert.equal((await saisir(gest, { user_id: ouvrier.id, du: jour(40), periode: 'apres_midi', motif: 'autre' })).status, 201, 'matin et après-midi ne se chevauchent pas');
  assert.equal((await saisir(gest, { user_id: ouvrier.id, du: jour(40), periode: 'matin', motif: 'autre' })).body.code, 'INDISPO_CHEVAUCHEMENT');
  assert.equal((await saisir(gest, { user_id: ouvrier.id, du: jour(39), au: jour(41), motif: 'conge' })).body.code, 'INDISPO_CHEVAUCHEMENT', 'journée sur une demi-journée');
  // Modification : mêmes contrôles, la période elle-même exclue.
  assert.equal((await gest.put(`/api/indisponibilites/${matin.body.data.id}`, { periode: 'journee' })).body.code, 'INDISPO_CHEVAUCHEMENT');
  assert.equal((await gest.put(`/api/indisponibilites/${matin.body.data.id}`, { motif: 'conge' })).status, 200);
});

test('journal : création, modification, suppression réelle ; ouvrier nommé, jamais le motif', async () => {
  const r = await saisir(gest, { user_id: ouvrier2.id, du: jour(50), au: jour(51), motif: 'conge' });
  const id = r.body.data.id;
  const m = await gest.put(`/api/indisponibilites/${id}`, { au: jour(52), motif: 'formation' });
  assert.equal(m.body.data.au, jour(52));
  assert.equal((await gest.del(`/api/indisponibilites/${id}`)).status, 200);
  assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM indisponibilites WHERE id = ?').get(id).n, 0, 'suppression réelle');
  assert.equal((await gest.get(`/api/indisponibilites/${id}`)).status, 404);
  const j = journal(id);
  assert.deepEqual(j.map((x) => x.action), ['indisponibilite.create', 'indisponibilite.update', 'indisponibilite.delete']);
  assert.equal(j[0].ouvrier_id, ouvrier2.id);
  assert.deepEqual([j[1].avant, j[1].apres, j[1].motif_change], [{ au: jour(51) }, { au: jour(52) }, 1]);
  assert.ok(!/conge|formation|autre/.test(JSON.stringify(j)), 'jamais le motif au journal');
  const noms = (await admin.get('/api/audit?action=indisponibilite.create&limit=5')).body.data.find((x) => x.entity_id === id).noms;
  assert.ok(Object.values(noms || {}).some((n) => n.type === 'personne' && n.id === ouvrier2.id), JSON.stringify(noms));
});

test('« Ouvriers proposés » : indisponible la journée → non disponible ; demi-journée dite sans changer la disponibilité ; jamais le motif', async () => {
  const lieu = (await gest.post('/api/lieux', { nature: 'site', code: 'IN', nom_fr: 'Site', nom_nl: 'Site' })).body.data.id;
  const categorie = (await agent.get('/api/categories?niveau=nature&q=eclairage')).body.data[0];
  const d = (await agent.post('/api/demandes', { lieu_id: lieu, categorie_id: categorie.id, description: 'La lampe du couloir ne s’allume plus.' })).body.data;
  const t = (await gest.post(`/api/demandes/${d.id}/taches`, { titre: 'Remplacer le luminaire' })).body.data;
  // Prochain jour ouvré de l'entité (lundi à vendredi hors fériés et congés livrés), dans les 14 jours.
  let j = null;
  for (let n = 60; n < 74 && !j; n += 1) {
    const s = await gest.get(`/api/taches/${t.id}/suggestions?date=${jour(n)}`);
    if (s.body.data.jour_ouvre_entite) j = jour(n);
  }
  assert.ok(j);
  const avant = (await gest.get(`/api/taches/${t.id}/suggestions?date=${j}`)).body.data.ouvriers;
  assert.equal(avant.find((o) => o.id === ouvrier.id).disponible, 1);
  assert.equal(avant.find((o) => o.id === ouvrier.id).indisponible, null);
  await saisir(gest, { user_id: ouvrier.id, du: j, motif: 'conge' });
  await saisir(gest, { user_id: ouvrier2.id, du: j, periode: 'apres_midi', motif: 'formation' });
  const s = await gest.get(`/api/taches/${t.id}/suggestions?date=${j}`);
  const o1 = s.body.data.ouvriers.find((o) => o.id === ouvrier.id);
  const o2 = s.body.data.ouvriers.find((o) => o.id === ouvrier2.id);
  assert.deepEqual([o1.disponible, o1.indisponible], [0, 'journee']);
  assert.deepEqual([o2.disponible, o2.indisponible], [1, 'apres_midi']);
  assert.ok(!/conge|formation/.test(JSON.stringify(s.body.data)), 'jamais le motif dans la suggestion');
  // Matin et après-midi pris : la journée entière.
  await saisir(gest, { user_id: ouvrier2.id, du: j, periode: 'matin', motif: 'autre' });
  const o2b = (await gest.get(`/api/taches/${t.id}/suggestions?date=${j}`)).body.data.ouvriers.find((o) => o.id === ouvrier2.id);
  assert.deepEqual([o2b.disponible, o2b.indisponible], [0, 'journee']);
});

test('cloison : une autre entité ne lit, ne modifie ni ne supprime ; un ouvrier d’une autre entité est refusé', async () => {
  const r = await saisir(gest, { user_id: ouvrier2.id, du: jour(80), motif: 'conge' });
  const id = r.body.data.id;
  assert.equal((await gestB.get(`/api/indisponibilites/${id}`)).status, 403);
  assert.equal((await gestB.put(`/api/indisponibilites/${id}`, { motif: 'autre' })).status, 403);
  assert.equal((await gestB.del(`/api/indisponibilites/${id}`)).status, 403);
  assert.ok(!(await gestB.get('/api/indisponibilites')).body.data.some((x) => x.id === id));
  assert.equal((await saisir(gestB, { user_id: ouvrier.id, du: jour(80), motif: 'conge' })).body.code, 'OUVRIER_INVALIDE');
  assert.equal((await gest.get('/api/indisponibilites/999999')).status, 404);
});

test('MCP : liste, saisie, modification ; suppression en deux appels, rien d’écrit à la préparation', async () => {
  const c = await tool(gest, 'create_indisponibilite', { user_id: ouvrier2.id, du: jour(90), au: jour(91), motif: 'formation' });
  assert.equal(c.data.motif, 'formation');
  assert.equal(getDb().prepare("SELECT channel FROM audit_log WHERE action = 'indisponibilite.create' AND entity_id = ?").get(c.data.id).channel, 'mcp');
  assert.ok((await tool(gest, 'list_indisponibilites', { user_id: ouvrier2.id, du: jour(90) })).data.rows.some((x) => x.id === c.data.id));
  assert.ok(!('motif' in (await tool(chef, 'get_indisponibilite', { id: c.data.id })).data), 'le chef ne lit pas le motif par le MCP');
  assert.equal((await tool(gest, 'update_indisponibilite', { id: c.data.id, au: jour(92) })).data.au, jour(92));
  const p = await tool(gest, 'prepare_delete_indisponibilite', { id: c.data.id });
  assert.equal(p.data.definitif, true);
  assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM indisponibilites WHERE id = ?').get(c.data.id).n, 1);
  await tool(gest, 'confirm_delete_indisponibilite', { confirmation_token: p.data.confirmation_token });
  assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM indisponibilites WHERE id = ?').get(c.data.id).n, 0);
  assert.equal((await tool(gestB, 'get_indisponibilite', { id: c.data.id })).code, 'NOT_FOUND');
});
