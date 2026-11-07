/**
 * FAQ locale (standard, sections 13.1 et 13.5 ; 0.12.0, migration 011_faq) : entrées communes (administrateur) et
 * d'entité (service technique de l'entité), lecture cloisonnée, désactivation avec motif et réactivation, journal,
 * question métier résolue transformée en entrée, outils MCP.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { getDb } = require('../src/database');

let srv;
let admin;
let ea;
let eb;
let agentA;
let agentB;
let respA;
let gestA;
let respB;
const parse = (r) => JSON.parse(r.body.result.content[0].text);
const tool = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));
const entree = (extra = {}) => ({ question_fr: 'Comment suivre ma demande ?', question_nl: 'Hoe volg ik mijn aanvraag?', answer_fr: 'Menu Mes demandes.', answer_nl: 'Menu Mijn aanvragen.', ...extra });

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  agentA = await person(srv.base, admin, 'faq.agent.a@exemple.test', ea.id);
  agentB = await person(srv.base, admin, 'faq.agent.b@exemple.test', eb.id);
  respA = await person(srv.base, admin, 'faq.resp.a@exemple.test', ea.id, [[ea.id, 'responsable']]);
  gestA = await person(srv.base, admin, 'faq.gest.a@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  respB = await person(srv.base, admin, 'faq.resp.b@exemple.test', eb.id, [[eb.id, 'responsable']]);
});
after(() => srv.stop());

test('migration 011_faq appliquée : table help_faq avec entité, ticket d’origine et motif', () => {
  const cols = getDb().prepare('PRAGMA table_info(help_faq)').all().map((c) => c.name);
  for (const c of ['entite_id', 'topic_id', 'question_fr', 'question_nl', 'answer_fr', 'answer_nl', 'source_ticket_id', 'is_active', 'motif_desactivation']) assert.ok(cols.includes(c), c);
  assert.ok(getDb().prepare("SELECT 1 FROM schema_migrations WHERE name = '011_faq'").get());
});

test('création : commune par l’administrateur seul, d’entité par le service technique de l’entité active, jamais par un agent', async () => {
  assert.equal((await agentA.post('/api/faq', entree())).status, 403);
  assert.equal((await respA.post('/api/faq', entree({ portee: 'commune' }))).status, 403, 'commune : administrateur seul');
  const c = await admin.post('/api/faq', entree({ topic_id: 'demandes' }));
  assert.equal(c.status, 201, JSON.stringify(c.body));
  assert.equal(c.body.data.entite_id, null);
  const a = await respA.post('/api/faq', entree({ question_fr: 'Qui appeler pour une fuite ?', question_nl: 'Wie bellen bij een lek?', topic_id: 'nouvelle-demande' }));
  assert.equal(a.status, 201);
  assert.equal(a.body.data.entite_id, ea.id);
  assert.equal(a.body.data.entite_code, ea.code);
  assert.equal(a.body.data.can_manage, true);
  assert.equal((await gestA.post('/api/faq', entree({ portee: 'entite' }))).body.data.entite_id, ea.id, 'gestionnaire de l’entité');
  assert.equal((await admin.post('/api/faq', entree({ question_fr: '', question_nl: 'x' }))).status, 400, 'question vide refusée');
  assert.equal((await admin.post('/api/faq', entree({ topic_id: 'Écran ?' }))).status, 400, 'topic_id : identifiant d’écran');
  assert.equal((await admin.post('/api/faq', entree({ answer_fr: 'x'.repeat(4001) }))).status, 400);
});

test('lecture cloisonnée : entrées communes et de l’entité active ; celle de l’autre entité refusée (403)', async () => {
  const b = (await respB.post('/api/faq', entree({ question_fr: 'Question du centre', question_nl: 'Vraag van het centrum' }))).body.data;
  const vuA = (await agentA.get('/api/faq')).body.data;
  assert.ok(vuA.every((f) => f.entite_id === null || f.entite_id === ea.id));
  assert.ok(vuA.some((f) => f.entite_id === null) && vuA.some((f) => f.entite_id === ea.id));
  assert.ok(vuA.every((f) => f.can_manage === false), 'un agent ne gère rien');
  const vuB = (await agentB.get('/api/faq')).body.data;
  assert.ok(vuB.some((f) => f.id === b.id) && !vuB.some((f) => f.entite_id === ea.id));
  assert.equal((await agentA.get(`/api/faq/${b.id}`)).status, 403);
  assert.equal((await respA.put(`/api/faq/${b.id}`, { question_fr: 'Piraté' })).status, 403);
  assert.equal((await respA.del(`/api/faq/${b.id}`, { motif: 'Piraté' })).status, 403);
  assert.equal((await respB.get(`/api/faq/${b.id}`)).body.data.question_fr, 'Question du centre');
  const commune = vuA.find((f) => f.entite_id === null);
  assert.equal((await respA.put(`/api/faq/${commune.id}`, { answer_fr: 'Piraté' })).status, 403, 'entrée commune : administrateur seul');
  assert.equal((await agentB.get(`/api/faq/${commune.id}`)).status, 200, 'commune : lue dans les deux entités');
});

test('filtre par écran et recherche dans les questions et les réponses, FR et NL', async () => {
  const parEcran = (await agentA.get('/api/faq?topic_id=nouvelle-demande')).body.data;
  assert.ok(parEcran.length >= 1 && parEcran.every((f) => f.topic_id === 'nouvelle-demande'));
  assert.ok((await agentA.get('/api/faq?q=lek')).body.data.some((f) => f.question_nl === 'Wie bellen bij een lek?'));
  assert.ok((await agentA.get('/api/faq?q=fuite')).body.data.length >= 1);
  assert.equal((await agentA.get('/api/faq?q=100%25')).body.data.length, 0, '% pris à la lettre');
});

test('désactivation avec motif, réactivation, journal avec l’entité ; rien n’est supprimé', async () => {
  const f = (await respA.post('/api/faq', entree({ question_fr: 'À retirer', question_nl: 'In te trekken' }))).body.data;
  assert.equal((await respA.del(`/api/faq/${f.id}`, {})).status, 400, 'motif obligatoire');
  const d = await respA.del(`/api/faq/${f.id}`, { motif: 'Réponse dépassée' });
  assert.equal(d.body.data.is_active, 0);
  assert.equal(d.body.data.motif_desactivation, 'Réponse dépassée');
  assert.equal((await agentA.get(`/api/faq/${f.id}`)).status, 404, 'désactivée : invisible d’un agent');
  assert.ok(!(await agentA.get('/api/faq?inclure_inactives=1')).body.data.some((x) => x.id === f.id), 'inclure_inactives ignoré pour un agent');
  assert.ok((await respA.get('/api/faq?inclure_inactives=1')).body.data.some((x) => x.id === f.id));
  assert.equal((await respA.put(`/api/faq/${f.id}`, { answer_fr: 'x' })).status, 409, 'désactivée : réactiver d’abord');
  const r = await respA.put(`/api/faq/${f.id}`, { is_active: 1 });
  assert.equal(r.body.data.is_active, 1);
  assert.equal(r.body.data.motif_desactivation, null);
  await respA.put(`/api/faq/${f.id}`, { answer_fr: 'Nouvelle réponse' });
  const lignes = getDb().prepare("SELECT action, entite_id, details_json FROM audit_log WHERE entity_type = 'faq' AND entity_id = ? ORDER BY id").all(f.id);
  assert.deepEqual(lignes.map((l) => l.action), ['faq.create', 'faq.deactivate', 'faq.reactivate', 'faq.update']);
  assert.ok(lignes.every((l) => l.entite_id === ea.id));
  assert.deepEqual(JSON.parse(lignes[3].details_json), { avant: { answer_fr: 'Menu Mes demandes.' }, apres: { answer_fr: 'Nouvelle réponse' } });
  assert.equal((await respA.put(`/api/faq/${f.id}`, { answer_fr: 'Nouvelle réponse' })).status, 200);
  assert.equal(getDb().prepare("SELECT COUNT(*) AS n FROM audit_log WHERE entity_type = 'faq' AND entity_id = ?").get(f.id).n, 4, 'sans changement : aucune ligne');
  assert.equal((await admin.del(`/api/faq/${f.id}`, { motif: 'Administrateur' })).status, 200, 'l’administrateur gère toutes les entrées');
});

test('question métier résolue transformée en entrée de la FAQ de son entité (section 13.5)', async () => {
  const q = (await agentA.post('/api/tickets', { type: 'question', title: 'Comment annuler une demande ?' })).body.data;
  const corps = entree({ question_fr: 'Comment annuler une demande ?', question_nl: 'Hoe annuleer ik een aanvraag?', topic_id: 'mes-demandes' });
  assert.equal((await respA.post(`/api/tickets/${q.id}/faq`, corps)).body.code, 'FAQ_SOURCE', 'pas encore résolue');
  assert.equal((await respA.get(`/api/tickets/${q.id}`)).body.data.can_faq, false);
  await respA.post(`/api/tickets/${q.id}/status`, { to: 'in_progress' });
  await respA.post(`/api/tickets/${q.id}/status`, { to: 'resolved', reason: 'Expliqué par téléphone' });
  assert.equal((await respA.get(`/api/tickets/${q.id}`)).body.data.can_faq, true);
  assert.equal((await agentA.get(`/api/tickets/${q.id}`)).body.data.can_faq, false, 'le demandeur ne transforme pas');
  assert.equal((await agentA.post(`/api/tickets/${q.id}/faq`, corps)).status, 403);
  assert.equal((await respB.post(`/api/tickets/${q.id}/faq`, corps)).status, 403, 'autre entité');
  const f = await gestA.post(`/api/tickets/${q.id}/faq`, corps);
  assert.equal(f.status, 201, JSON.stringify(f.body));
  assert.equal(f.body.data.entite_id, ea.id);
  assert.equal(f.body.data.source_ticket_id, q.id);
  assert.equal(f.body.data.source_ticket_reference, q.reference);
  assert.equal((await respA.post(`/api/tickets/${q.id}/faq`, corps)).body.code, 'FAQ_DEJA');
  const t = (await respA.get(`/api/tickets/${q.id}`)).body.data;
  assert.equal(t.faq_id, f.body.data.id);
  assert.equal(t.can_faq, false);
  assert.equal(t.status, 'resolved', 'le ticket ne change pas');
  const a = getDb().prepare("SELECT entite_id, details_json FROM audit_log WHERE action = 'faq.create' AND entity_id = ?").get(f.body.data.id);
  assert.equal(a.entite_id, ea.id);
  assert.equal(JSON.parse(a.details_json).ticket, q.reference);
  // Un incident n'est pas une question métier ; un ticket clos se transforme encore.
  const inc = (await agentA.post('/api/tickets', { type: 'incident', title: 'Écran figé' })).body.data;
  await admin.post(`/api/tickets/${inc.id}/status`, { to: 'in_progress' });
  await admin.post(`/api/tickets/${inc.id}/status`, { to: 'resolved', reason: 'Corrigé' });
  assert.equal((await admin.post(`/api/tickets/${inc.id}/faq`, corps)).body.code, 'FAQ_SOURCE');
  const q2 = (await agentA.post('/api/tickets', { type: 'question', title: 'Où voir le délai ?' })).body.data;
  await respA.post(`/api/tickets/${q2.id}/status`, { to: 'in_progress' });
  await respA.post(`/api/tickets/${q2.id}/status`, { to: 'resolved', reason: 'Réponse donnée' });
  await agentA.post(`/api/tickets/${q2.id}/status`, { to: 'closed' });
  assert.equal((await respA.post(`/api/tickets/${q2.id}/faq`, entree({ question_fr: 'Où voir le délai ?' }))).status, 201, 'close : transformable');
});

test('MCP : liste, création depuis un ticket, retrait en deux appels', async () => {
  const l = await tool(agentA, 'list_faq', { topic_id: 'demandes' });
  assert.ok(l.data.rows.length >= 1);
  const q = (await agentA.post('/api/tickets', { type: 'question', title: 'Question pour le MCP' })).body.data;
  await respA.post(`/api/tickets/${q.id}/status`, { to: 'in_progress' });
  await respA.post(`/api/tickets/${q.id}/status`, { to: 'resolved', reason: 'Fait' });
  const c = await tool(respA, 'create_faq_from_ticket', { id: q.id, ...entree({ question_fr: 'Question MCP' }) });
  assert.equal(c.data.source_ticket_id, q.id);
  assert.equal((await tool(agentA, 'create_faq', entree())).code, 'FORBIDDEN');
  assert.equal((await tool(respB, 'get_faq', { id: c.data.id })).code, 'FORBIDDEN');
  assert.equal((await tool(respB, 'prepare_deactivate_faq', { id: c.data.id, motif: 'Piraté' })).code, 'FORBIDDEN');
  assert.equal((await tool(agentA, 'prepare_deactivate_faq', { id: c.data.id, motif: 'Essai' })).code, 'FORBIDDEN');
  const p = await tool(respA, 'prepare_deactivate_faq', { id: c.data.id, motif: 'Essai' });
  assert.ok(p.data.confirmation_token);
  assert.equal((await respA.get(`/api/faq/${c.data.id}`)).body.data.is_active, 1, 'rien avant la confirmation');
  const ok = await tool(respA, 'confirm_deactivate_faq', { confirmation_token: p.data.confirmation_token });
  assert.equal(ok.data.is_active, 0);
});
