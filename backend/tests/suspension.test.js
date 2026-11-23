/**
 * Suspension du délai et compteurs du cycle de vie (0.14.0, étape 9, point 4 ; PRI-03, GES-01, E-35 ; DV-119) :
 * minutes ouvrables, échéance repoussée, attente suspensive selon le réglage de l'entité, ni retard ni échéance proche
 * pendant l'attente, cumul réappliqué à une nouvelle qualification, compteurs « en attente depuis plus de N jours » et
 * « à clôturer » égaux aux filtres de la liste.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { getDb } = require('../src/database');
const echeances = require('../src/services/echeances');

let srv;
let admin;
let ea;
let eb;
let gest;
let resp;
let agent;
let gestB;
let lieu;
let categorie;
const V = {};
const sql = (date) => date.toISOString().replace('T', ' ').slice(0, 19);
const passer = (c, id, body) => c.post(`/api/demandes/${id}/transitions`, body);
const valeur = async (c, liste, code) => (await c.get(`/api/listes-valeurs?liste=${liste}&limit=200`)).body.data.find((v) => v.code === code).id;
const fiche = async (id) => (await gest.get(`/api/demandes/${id}`)).body.data;
const brut = (id) => getDb().prepare('SELECT * FROM demandes WHERE id = ?').get(id);

async function qualifiee(priorite = 'P3') {
  const d = (await agent.post('/api/demandes', { lieu_id: lieu, categorie_id: categorie.id, description: 'Le radiateur du bureau reste froid.' })).body.data;
  const q = await gest.post(`/api/demandes/${d.id}/qualifier`, { categorie_id: categorie.id, lieu_id: lieu, priorite, motif_priorite: 'Essai' });
  assert.equal(q.status, 200, JSON.stringify(q.body));
  return q.body.data;
}

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  gest = await person(srv.base, admin, 'gest.su@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  resp = await person(srv.base, admin, 'resp.su@exemple.test', ea.id, [[ea.id, 'responsable']]);
  agent = await person(srv.base, admin, 'agent.su@exemple.test', ea.id);
  gestB = await person(srv.base, admin, 'gest.sub@exemple.test', eb.id, [[eb.id, 'gestionnaire']]);
  lieu = (await gest.post('/api/lieux', { nature: 'site', code: 'SU', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis' })).body.data.id;
  categorie = (await agent.get('/api/categories?niveau=nature&q=eclairage')).body.data[0];
  for (const code of ['demandeur', 'acces', 'piece']) V[code] = await valeur(gest, 'motif_attente', code);
});
after(() => srv.stop());

// Horaire livré d'une entité de test : du lundi au vendredi, 08:00 à 16:30 (Bruxelles, UTC+1 en novembre).
test('minutes ouvrables, échéance repoussée, jours ouvrés en arrière (horaire 08:00-16:30)', () => {
  const t = (s) => new Date(s);
  assert.equal(echeances.minutesOuvrables(ea.id, t('2026-11-17T08:00:00Z'), t('2026-11-17T10:30:00Z')), 150, 'mardi 09:00 à 11:30');
  assert.equal(echeances.minutesOuvrables(ea.id, t('2026-11-20T14:00:00Z'), t('2026-11-23T08:00:00Z')), 150, 'vendredi 15:00 à lundi 09:00 : 90 + 60');
  assert.equal(echeances.minutesOuvrables(ea.id, t('2026-11-21T09:00:00Z'), t('2026-11-22T15:00:00Z')), 0, 'week-end');
  assert.equal(echeances.minutesOuvrables(ea.id, t('2026-11-17T10:00:00Z'), t('2026-11-17T09:00:00Z')), 0);
  assert.equal(echeances.repousser(ea.id, t('2026-11-18T09:00:00Z'), 'jours_ouvrables', { ouvrables: 150 }).toISOString(), '2026-11-18T11:30:00.000Z', 'mercredi 10:00 + 2 h 30');
  assert.equal(echeances.repousser(ea.id, t('2026-11-18T15:00:00Z'), 'heures_ouvrables', { ouvrables: 60 }).toISOString(), '2026-11-19T07:30:00.000Z', 'mercredi 16:00 + 1 h : jeudi 08:30');
  assert.equal(echeances.repousser(ea.id, t('2026-11-18T15:00:00Z'), 'heures_calendaires', { ouvrables: 60, calendaires: 600 }).toISOString(), '2026-11-19T01:00:00.000Z', 'temps réel');
  assert.equal(echeances.repousser(ea.id, t('2026-11-18T15:00:00Z'), 'jours_ouvrables', { ouvrables: 0 }).toISOString(), '2026-11-18T15:00:00.000Z');
  assert.equal(echeances.joursOuvresAvant(ea.id, t('2026-11-23T09:00:00Z'), 5).toISOString(), '2026-11-16T09:00:00.000Z', 'lundi 10:00 moins 5 jours ouvrés');
});

test('réglages livrés : attente suspensive pour « demandeur » et « accès », attente longue après 5 jours', async () => {
  const r = (await agent.get('/api/parametres-entite?groupe=demandes')).body.data;
  const s = r.find((p) => p.cle === 'demandes.attente_suspend');
  assert.equal(s.type, 'codes_liste');
  assert.equal(s.liste, 'motif_attente');
  assert.equal(s.valeur, 'acces,demandeur');
  assert.equal(r.find((p) => p.cle === 'demandes.attente_jours').valeur, '5');
});

test('réglage des motifs : codes de la liste de l’entité, rangés, sans doublon ; code inconnu refusé ; vide permis ; responsable seul', async () => {
  assert.equal((await gest.put('/api/parametres-entite/demandes.attente_suspend', { valeur: 'piece' })).status, 403);
  const k = await resp.put('/api/parametres-entite/demandes.attente_suspend', { valeur: 'inexistant' });
  assert.equal(k.status, 400);
  assert.match(k.body.message, /inexistant/);
  let r = await resp.put('/api/parametres-entite/demandes.attente_suspend', { valeur: ' demandeur, piece ,demandeur' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.valeur, 'demandeur,piece');
  r = await resp.put('/api/parametres-entite/demandes.attente_suspend', { valeur: '' });
  assert.equal(r.body.data.valeur, '');
  assert.equal((await resp.del('/api/parametres-entite/demandes.attente_suspend')).body.data.valeur, 'acces,demandeur');
});

test('attente suspensive : ni retard ni échéance proche ; à la reprise, échéance repoussée du temps ouvrable passé ; journal avant et après', async () => {
  const d = await qualifiee();
  const r = await passer(gest, d.id, { etat: 'en_attente', motif_id: V.demandeur });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(brut(d.id).attente_suspend, 1);
  // Échéance déjà passée et attente commencée il y a trois jours : la demande n'est pas en retard pendant l'attente.
  const passee = sql(new Date(Date.now() - 86400000));
  const debut = new Date(Date.now() - 3 * 86400000);
  getDb().prepare('UPDATE demandes SET echeance_le = ?, etat_depuis = ? WHERE id = ?').run(passee, sql(debut), d.id);
  const f = await fiche(d.id);
  assert.equal(f.echeance_type, 'suspendu');
  assert.equal(f.retard, 0);
  for (const e of ['retard', 'proche', 'sans']) {
    const l = (await gest.get(`/api/demandes?perimetre=entite&echeance=${e}&limit=200`)).body.data;
    assert.ok(!l.some((x) => x.id === d.id), e);
  }
  const reprise = await passer(gest, d.id, { etat: 'qualifiee' });
  assert.equal(reprise.status, 200);
  const apres = brut(d.id);
  assert.equal(apres.attente_suspend, 0);
  assert.ok(apres.suspendu_ouvrable_min > 0, 'au moins un jour ouvré sur trois jours');
  assert.ok(Math.abs(apres.suspendu_calendaire_min - 3 * 24 * 60) <= 2);
  const attendu = sql(echeances.repousser(ea.id, new Date(`${passee.replace(' ', 'T')}Z`), 'jours_ouvrables', { ouvrables: apres.suspendu_ouvrable_min }));
  assert.equal(apres.echeance_le, attendu);
  const ligne = (await admin.get('/api/audit?action=demande.transition&limit=200')).body.data.find((a) => a.entity_id === d.id && a.details.de === 'en_attente');
  assert.deepEqual(ligne.details.avant, { echeance_le: passee });
  assert.deepEqual(ligne.details.apres, { echeance_le: attendu });
  // Une nouvelle qualification recalcule depuis la réception et réapplique le temps suspendu (règle 7).
  getDb().prepare('UPDATE demandes SET echeance_le = ? WHERE id = ?').run(d.echeance_le, d.id);
  await gest.post(`/api/demandes/${d.id}/qualifier`, { categorie_id: categorie.id, lieu_id: lieu, priorite: 'P3', motif_priorite: 'Essai' });
  const requalifiee = brut(d.id).echeance_le;
  assert.equal(requalifiee, sql(echeances.repousser(ea.id, new Date(`${d.echeance_le.replace(' ', 'T')}Z`), 'jours_ouvrables', { ouvrables: apres.suspendu_ouvrable_min })));
  assert.ok(requalifiee > d.echeance_le);
});

test('attente non suspensive (pièce à commander) : le délai court, l’échéance ne bouge pas à la reprise', async () => {
  const d = await qualifiee();
  await passer(gest, d.id, { etat: 'en_attente', motif_id: V.piece });
  assert.equal(brut(d.id).attente_suspend, 0);
  const passee = sql(new Date(Date.now() - 86400000));
  getDb().prepare('UPDATE demandes SET echeance_le = ?, etat_depuis = ? WHERE id = ?').run(passee, sql(new Date(Date.now() - 3 * 86400000)), d.id);
  assert.equal((await fiche(d.id)).retard, 1);
  assert.ok((await gest.get('/api/demandes?perimetre=entite&echeance=retard&limit=200')).body.data.some((x) => x.id === d.id));
  await passer(gest, d.id, { etat: 'en_cours' });
  assert.equal(brut(d.id).echeance_le, passee);
  assert.equal(brut(d.id).suspendu_ouvrable_min, 0);
});

test('le réglage du moment de l’entrée fait foi ; une sortie vers un état fermé ne repousse rien', async () => {
  await resp.put('/api/parametres-entite/demandes.attente_suspend', { valeur: 'piece' });
  try {
    const d = await qualifiee();
    await passer(gest, d.id, { etat: 'en_attente', motif_id: V.piece });
    assert.equal(brut(d.id).attente_suspend, 1);
    const e = await qualifiee();
    await passer(gest, e.id, { etat: 'en_attente', motif_id: V.demandeur });
    assert.equal(brut(e.id).attente_suspend, 0, 'demandeur décoché');
    getDb().prepare('UPDATE demandes SET etat_depuis = ? WHERE id = ?').run(sql(new Date(Date.now() - 3 * 86400000)), d.id);
    const avant = brut(d.id).echeance_le;
    await passer(gest, d.id, { etat: 'annulee', commentaire: 'Plus nécessaire.' });
    assert.equal(brut(d.id).echeance_le, avant);
    assert.equal(brut(d.id).attente_suspend, 0);
  } finally { await resp.del('/api/parametres-entite/demandes.attente_suspend'); }
});

test('compteurs « en attente depuis plus de N jours » et « à clôturer » : mêmes totaux que les filtres ; N réglable', async () => {
  const vieille = await qualifiee();
  await passer(gest, vieille.id, { etat: 'en_attente', motif_id: V.piece });
  getDb().prepare('UPDATE demandes SET etat_depuis = ? WHERE id = ?').run(sql(new Date(Date.now() - 30 * 86400000)), vieille.id);
  const recente = await qualifiee();
  await passer(gest, recente.id, { etat: 'en_attente', motif_id: V.acces });
  const finie = await qualifiee();
  await passer(gest, finie.id, { etat: 'terminee' });
  const bord = (await gest.get('/api/demandes/tableau-bord')).body.data;
  assert.equal(bord.jours_attente, 5);
  const longue = (await gest.get('/api/demandes?perimetre=entite&attente=longue&limit=200')).body;
  assert.equal(bord.attente_longue, longue.pagination.total);
  assert.ok(longue.data.some((x) => x.id === vieille.id));
  assert.ok(!longue.data.some((x) => x.id === recente.id));
  const terminees = (await gest.get('/api/demandes?perimetre=entite&etats=terminee&limit=200')).body;
  assert.equal(bord.a_cloturer, terminees.pagination.total);
  assert.ok(terminees.data.some((x) => x.id === finie.id));
  assert.equal((await gest.get('/api/demandes?perimetre=entite&attente=autre')).status, 400);
  // Autre entité : ses compteurs ne voient pas ces demandes.
  const bordB = (await gestB.get('/api/demandes/tableau-bord')).body.data;
  assert.equal(bordB.attente_longue, 0);
  assert.equal(bordB.a_cloturer, 0);
  // N porté à 60 jours ouvrés : l'attente de 30 jours calendaires n'est plus longue.
  await resp.put('/api/parametres-entite/demandes.attente_jours', { valeur: '60' });
  try {
    const b2 = (await gest.get('/api/demandes/tableau-bord')).body.data;
    assert.equal(b2.jours_attente, 60);
    assert.equal(b2.attente_longue, 0);
  } finally { await resp.del('/api/parametres-entite/demandes.attente_jours'); }
  // Une vue enregistrée garde le filtre.
  const v = await gest.post('/api/vues-demandes', { nom: 'Attentes longues', filtres: { attente: 'longue' } });
  assert.equal(v.status, 201, JSON.stringify(v.body));
});
