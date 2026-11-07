/**
 * Tickets (standard, section 13.5 ; 0.11.0). Les sept tests des tickets du gabarit 1.3.0 sont repris, adaptés à
 * l'installation de la GMAO (setup, comptes rattachés à une entité) ; la FAQ locale du gabarit vient avec l'aide (0.12.0).
 * Ajoutés pour la GMAO (DV-97, DV-107) : files par entité, personne habilitée dans les deux entités, affectation,
 * question sans entité active, réglages des files dans les paramètres de l'instance, journal.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, client, setup, person } = require('./helpers');
const { getDb } = require('../src/database');
const ticketsService = require('../src/services/tickets');

let srv; let admin; let ea; let eb; let a1; let a2; let respA; let respB; let multi;
const { png, jpeg } = require('./fixtures');
// GMAO : une vraie image (fixtures.js), la capture étant parcourue et nettoyée par cleanPhoto ; le gabarit envoyait la seule signature PNG.
const PNG = 'data:image/png;base64,' + png().toString('base64');

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  a1 = await person(srv.base, admin, 'a1@exemple.test', ea.id);
  a2 = await person(srv.base, admin, 'a2@exemple.test', ea.id);
  respA = await person(srv.base, admin, 'resp.a@exemple.test', ea.id, [[ea.id, 'responsable']]);
  respB = await person(srv.base, admin, 'resp.b@exemple.test', eb.id, [[eb.id, 'gestionnaire']]);
  multi = await person(srv.base, admin, 'multi.t@exemple.test', ea.id, [[ea.id, 'responsable'], [eb.id, 'responsable']]);
});
after(() => srv.stop());

// Tests du gabarit 1.3.0

test('signalement : référence annuelle, file, priorité ITIL, contexte et capture contrôlée', async () => {
  const r = await a1.post('/api/tickets', { type: 'incident', title: 'Écran figé', impact: 'person', urgency: 'blocking', screen: 'demandes', context: { path: '/demandes', version: '0.11.0', lastError: null }, screenshot: PNG });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.match(r.body.data.reference, /^TCK-\d{4}-00001$/);
  assert.equal(r.body.data.queue, 'it');
  assert.equal(r.body.data.priority, 'P3');
  assert.equal(r.body.data.has_screenshot, true);
  assert.equal(r.body.data.screenshot, undefined);
  assert.equal(r.body.data.entite_id, ea.id);
  const q = await a1.post('/api/tickets', { type: 'question', title: 'Comment annuler ?', impact: 'organisation', urgency: 'blocking' });
  assert.equal(q.body.data.queue, 'business');
  assert.equal(q.body.data.priority, 'P1');
  const faux = await a1.post('/api/tickets', { type: 'bug', title: 'x', screenshot: 'data:image/png;base64,' + Buffer.from('pas une image').toString('base64') });
  assert.equal(faux.status, 400);
});

test('un agent ne voit ni ne lit le ticket d’un autre', async () => {
  const id = (await a1.post('/api/tickets', { type: 'bug', title: 'Privé' })).body.data.id;
  assert.equal((await a2.get(`/api/tickets/${id}`)).status, 403);
  assert.equal((await a2.get(`/api/tickets/${id}/screenshot`)).status, 403);
  assert.ok(!(await a2.get('/api/tickets')).body.data.some((t) => t.id === id));
  assert.ok((await admin.get('/api/tickets')).body.data.some((t) => t.id === id));
});

test('cycle de vie : prise en charge, attente motivée, réponse, note interne, résolution, clôture', async () => {
  const id = (await a1.post('/api/tickets', { type: 'incident', title: 'Cycle' })).body.data.id;
  assert.equal((await a1.post(`/api/tickets/${id}/status`, { to: 'in_progress' })).status, 403);
  const p = await admin.post(`/api/tickets/${id}/status`, { to: 'in_progress' });
  assert.equal(p.body.data.status, 'in_progress');
  assert.ok(p.body.data.assignee_id);
  assert.equal((await admin.post(`/api/tickets/${id}/status`, { to: 'waiting_requester' })).body.code, 'REASON_REQUIRED');
  assert.equal((await admin.post(`/api/tickets/${id}/status`, { to: 'waiting_requester', reason: 'Quel écran ?' })).body.data.status, 'waiting_requester');
  assert.equal((await a1.post(`/api/tickets/${id}/messages`, { body: 'La liste des demandes' })).body.data.status, 'in_progress');
  await admin.post(`/api/tickets/${id}/messages`, { body: 'Note pour l’équipe', is_internal: true });
  assert.equal((await a1.post(`/api/tickets/${id}/messages`, { body: 'x', is_internal: true })).status, 403);
  const vu = (await a1.get(`/api/tickets/${id}`)).body.data.messages;
  assert.ok(!vu.some((m) => m.body === 'Note pour l’équipe'), 'note interne invisible du demandeur');
  assert.ok((await admin.get(`/api/tickets/${id}`)).body.data.messages.some((m) => m.is_internal === 1));
  assert.equal((await admin.post(`/api/tickets/${id}/status`, { to: 'resolved', reason: 'Corrigé' })).body.data.status, 'resolved');
  assert.equal((await a1.post(`/api/tickets/${id}/status`, { to: 'closed' })).body.data.status, 'closed');
  assert.equal((await a1.post(`/api/tickets/${id}/messages`, { body: 'encore' })).status, 409);
  assert.equal((await admin.post(`/api/tickets/${id}/status`, { to: 'in_progress' })).status, 409);
});

test('réouverture par le demandeur avec motif ; annulation motivée', async () => {
  const id = (await a1.post('/api/tickets', { type: 'bug', title: 'Rouvrir' })).body.data.id;
  await admin.post(`/api/tickets/${id}/status`, { to: 'resolved', reason: 'Fait' });
  assert.equal((await a1.post(`/api/tickets/${id}/status`, { to: 'reopen' })).body.code, 'REASON_REQUIRED');
  assert.equal((await a1.post(`/api/tickets/${id}/status`, { to: 'reopen', reason: 'Toujours là' })).body.data.status, 'in_progress');
  assert.equal((await a1.post(`/api/tickets/${id}/status`, { to: 'cancelled', reason: 'Doublon' })).body.data.status, 'cancelled');
});

test('traitement : priorité imposée avec motif, transfert de file ; demandeur limité à son contenu tant que nouveau', async () => {
  const id = (await a1.post('/api/tickets', { type: 'wish', title: 'Export Excel' })).body.data.id;
  assert.equal((await a1.put(`/api/tickets/${id}`, { priority: 'P1' })).status, 403);
  assert.equal((await a1.put(`/api/tickets/${id}`, { title: 'Export Excel des demandes' })).status, 200);
  assert.equal((await admin.put(`/api/tickets/${id}`, { priority: 'P1' })).body.code, 'REASON_REQUIRED');
  assert.equal((await admin.put(`/api/tickets/${id}`, { priority: 'P1', reason: 'Demande de la direction' })).body.data.priority, 'P1');
  // GMAO : transféré à la file métier, le ticket passe au service technique de son entité ; l'administrateur, qui n'est
  // pas de cette file, reçoit la confirmation du transfert sans le contenu du ticket.
  const tr = await admin.put(`/api/tickets/${id}`, { queue: 'business', reason: 'Question de fonctionnement' });
  assert.equal(tr.status, 200, JSON.stringify(tr.body));
  assert.deepEqual(tr.body.data, { id, reference: tr.body.data.reference, queue: 'business', transferred: true });
  assert.equal((await respA.get(`/api/tickets/${id}`)).status, 200);
  assert.equal((await respB.get(`/api/tickets/${id}`)).status, 403);
});

test('pilotage et tickets à traiter réservés aux traitants ; capture servie au demandeur', async () => {
  assert.equal((await a1.get('/api/tickets/stats')).status, 403);
  const s = await admin.get('/api/tickets/stats');
  assert.ok(s.body.data.open >= 1);
  assert.ok(Array.isArray(s.body.data.by_type));
  assert.ok((await admin.get('/api/tickets/to-handle')).body.data.length >= 1);
  assert.deepEqual((await a1.get('/api/tickets/to-handle')).body.data, []);
  const id = (await a1.get('/api/tickets')).body.data.find((t) => t.has_screenshot).id;
  const res = await fetch(`${srv.base}/api/tickets/${id}/screenshot`, { headers: { Cookie: a1.cookie } });
  assert.equal(res.headers.get('content-type'), 'image/png');
});

test('MCP : tickets à traiter de l’application pour Claude', async () => {
  const r = await admin.mcp('tools/call', { name: 'list_tickets_to_handle', arguments: {} });
  const data = JSON.parse(r.body.result.content[0].text).data;
  assert.ok(data.length >= 1);
  assert.ok('context_json' in data[0]);
});

// Ajouts de la GMAO (DV-97, DV-107)

const mcp = async (c, name, args = {}) => JSON.parse((await c.mcp('tools/call', { name, arguments: args })).body.result.content[0].text);

test('files par entité : la question métier va au service technique de l’entité du demandeur, pas à l’autre ni à l’administrateur', async () => {
  const qa = (await a2.post('/api/tickets', { type: 'question', title: 'Question de AA' })).body.data;
  const agentB = await person(srv.base, admin, 'agent.b@exemple.test', eb.id);
  const qb = (await agentB.post('/api/tickets', { type: 'question', title: 'Question de BB' })).body.data;
  assert.equal(qa.entite_id, ea.id);
  assert.equal(qb.entite_id, eb.id);
  assert.equal((await respA.get(`/api/tickets/${qa.id}`)).status, 200);
  assert.equal((await respA.get(`/api/tickets/${qb.id}`)).status, 403);
  assert.equal((await respB.get(`/api/tickets/${qb.id}`)).status, 200);
  assert.equal((await respB.get(`/api/tickets/${qa.id}`)).status, 403);
  assert.equal((await admin.get(`/api/tickets/${qa.id}`)).status, 403, 'question métier hors de la file de l’administrateur');
  const listeA = (await respA.get('/api/tickets?limit=200')).body.data;
  assert.ok(listeA.some((t) => t.id === qa.id) && !listeA.some((t) => t.id === qb.id));
  assert.ok(listeA.every((t) => t.queue === 'business' && t.entite_id === ea.id), 'ni incident, ni bug, ni souhait, ni autre entité');
  assert.ok((await respB.get('/api/tickets/to-handle')).body.data.every((t) => t.entite_id === eb.id));
  const aTraiter = (await mcp(respA, 'list_tickets_to_handle')).data;
  assert.ok(aTraiter.some((t) => t.id === qa.id) && aTraiter.every((t) => t.entite_id === ea.id));
  assert.equal((await mcp(respA, 'get_ticket', { id: qb.id })).code, 'FORBIDDEN');
  assert.equal((await respA.post(`/api/tickets/${qb.id}/status`, { to: 'in_progress' })).status, 403);
  assert.equal((await respA.post(`/api/tickets/${qb.id}/messages`, { body: 'Intrus' })).status, 403);
  assert.equal((await respA.put(`/api/tickets/${qb.id}`, { priority: 'P1', reason: 'Intrus' })).status, 403);
  const b = (await respB.get(`/api/tickets/${qb.id}`)).body.data;
  assert.equal(b.status, 'new');
  assert.equal(b.priority, 'P4');
  assert.equal(b.messages.filter((m) => m.kind === 'message').length, 0);
  // Incidents, bugs et souhaits : l'administrateur, pour les deux entités.
  const ib = (await agentB.post('/api/tickets', { type: 'incident', title: 'Incident de BB' })).body.data;
  assert.equal((await admin.get(`/api/tickets/${ib.id}`)).status, 200);
  assert.equal((await respB.get(`/api/tickets/${ib.id}`)).status, 403);
  // Pilotage du traitant limité à sa file et à son entité.
  const sb = (await respB.get('/api/tickets/stats')).body.data;
  const ouvertsB = getDb().prepare("SELECT COUNT(*) AS n FROM tickets WHERE queue = 'business' AND entite_id = ? AND status IN ('new', 'in_progress', 'waiting_requester')").get(eb.id).n;
  assert.equal(sb.open, ouvertsB);
});

test('personne habilitée dans les deux entités : elle traite les questions de l’entité active seulement (DV-107)', async () => {
  const agentB = await person(srv.base, admin, 'agent.b2@exemple.test', eb.id);
  const qa = (await a1.post('/api/tickets', { type: 'question', title: 'Multi AA' })).body.data;
  const qb = (await agentB.post('/api/tickets', { type: 'question', title: 'Multi BB' })).body.data;
  await multi.put('/api/auth/entite', { entite_id: ea.id });
  assert.equal((await multi.get(`/api/tickets/${qa.id}`)).status, 200);
  assert.equal((await multi.get(`/api/tickets/${qb.id}`)).status, 403, 'rôle dans BB, mais AA active');
  await multi.put('/api/auth/entite', { entite_id: eb.id });
  assert.equal((await multi.get(`/api/tickets/${qb.id}`)).status, 200);
  assert.equal((await multi.get(`/api/tickets/${qa.id}`)).status, 403);
  // Ses propres tickets restent lisibles quelle que soit l'entité active.
  const sien = (await multi.post('/api/tickets', { type: 'bug', title: 'Mon bug' })).body.data;
  await multi.put('/api/auth/entite', { entite_id: ea.id });
  assert.equal((await multi.get(`/api/tickets/${sien.id}`)).status, 200);
});

test('affectation : seulement à une personne qui traite la file dans l’entité du ticket', async () => {
  const q = (await a1.post('/api/tickets', { type: 'question', title: 'À affecter' })).body.data;
  const r = await respA.put(`/api/tickets/${q.id}`, { assignee_id: respB.id });
  assert.equal(r.status, 409);
  assert.equal(r.body.code, 'ASSIGNEE_INVALIDE');
  assert.equal((await respA.put(`/api/tickets/${q.id}`, { assignee_id: a2.id })).body.code, 'ASSIGNEE_INVALIDE', 'un demandeur ne traite pas');
  assert.equal((await respA.put(`/api/tickets/${q.id}`, { assignee_id: multi.id })).body.data.assignee_id, multi.id);
  const i = (await a1.post('/api/tickets', { type: 'incident', title: 'Incident à affecter' })).body.data;
  assert.equal((await admin.put(`/api/tickets/${i.id}`, { assignee_id: respA.id })).body.code, 'ASSIGNEE_INVALIDE');
  const adminId = getDb().prepare("SELECT id FROM users WHERE email = 'admin@exemple.test'").get().id;
  assert.equal((await admin.put(`/api/tickets/${i.id}`, { assignee_id: adminId })).body.data.assignee_id, adminId);
});

test('question métier sans entité active, transfert vers la file métier d’un ticket sans entité : refusés (NO_ENTITE)', () => {
  const adminId = getDb().prepare("SELECT id FROM users WHERE email = 'admin@exemple.test'").get().id;
  const sansEntite = { id: adminId, role: 'admin', entiteId: null, roles: [] };
  assert.throws(() => ticketsService.create(sansEntite, { type: 'question', title: 'Sans entité' }), (e) => e.code === 'NO_ENTITE');
  const t = ticketsService.create(sansEntite, { type: 'bug', title: 'Bug sans entité' });
  assert.equal(t.entite_id, null);
  assert.equal(t.queue, 'it');
  assert.throws(() => ticketsService.update(sansEntite, t.id, { queue: 'business', reason: 'Vers le métier' }), (e) => e.code === 'NO_ENTITE');
});

test('files réglées dans les paramètres de l’instance : rôles connus seulement, effet immédiat, jamais servis sans session', async () => {
  const bad = await admin.put('/api/parametres/tickets.business_roles', { valeur: 'responsable,chef_inconnu' });
  assert.equal(bad.status, 400);
  assert.equal((await admin.put('/api/parametres/tickets.reopen_days', { valeur: '0' })).status, 400);
  assert.equal((await admin.put('/api/parametres/tickets.sla_json', { valeur: '{"P1":[8,1],"P2":[4,24],"P3":[8,72],"P4":[24,240]}' })).status, 400);
  assert.equal((await respA.put('/api/parametres/tickets.business_roles', { valeur: 'agent' })).status, 403);
  const q = (await a1.post('/api/tickets', { type: 'question', title: 'Réglage des files' })).body.data;
  const resp = await person(srv.base, admin, 'gest.a2@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  assert.equal((await resp.get(`/api/tickets/${q.id}`)).status, 200, 'gestionnaire dans la file métier livrée');
  const ok = await admin.put('/api/parametres/tickets.business_roles', { valeur: ' responsable , responsable ' });
  assert.equal(ok.body.data.valeur, 'responsable');
  assert.equal((await resp.get(`/api/tickets/${q.id}`)).status, 403, 'gestionnaire retiré de la file');
  assert.equal((await respA.get(`/api/tickets/${q.id}`)).status, 200);
  assert.equal((await admin.del('/api/parametres/tickets.business_roles', {})).body.data.valeur, 'responsable,gestionnaire');
  assert.equal((await resp.get(`/api/tickets/${q.id}`)).status, 200);
  const pub = await client(srv.base).get('/api/settings/public');
  assert.doesNotMatch(JSON.stringify(pub.body), /business_roles|sla_json|tickets/);
});

test('capture : métadonnées retirées (EXIF, GPS, commentaire), image mal formée refusée (RGPD-01)', async () => {
  const brut = jpeg();
  assert.match(brut.toString('latin1'), /GPS-50\.8566/);
  const r = await a1.post('/api/tickets', { type: 'bug', title: 'Avec photo', screenshot: 'data:image/jpeg;base64,' + brut.toString('base64') });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const res = await fetch(`${srv.base}/api/tickets/${r.body.data.id}/screenshot`, { headers: { Cookie: a1.cookie } });
  assert.equal(res.headers.get('content-type'), 'image/jpeg');
  const servi = Buffer.from(await res.arrayBuffer());
  assert.doesNotMatch(servi.toString('latin1'), /GPS|APPAREIL|COMMENTAIRE-SECRET/);
  assert.equal(servi[0], 0xff);
  const tronque = brut.subarray(0, 40);
  assert.equal((await a1.post('/api/tickets', { type: 'bug', title: 'Tronquée', screenshot: 'data:image/jpeg;base64,' + tronque.toString('base64') })).status, 400);
  const enBase = getDb().prepare('SELECT screenshot FROM tickets WHERE id = ?').get(r.body.data.id).screenshot;
  assert.doesNotMatch(Buffer.from(enBase.split(',')[1], 'base64').toString('latin1'), /GPS/);
  assert.equal((await a2.get(`/api/tickets/${r.body.data.id}/screenshot`)).status, 403);
  assert.equal((await fetch(`${srv.base}/api/tickets/${r.body.data.id}/screenshot`)).status, 401, 'jamais sans session');
});

test('journal d’audit : chaque action d’un ticket porte l’entité du ticket, sans le texte du ticket', async () => {
  const q = (await a1.post('/api/tickets', { type: 'question', title: 'Texte confidentiel du titre' })).body.data;
  await respA.post(`/api/tickets/${q.id}/status`, { to: 'in_progress' });
  const lignes = getDb().prepare("SELECT action, entite_id, details_json FROM audit_log WHERE entity_type = 'ticket' AND entity_id = ? ORDER BY id").all(q.id);
  assert.deepEqual(lignes.map((l) => l.action), ['ticket.create', 'ticket.in_progress']);
  assert.ok(lignes.every((l) => l.entite_id === ea.id));
  assert.ok(lignes.every((l) => !/confidentiel/.test(l.details_json || '')));
});

// 0.12.0, remarques de la recette de la 0.11.0 (DV-109).
test('R3 : code de rôle reconnu quelle que soit la casse, enregistré tel que le catalogue l’écrit', async () => {
  const r = await admin.put('/api/parametres/tickets.it_roles', { valeur: 'Admin' });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.valeur, 'admin');
  const m = await admin.put('/api/parametres/tickets.business_roles', { valeur: 'RESPONSABLE, Gestionnaire, responsable' });
  assert.equal(m.body.data.valeur, 'responsable,gestionnaire');
  const p = (await admin.get('/api/parametres/tickets.it_roles')).body.data;
  assert.match(p.description_fr, /majuscules et minuscules indifférentes/);
  assert.match(p.description_nl, /hoofd- en kleine letters maken niet uit/);
  await admin.del('/api/parametres/tickets.business_roles', {});
  await admin.del('/api/parametres/tickets.it_roles', {});
});

test('R2 : refus d’un réglage de l’instance qui nomme le réglage et la valeur fautive', async () => {
  const r = await admin.put('/api/parametres/tickets.it_roles', { valeur: 'admin, Chef' });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'VALIDATION');
  assert.match(r.body.message, /^Valeur refusée pour « Rôles qui traitent les incidents, bugs et souhaits » : rôle inconnu « Chef » ; codes connus : agent, .*admin\.$/);
  assert.equal((await admin.put('/api/parametres/tickets.reopen_days', { valeur: '400' })).body.message,
    "Valeur refusée pour « Délai de réouverture d'un ticket résolu (jours) » : « 400 » n'est pas un nombre de 1 à 365.");
  assert.match((await admin.put('/api/parametres/tickets.sla_json', { valeur: '{P1' })).body.message, /texte illisible/);
  assert.match((await admin.put('/api/parametres/app.default_lang', { valeur: 'de' })).body.message, /choix permis : fr, nl/);
  assert.equal((await admin.get('/api/parametres/tickets.it_roles')).body.data.valeur, 'admin', 'rien enregistré');
});

test('R6 : le profil dit quelles files la personne traite ; un agent sans file n’en a aucune', async () => {
  assert.deepEqual((await a1.get('/api/auth/me')).body.data.files_tickets, []);
  assert.deepEqual((await respA.get('/api/auth/me')).body.data.files_tickets, ['business']);
  assert.deepEqual((await admin.get('/api/auth/me')).body.data.files_tickets, ['it']);
  assert.equal((await a1.get('/api/tickets/stats')).status, 403, 'le refus du serveur reste en place');
});
