/**
 * Planning (0.21.0, étape 17, point 3 ; PLA-03 ; services/planning.js) : droits, période, ouvriers et équipes par jour
 * (travail, indisponibilité sans motif, charge), tâches de la période, cloison, MCP, temps de réponse sur la volumétrie
 * de D-15 (hypothèse TEC-08 : 40 ouvriers, une semaine chargée).
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { getDb } = require('../src/database');

let srv;
let admin;
let ea;
let eb;
let resp;
let gest;
let chef;
let o1;
let o2;
let agent;
let gestB;
let equipe;
let equipeWE;
let demande;
let lieu;
let categorie;
const parse = (r) => JSON.parse(r.body.result.content[0].text);
const tool = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));
const ajouter = (jour, n) => new Date(Date.parse(`${jour}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
// Une semaine future fixe, du lundi au dimanche, loin des jours fériés : 2099-06-08 est un lundi.
const LUNDI = '2099-06-08';
const SAMEDI = ajouter(LUNDI, 5);
const planning = (c, q = `du=${LUNDI}&au=${ajouter(LUNDI, 6)}`) => c.get(`/api/planning?${q}`);
async function tache(titre, affectation) {
  const t = (await gest.post(`/api/demandes/${demande}/taches`, { titre, duree_estimee_min: 90 })).body.data;
  const r = await gest.put(`/api/taches/${t.id}/affectation`, affectation);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return t;
}

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  resp = await person(srv.base, admin, 'resp.pl@exemple.test', ea.id, [[ea.id, 'responsable']]);
  gest = await person(srv.base, admin, 'gest.pl@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  chef = await person(srv.base, admin, 'chef.pl@exemple.test', ea.id, [[ea.id, 'chef_equipe']]);
  o1 = await person(srv.base, admin, 'o1.pl@exemple.test', ea.id, [[ea.id, 'ouvrier']]);
  o2 = await person(srv.base, admin, 'o2.pl@exemple.test', ea.id, [[ea.id, 'ouvrier']]);
  agent = await person(srv.base, admin, 'agent.pl@exemple.test', ea.id);
  gestB = await person(srv.base, admin, 'gest.plb@exemple.test', eb.id, [[eb.id, 'gestionnaire']]);
  equipe = (await resp.post('/api/equipes', { code: 'BAT', nom_fr: 'Bâtiment', nom_nl: 'Gebouw', chef_id: chef.id, membres: [o1.id, chef.id] })).body.data.id;
  equipeWE = (await resp.post('/api/equipes', { code: 'WE', nom_fr: 'Week-end', nom_nl: 'Weekend', membres: [o2.id],
    horaire: [{ jour: 6, debut: '07:00', fin: '13:00' }, { jour: 7, debut: '07:00', fin: '13:00' }] })).body.data.id;
  lieu = (await gest.post('/api/lieux', { nature: 'site', code: 'PL', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis' })).body.data.id;
  categorie = (await agent.get('/api/categories?niveau=nature&q=eclairage')).body.data[0];
  demande = (await agent.post('/api/demandes', { lieu_id: lieu, categorie_id: categorie.id, description: 'La lampe du couloir ne s’allume plus.' })).body.data.id;
  await gest.post(`/api/demandes/${demande}/qualifier`, { categorie_id: categorie.id, lieu_id: lieu, priorite: categorie.priorite_effective || 'P3', motif_priorite: 'Essai' });
});
after(() => srv.stop());

test('droits : chef d’équipe, gestionnaire et responsable lisent ; ouvrier et demandeur refusés ; période bornée', async () => {
  for (const c of [chef, gest, resp]) assert.equal((await planning(c)).status, 200);
  assert.equal((await planning(o1)).status, 403);
  assert.equal((await planning(agent)).status, 403);
  assert.equal((await planning(gest, `du=${LUNDI}&au=${ajouter(LUNDI, 14)}`)).body.code, 'PLANNING_PERIODE', '15 jours');
  assert.equal((await planning(gest, `du=${LUNDI}&au=${ajouter(LUNDI, -1)}`)).body.code, 'PLANNING_PERIODE');
  assert.equal((await planning(gest, 'du=2099-13-01')).status, 400);
  // Par défaut : la semaine en cours, du lundi au dimanche.
  const d = (await gest.get('/api/planning')).body.data;
  assert.equal(d.jours.length, 7);
  assert.equal(d.jours[0].jour_semaine, 1);
  assert.ok(d.du <= d.aujourdhui && d.aujourdhui <= d.au);
  const j = (await planning(gest, `du=${LUNDI}`)).body.data;
  assert.deepEqual([j.du, j.au], [LUNDI, ajouter(LUNDI, 6)], 'sans « au » : sept jours');
});

test('ouvriers et équipes par jour : travail selon l’horaire, indisponibilité sans motif, charge directe et par l’équipe', async () => {
  const tEquipe = await tache('Changer les luminaires', { equipe_id: equipe, date_prevue: LUNDI, heure_debut: '08:00' });
  const tDirecte = await tache('Contrôler le tableau', { ouvriers: [o1.id], date_prevue: LUNDI });
  const tWE = await tache('Balayer la cour', { equipe_id: equipeWE, date_prevue: SAMEDI });
  const tAnnulee = await tache('Annulée', { ouvriers: [o1.id], date_prevue: LUNDI });
  await gest.post(`/api/taches/${tAnnulee.id}/etat`, { etat: 'annulee', motif: 'Inutile' });
  await gest.post('/api/indisponibilites', { user_id: o1.id, du: ajouter(LUNDI, 1), motif: 'conge' });
  await gest.post('/api/indisponibilites', { user_id: chef.id, du: LUNDI, periode: 'matin', motif: 'formation' });
  await gest.post('/api/indisponibilites', { user_id: chef.id, du: ajouter(LUNDI, 2), periode: 'matin', motif: 'formation' });
  await gest.post('/api/indisponibilites', { user_id: chef.id, du: ajouter(LUNDI, 2), periode: 'apres_midi', motif: 'autre' });
  const r = await planning(chef);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const d = r.body.data;
  assert.deepEqual(d.jours.map((j) => j.ouvre_entite), [1, 1, 1, 1, 1, 0, 0]);
  const p1 = d.ouvriers.find((o) => o.id === o1.id);
  assert.deepEqual(p1.equipes, [equipe]);
  assert.deepEqual([p1.jours[LUNDI].travaille, p1.jours[LUNDI].charge_min, p1.jours[LUNDI].nb_taches], [1, 180, 2], 'tâche de l’équipe et tâche directe, l’annulée exclue');
  assert.deepEqual([p1.jours[ajouter(LUNDI, 1)].travaille, p1.jours[ajouter(LUNDI, 1)].indisponible], [0, 'journee']);
  assert.equal(p1.jours[SAMEDI].travaille, 0);
  const pc = d.ouvriers.find((o) => o.id === chef.id);
  assert.deepEqual([pc.jours[LUNDI].travaille, pc.jours[LUNDI].indisponible, pc.jours[LUNDI].charge_min], [1, 'matin', 90]);
  assert.deepEqual([pc.jours[ajouter(LUNDI, 2)].travaille, pc.jours[ajouter(LUNDI, 2)].indisponible], [0, 'journee'], 'matin et après-midi : la journée');
  const p2 = d.ouvriers.find((o) => o.id === o2.id);
  assert.deepEqual([p2.jours[LUNDI].travaille, p2.jours[SAMEDI].travaille, p2.jours[SAMEDI].charge_min], [0, 1, 90], 'équipe du week-end');
  const qWE = d.equipes.find((q) => q.id === equipeWE);
  assert.deepEqual([qWE.horaire_propre, qWE.jours[LUNDI].travaille, qWE.jours[SAMEDI].travaille, qWE.jours[SAMEDI].nb_taches], [1, 0, 1, 1]);
  assert.deepEqual(d.equipes.find((q) => q.id === equipe).membres.sort(), [o1.id, chef.id].sort());
  // Tâches : datées dans la période, non annulées, avec la demande, le lieu et l'affectation.
  const ids = d.taches.map((t) => t.id);
  assert.ok(ids.includes(tEquipe.id) && ids.includes(tDirecte.id) && ids.includes(tWE.id) && !ids.includes(tAnnulee.id));
  const t = d.taches.find((x) => x.id === tDirecte.id);
  assert.deepEqual([t.numero.startsWith('AA-DI-'), t.lieu_code, t.ouvriers, t.equipe_id, t.date_prevue], [true, 'PL', [o1.id], null, LUNDI]);
  assert.equal(d.taches[0].id, tEquipe.id, 'triées par date puis heure');
  assert.ok(!/conge|formation/.test(JSON.stringify(d)), 'jamais le motif d’une indisponibilité');
  // Terminée : montrée, hors de la charge.
  await gest.post(`/api/taches/${tDirecte.id}/etat`, { etat: 'en_cours' });
  await gest.post(`/api/taches/${tDirecte.id}/etat`, { etat: 'terminee' });
  const apres = (await planning(gest)).body.data;
  assert.ok(apres.taches.some((x) => x.id === tDirecte.id && x.etat === 'terminee'));
  assert.equal(apres.ouvriers.find((o) => o.id === o1.id).jours[LUNDI].charge_min, 90);
});

test('cloison : une autre entité ne voit ni les ouvriers, ni les équipes, ni les tâches ; MCP aux mêmes règles', async () => {
  const b = (await planning(gestB)).body.data;
  assert.equal(b.ouvriers.length, 0);
  assert.equal(b.equipes.length, 0);
  assert.equal(b.taches.length, 0);
  const m = await tool(chef, 'get_planning', { du: LUNDI });
  assert.ok(m.data.taches.length >= 3);
  assert.equal((await tool(agent, 'get_planning', {})).code, 'FORBIDDEN');
  assert.equal((await tool(gestB, 'get_planning', { du: LUNDI })).data.taches.length, 0);
});

test('cloison des absences : l’absence d’un ouvrier des deux entités notée dans l’autre ne compte pas ici (planning, conflits, ouvriers proposés)', async () => {
  const double = await person(srv.base, admin, 'double.pl@exemple.test', ea.id, [[ea.id, 'ouvrier'], [eb.id, 'ouvrier']]);
  const jour = ajouter(LUNDI, 3);
  const rb = await gestB.post('/api/indisponibilites', { user_id: double.id, du: jour, motif: 'conge' });
  assert.equal(rb.status, 201, JSON.stringify(rb.body));
  const pd = (await planning(gest)).body.data.ouvriers.find((o) => o.id === double.id);
  assert.deepEqual([pd.jours[jour].travaille, pd.jours[jour].indisponible], [1, null]);
  const pb = (await planning(gestB)).body.data.ouvriers.find((o) => o.id === double.id);
  assert.equal(pb.jours[jour].indisponible, 'journee', 'l’absence compte dans l’entité où elle est notée');
  const t = await tache('Vérifier la chaudière', { ouvriers: [double.id], date_prevue: jour });
  const s = (await gest.get(`/api/taches/${t.id}/suggestions?date=${jour}`)).body.data.ouvriers.find((o) => o.id === double.id);
  assert.deepEqual([s.disponible, s.indisponible ?? null], [1, null]);
  const r = await gest.put(`/api/taches/${t.id}/affectation`, { ouvriers: [double.id], date_prevue: jour });
  assert.ok(!(r.body.data.conflits || []).some((c) => c.conflits.includes('absent')), JSON.stringify(r.body.data.conflits));
});

// ============================== Point 4 : conflits et tâches non planifiées (PLA-05, PLA-06) ==============================
const LUNDI2 = '2099-06-15';
async function tacheD(titre, duree, affectation, demandeId = demande) {
  const t = (await gest.post(`/api/demandes/${demandeId}/taches`, { titre, duree_estimee_min: duree })).body.data;
  const r = await gest.put(`/api/taches/${t.id}/affectation`, affectation);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return { t, r: r.body.data };
}

test('capacité et conflits par jour : trop chargé (journée et demi-journée), absent, jour non travaillé ; équipe ; sans tâche, aucun conflit', async () => {
  await tacheD('Grosse matinée', 300, { ouvriers: [o1.id], date_prevue: LUNDI2 });
  const { r } = await tacheD('Grosse après-midi', 300, { ouvriers: [o1.id], date_prevue: LUNDI2 });
  assert.deepEqual(r.conflits, [{ ouvrier_id: o1.id, prenom: r.conflits[0].prenom, nom: r.conflits[0].nom, conflits: ['trop_charge'], charge_min: 600, capacite_min: 510 }],
    'l’affectation rend le conflit sans bloquer (horaire livré : 08:00-16:30)');
  await gest.post('/api/indisponibilites', { user_id: chef.id, du: ajouter(LUNDI2, 1), periode: 'apres_midi', motif: 'formation' });
  await tacheD('Pour le chef', 300, { ouvriers: [chef.id], date_prevue: ajouter(LUNDI2, 1) });
  await gest.post('/api/indisponibilites', { user_id: chef.id, du: ajouter(LUNDI2, 2), motif: 'conge' });
  const abs = await tacheD('Le chef est absent', 60, { ouvriers: [chef.id], date_prevue: ajouter(LUNDI2, 2) });
  assert.deepEqual(abs.r.conflits.map((c) => c.conflits), [['absent']]);
  const lundi = await tacheD('Lundi pour le week-end', 60, { ouvriers: [o2.id], date_prevue: LUNDI2 });
  assert.deepEqual(lundi.r.conflits.map((c) => [c.ouvrier_id, c.conflits]), [[o2.id, ['jour_non_travaille']]]);
  const equipeLundi = await tacheD('Équipe du week-end un lundi', 60, { equipe_id: equipeWE, date_prevue: ajouter(LUNDI2, 7) });
  assert.ok(equipeLundi.r.conflits.some((c) => c.equipe_id === equipeWE && c.conflits[0] === 'jour_non_travaille'));
  const ok = await tacheD('Rien à signaler', 60, { ouvriers: [o2.id], date_prevue: ajouter(LUNDI2, 5) });
  assert.deepEqual(ok.r.conflits, [], 'samedi : équipe du week-end');
  const d = (await planning(gest, `du=${LUNDI2}`)).body.data;
  const j = (id, n) => d.ouvriers.find((o) => o.id === id).jours[ajouter(LUNDI2, n)];
  assert.deepEqual([j(o1.id, 0).capacite_min, j(o1.id, 0).conflits], [510, ['trop_charge']]);
  assert.deepEqual([j(chef.id, 1).capacite_min, j(chef.id, 1).charge_min, j(chef.id, 1).conflits], [255, 300, ['trop_charge']], 'demi-journée : la moitié');
  assert.deepEqual([j(chef.id, 2).capacite_min, j(chef.id, 2).conflits], [0, ['absent']]);
  assert.deepEqual(j(o2.id, 0).conflits, ['jour_non_travaille']);
  assert.deepEqual([j(o2.id, 5).capacite_min, j(o2.id, 5).conflits], [360, []], 'créneau propre 07:00-13:00');
  assert.deepEqual([j(o1.id, 3).nb_taches, j(o1.id, 3).conflits], [0, []]);
  assert.deepEqual([j(o1.id, 6).travaille, j(o1.id, 6).nb_taches, j(o1.id, 6).conflits], [0, 0, []], 'dimanche sans tâche : aucun conflit');
  // MCP : les mêmes conflits.
  const m = await tool(gest, 'get_planning', { du: LUNDI2 });
  assert.deepEqual(m.data.ouvriers.find((o) => o.id === o1.id).jours[LUNDI2].conflits, ['trop_charge']);
});

test('tâches non planifiées : ouvertes et sans date, par priorité puis échéance ; ni datées, ni annulées, ni d’une demande figée', async () => {
  const sans = (await gest.post(`/api/demandes/${demande}/taches`, { titre: 'À planifier (P3)' })).body.data;
  const datee = (await gest.post(`/api/demandes/${demande}/taches`, { titre: 'Déjà datée' })).body.data;
  await gest.put(`/api/taches/${datee.id}/affectation`, { date_prevue: LUNDI2 });
  const annulee = (await gest.post(`/api/demandes/${demande}/taches`, { titre: 'Annulée sans date' })).body.data;
  await gest.post(`/api/taches/${annulee.id}/etat`, { etat: 'annulee', motif: 'Inutile' });
  const d2 = (await agent.post('/api/demandes', { lieu_id: lieu, categorie_id: categorie.id, description: 'Fuite urgente dans les toilettes.' })).body.data.id;
  await gest.post(`/api/demandes/${d2}/qualifier`, { categorie_id: categorie.id, lieu_id: lieu, priorite: 'P2', motif_priorite: 'Urgent' });
  const urgente = (await gest.post(`/api/demandes/${d2}/taches`, { titre: 'Urgente (P2)' })).body.data;
  // Échéance de la P2 plus lointaine que celle de la P3 : seul le tri par priorité la met devant.
  getDb().prepare("UPDATE demandes SET echeance_le = '2099-12-31 00:00:00' WHERE id = ?").run(d2);
  const r = (await planning(chef, `du=${LUNDI2}`)).body.data.non_planifiees;
  const ids = r.map((x) => x.id);
  assert.ok(ids.includes(sans.id) && ids.includes(urgente.id));
  assert.ok(!ids.includes(datee.id) && !ids.includes(annulee.id));
  assert.ok(ids.indexOf(urgente.id) < ids.indexOf(sans.id), 'P2 avant P3');
  assert.deepEqual([r.find((x) => x.id === urgente.id).priorite, r.find((x) => x.id === urgente.id).lieu_code, r.find((x) => x.id === urgente.id).date_prevue, r.find((x) => x.id === urgente.id).heure_debut], ['P2', 'PL', null, null], 'mêmes champs que les tâches datées');
  // Demande figée (« Travaux terminés ») : ses tâches sans date ne sont plus à planifier.
  const d3 = (await agent.post('/api/demandes', { lieu_id: lieu, categorie_id: categorie.id, description: 'Porte qui grince au rez.' })).body.data.id;
  await gest.post(`/api/demandes/${d3}/qualifier`, { categorie_id: categorie.id, lieu_id: lieu, priorite: 'P4', motif_priorite: 'Essai' });
  const t3 = (await gest.post(`/api/demandes/${d3}/taches`, { titre: 'Huiler la porte' })).body.data;
  await gest.post(`/api/taches/${t3.id}/etat`, { etat: 'en_cours' });
  const t4 = (await gest.post(`/api/demandes/${d3}/taches`, { titre: 'Encore ouverte' })).body.data;
  getDb().prepare("UPDATE demandes SET etat = 'terminee' WHERE id = ?").run(d3);
  assert.ok(!(await planning(gest, `du=${LUNDI2}`)).body.data.non_planifiees.some((x) => x.id === t4.id || x.id === t3.id));
  assert.equal((await planning(gestB, `du=${LUNDI2}`)).body.data.non_planifiees.length, 0, 'cloison');
});

test('volumétrie D-15 (hypothèse TEC-08) : 40 ouvriers, 4 équipes, 120 tâches dans la semaine : réponse en moins d’une seconde', async () => {
  const db = getDb();
  const role = db.prepare("SELECT role FROM user_roles WHERE user_id = ? AND role = 'ouvrier'").get(o1.id).role;
  const nouveaux = [];
  for (let i = 0; i < 38; i += 1) {
    const id = db.prepare("INSERT INTO users (email, first_name, last_name, user_role, entite_id) VALUES (?, 'Ouvrier', ?, 'agent', ?)").run(`charge.${i}@exemple.test`, `N${String(i).padStart(2, '0')}`, ea.id).lastInsertRowid;
    db.prepare('INSERT INTO user_roles (user_id, entite_id, role) VALUES (?, ?, ?)').run(id, ea.id, role);
    nouveaux.push(id);
  }
  const equipesCharge = [];
  for (let q = 0; q < 2; q += 1) {
    const id = db.prepare("INSERT INTO equipes (entite_id, code, nom_fr, nom_nl, ordre) VALUES (?, ?, ?, ?, 50)").run(ea.id, `C${q}`, `Charge ${q}`, `Last ${q}`).lastInsertRowid;
    for (const u of nouveaux.slice(q * 10, q * 10 + 10)) db.prepare('INSERT INTO equipe_membres (equipe_id, user_id) VALUES (?, ?)').run(id, u);
    equipesCharge.push(id);
  }
  for (let i = 0; i < 120; i += 1) {
    const id = db.prepare(`INSERT INTO demande_taches (demande_id, entite_id, rang, titre, etat, date_prevue, duree_estimee_min, equipe_id)
      VALUES (?, ?, ?, ?, 'a_faire', ?, 60, ?)`).run(demande, ea.id, 100 + i, `Tâche de charge ${i}`, ajouter(LUNDI, i % 5), i % 3 ? null : equipesCharge[i % 2]).lastInsertRowid;
    if (i % 3) db.prepare('INSERT INTO tache_ouvriers (tache_id, user_id) VALUES (?, ?)').run(id, nouveaux[i % nouveaux.length]);
  }
  for (const u of nouveaux.slice(0, 8)) db.prepare("INSERT INTO indisponibilites (entite_id, user_id, du, au, motif) VALUES (?, ?, ?, ?, 'conge')").run(ea.id, u, LUNDI, ajouter(LUNDI, 2));
  await planning(gest); // chauffe
  const debut = process.hrtime.bigint();
  const r = await planning(gest);
  const ms = Number(process.hrtime.bigint() - debut) / 1e6;
  assert.equal(r.status, 200);
  assert.ok(r.body.data.ouvriers.length >= 40, `${r.body.data.ouvriers.length} ouvriers`);
  assert.ok(r.body.data.taches.length >= 120);
  assert.ok(ms < 1000, `planning en ${Math.round(ms)} ms`);
  console.log(`[PLANNING] ${r.body.data.ouvriers.length} ouvriers, ${r.body.data.taches.length} tâches : ${Math.round(ms)} ms`);
});
