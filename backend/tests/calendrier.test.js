/**
 * Calendrier des jours ouvrables et calcul des échéances (cahier des charges PRI-02, PRI-03 ; règles validées par
 * Thierry le 22/10/2026). Heures de Bruxelles, passage à l'heure d'hiver du 25/10/2026 compris.
 * Entité « AC » : horaire des ouvriers, du lundi au jeudi 07:45-16:15, le vendredi 07:45-12:00.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { getDb } = require('../src/database');
const calendrier = require('../src/services/calendrier');

let srv;
let admin;
let ea;
let ac;
let agentAc;
let gestAc;
let respAc;
let respAa;

const tool = async (c, name, args) => JSON.parse((await c.mcp('tools/call', { name, arguments: args })).body.result.content[0].text);
const simuler = async (c, q) => (await c.get(`/api/echeances/simulation?${new URLSearchParams(q)}`)).body;

before(async () => {
  srv = await startServer();
  ({ admin, ea } = await setup(srv.base));
  ac = (await admin.post('/api/entites', { code: 'AC', nom_fr: 'Administration communale', nom_nl: 'Gemeentebestuur' })).body.data;
  agentAc = await person(srv.base, admin, 'k.agent@exemple.test', ac.id);
  gestAc = await person(srv.base, admin, 'k.gest@exemple.test', ac.id, [[ac.id, 'gestionnaire']]);
  respAc = await person(srv.base, admin, 'k.resp@exemple.test', ac.id, [[ac.id, 'responsable']]);
  respAa = await person(srv.base, admin, 'k.respa@exemple.test', ea.id, [[ea.id, 'responsable']]);
});
after(() => srv.stop());

test('Pâques et les dix jours fériés légaux', () => {
  assert.deepEqual(calendrier.paques(2024), [3, 31]);
  assert.deepEqual(calendrier.paques(2025), [4, 20]);
  assert.deepEqual(calendrier.paques(2026), [4, 5]);
  assert.deepEqual(calendrier.paques(2027), [3, 28]);
  assert.deepEqual(calendrier.paques(2038), [4, 25]);
  const f = calendrier.feries(2026).map((x) => x.date);
  assert.deepEqual(f, ['2026-01-01', '2026-04-06', '2026-05-01', '2026-05-14', '2026-05-25', '2026-07-21', '2026-08-15', '2026-11-01', '2026-11-11', '2026-12-25']);
});

test('jours fériés par l’API et le MCP, libellés FR et NL', async () => {
  const r = await agentAc.get('/api/jours-feries?annee=2027');
  assert.equal(r.status, 200);
  assert.equal(r.body.data.length, 10);
  assert.equal(r.body.data.find((x) => x.code === 'lundi_paques').date, '2027-03-29');
  assert.ok(r.body.data.every((x) => x.libelle_fr && x.libelle_nl));
  assert.equal((await tool(agentAc, 'list_jours_feries', { annee: 2026 })).data.rows[3].code, 'ascension');
  assert.equal((await agentAc.get('/api/jours-feries?annee=1999')).body.code, 'VALIDATION');
});

test('horaire livré : celui des ouvriers pour AC, l’horaire par défaut ailleurs ; week-end non ouvré', async () => {
  const h = (await agentAc.get('/api/horaires')).body.data;
  assert.deepEqual(h.map((x) => [x.jour, x.debut, x.fin]), [
    [1, '07:45', '16:15'], [2, '07:45', '16:15'], [3, '07:45', '16:15'], [4, '07:45', '16:15'], [5, '07:45', '12:00'], [6, null, null], [7, null, null]]);
  assert.ok(h.every((x) => x.est_defaut));
  assert.equal(h[5].ouvre, 0);
  const a = (await respAa.get('/api/horaires/1')).body.data;
  assert.deepEqual([a.debut, a.fin], ['08:00', '16:30']);
});

test('congés livrés à chaque entité : 8 mai, 27 septembre, 2 novembre, 15 novembre, 26 décembre', async () => {
  const c = (await agentAc.get('/api/jours-non-ouvres?nature=conge')).body.data;
  assert.deepEqual(c.map((x) => x.mois_jour), ['05-08', '09-27', '11-02', '11-15', '12-26']);
  assert.ok(c.every((x) => x.libelle_fr && x.libelle_nl && x.is_active === 1));
  assert.equal(getDb().prepare("SELECT COUNT(*) AS n FROM jours_non_ouvres WHERE entite_id = ? AND nature = 'conge'").get(ea.id).n, 5);
});

test('règle 2 : N jours ouvrables, même heure ; un congé et l’heure d’hiver en route', async () => {
  // Lundi 19/10/2026 14:00 (UTC+2). P3 : prise en charge 2 jours, fin 10 jours.
  const r = (await simuler(agentAc, { priorite: 'P3', recu_le: '2026-10-19T12:00:00Z' })).data;
  assert.equal(r.unite, 'jours_ouvrables');
  assert.equal(r.debut_decompte.local, '2026-10-19 14:00');
  assert.equal(r.prise_en_charge_le.local, '2026-10-21 14:00');
  // 20, 21, 22, 23, 26, 27, 28, 29, 30 octobre, le 2 novembre est un congé, le 3 novembre est le dixième jour.
  assert.equal(r.fin_le.local, '2026-11-03 14:00');
  assert.equal(r.fin_le.utc, '2026-11-03T13:00:00.000Z', 'heure d’hiver : UTC+1');
  assert.equal(r.delai_fin_source, 'priorite');
});

test('règle 1 : reçue après la fermeture du vendredi, le décompte commence le lundi à l’ouverture', async () => {
  const r = (await simuler(agentAc, { priorite: 'P3', recu_le: '2026-10-23T11:00:00Z' })).data; // vendredi 13:00
  assert.equal(r.debut_decompte.local, '2026-10-26 07:45');
  assert.equal(r.prise_en_charge_le.local, '2026-10-28 07:45');
  const t = (await simuler(agentAc, { priorite: 'P3', recu_le: '2026-10-24T08:00:00Z' })).data; // samedi
  assert.equal(t.debut_decompte.local, '2026-10-26 07:45');
  const tot = (await simuler(agentAc, { priorite: 'P3', recu_le: '2026-10-20T04:00:00Z' })).data; // mardi 06:00
  assert.equal(tot.debut_decompte.local, '2026-10-20 07:45');
});

test('règle 3 : l’échéance qui dépasse la fermeture du jour d’arrivée tombe à la fermeture', async () => {
  const r = (await simuler(agentAc, { priorite: 'P2', recu_le: '2026-10-21T12:00:00Z' })).data; // mercredi 14:00
  assert.equal(r.prise_en_charge_le.local, '2026-10-22 14:00');
  assert.equal(r.fin_le.local, '2026-10-23 12:00', 'vendredi : fermeture à 12:00');
});

test('P1 en heures calendaires : nuit, week-end et changement d’heure comptent', async () => {
  const r = (await simuler(agentAc, { priorite: 'P1', recu_le: '2026-10-23T11:00:00Z' })).data; // vendredi 13:00
  assert.equal(r.unite, 'heures_calendaires');
  assert.equal(r.debut_decompte.local, '2026-10-23 13:00');
  assert.equal(r.prise_en_charge_le.local, '2026-10-23 14:00');
  assert.equal(r.fin_le.local, '2026-10-23 17:00');
  const nuit = (await simuler(agentAc, { priorite: 'P1', recu_le: '2026-10-24T21:30:00Z' })).data; // samedi 23:30 (UTC+2)
  assert.equal(nuit.fin_le.utc, '2026-10-25T01:30:00.000Z', 'quatre heures réelles');
  assert.equal(nuit.fin_le.local, '2026-10-25 02:30', 'après le retour de 03:00 à 02:00');
});

test('jour férié et fermeture : jours sautés ; une fermeture désactivée redevient ouvrable', async () => {
  // Mardi 10/11/2026 10:00 ; le 11 novembre est férié.
  const r = (await simuler(agentAc, { priorite: 'P2', recu_le: '2026-11-10T09:00:00Z' })).data;
  assert.equal(r.prise_en_charge_le.local, '2026-11-12 10:00');
  const f = await respAc.post('/api/jours-non-ouvres', { nature: 'fermeture', date_debut: '2026-12-28', date_fin: '2026-12-31', libelle_fr: 'Fin d’année', libelle_nl: 'Eindejaar' });
  assert.equal(f.status, 201, JSON.stringify(f.body));
  // Jeudi 24/12 10:00 : 25 Noël, 26-27 week-end, 28-31 fermeture, 1er janvier férié, 2-3 week-end.
  const n = (await simuler(agentAc, { priorite: 'P2', recu_le: '2026-12-24T09:00:00Z' })).data;
  assert.equal(n.prise_en_charge_le.local, '2027-01-04 10:00');
  assert.equal((await respAc.del(`/api/jours-non-ouvres/${f.body.data.id}`, { motif: 'Annulée' })).body.data.is_active, 0);
  const o = (await simuler(agentAc, { priorite: 'P2', recu_le: '2026-12-24T09:00:00Z' })).data;
  assert.equal(o.prise_en_charge_le.local, '2026-12-28 10:00');
});

test('règle 4 : heures ouvrables, seul le temps d’ouverture compte', async () => {
  await respAc.put('/api/priorites/P2', { unite: 'heures_ouvrables', prise_en_charge: 8, fin: 16 });
  // Jeudi 22/10 15:00 : 75 min le jeudi, 255 min le vendredi, reste 150 min le lundi dès 07:45.
  const r = (await simuler(agentAc, { priorite: 'P2', recu_le: '2026-10-22T13:00:00Z' })).data;
  assert.equal(r.unite, 'heures_ouvrables');
  assert.equal(r.prise_en_charge_le.local, '2026-10-26 10:15');
  await respAc.del('/api/priorites/P2', {});
});

test('délai propre de la catégorie : remplace la fin en jours ouvrables, ignoré en heures ; priorité de la catégorie', async () => {
  const fuite = (await agentAc.get('/api/categories?q=fuite_eau')).body.data[0];
  const parCat = (await simuler(agentAc, { categorie_id: fuite.id, recu_le: '2026-10-19T12:00:00Z' })).data;
  assert.equal(parCat.priorite, 'P2', 'priorité proposée par la catégorie');
  assert.equal(parCat.categorie.code, 'fuite_eau');
  await respAc.put(`/api/categories/${fuite.id}`, { delai_fin_jours: 3 });
  const d = (await simuler(agentAc, { categorie_id: fuite.id, recu_le: '2026-10-19T12:00:00Z' })).data;
  assert.deepEqual([d.delai_fin, d.delai_fin_source, d.fin_le.local], [3, 'categorie', '2026-10-22 14:00']);
  const p1 = (await simuler(agentAc, { priorite: 'P1', categorie_id: fuite.id, recu_le: '2026-10-19T12:00:00Z' })).data;
  assert.deepEqual([p1.delai_fin, p1.delai_fin_source], [4, 'priorite']);
  const p4 = (await simuler(agentAc, { priorite: 'P4', recu_le: '2026-10-19T12:00:00Z' })).data;
  assert.equal(p4.fin_le, null);
  assert.equal(p4.date_convenue, true);
  assert.equal((await simuler(agentAc, {})).code, 'VALIDATION');
  const autre = (await respAa.get('/api/categories?q=fuite_eau')).body.data[0];
  assert.equal((await simuler(agentAc, { categorie_id: autre.id })).code, 'FORBIDDEN', 'catégorie de l’autre entité');
});

test('horaire : réglage par le responsable, contrôle, retour à l’horaire livré, journal', async () => {
  for (const c of [agentAc, gestAc]) assert.equal((await c.put('/api/horaires/5', { fin: '16:15' })).status, 403);
  const r = await respAc.put('/api/horaires/5', { fin: '16:15' });
  assert.equal(r.status, 200);
  assert.deepEqual([r.body.data.debut, r.body.data.fin, r.body.data.est_defaut], ['07:45', '16:15', false]);
  const v = (await simuler(agentAc, { priorite: 'P2', recu_le: '2026-10-21T12:00:00Z' })).data;
  assert.equal(v.fin_le.local, '2026-10-23 14:00', 'vendredi ouvert jusqu’à 16:15');
  const refus = async (jour, body) => assert.equal((await respAc.put(`/api/horaires/${jour}`, body)).body.code, 'HORAIRE_INVALIDE', JSON.stringify(body));
  await refus(5, { debut: '17:00' });
  await refus(6, { debut: '08:00' });
  await refus(1, { fin: null });
  assert.equal((await respAc.put('/api/horaires/1', { debut: '7:45' })).body.code, 'VALIDATION');
  assert.equal((await respAc.put('/api/horaires/8', { debut: '08:00' })).body.code, 'VALIDATION');
  const sam = await respAc.put('/api/horaires/6', { debut: '08:00', fin: '12:00' });
  assert.equal(sam.body.data.ouvre, 1);
  await respAc.put('/api/horaires/6', { debut: null, fin: null });
  const back = await respAc.del('/api/horaires/5', {});
  assert.deepEqual([back.body.data.fin, back.body.data.est_defaut], ['12:00', true]);
  const actions = getDb().prepare("SELECT action, entite_id FROM audit_log WHERE entity_type = 'horaire'").all();
  assert.ok(actions.some((a) => a.action === 'horaire.update') && actions.some((a) => a.action === 'horaire.reset'));
  assert.ok(actions.every((a) => a.entite_id === ac.id));
});

test('congés et fermetures : contrôles, doublon, droits, réactivation', async () => {
  const post = (body) => respAc.post('/api/jours-non-ouvres', { libelle_fr: 'x', libelle_nl: 'x', ...body });
  assert.equal((await post({ nature: 'conge', mois_jour: '02-30' })).body.code, 'JOUR_NON_OUVRE_INVALIDE');
  assert.equal((await post({ nature: 'conge', mois_jour: '13-01' })).body.code, 'VALIDATION');
  assert.equal((await post({ nature: 'conge', mois_jour: '06-01', date_debut: '2026-06-01' })).body.code, 'JOUR_NON_OUVRE_INVALIDE');
  assert.equal((await post({ nature: 'fermeture', date_debut: '2026-08-10' })).body.code, 'JOUR_NON_OUVRE_INVALIDE');
  assert.equal((await post({ nature: 'fermeture', date_debut: '2026-08-10', date_fin: '2026-08-01' })).body.code, 'JOUR_NON_OUVRE_INVALIDE');
  assert.equal((await post({ nature: 'fermeture', date_debut: '2026-01-01', date_fin: '2027-06-01' })).body.code, 'JOUR_NON_OUVRE_INVALIDE');
  const dup = await post({ nature: 'conge', mois_jour: '11-15' });
  assert.equal(dup.status, 409);
  assert.equal(dup.body.code, 'JOUR_NON_OUVRE_DUPLICATE');
  assert.equal((await gestAc.post('/api/jours-non-ouvres', { nature: 'conge', mois_jour: '06-01', libelle_fr: 'x', libelle_nl: 'x' })).status, 403);
  const roi = (await agentAc.get('/api/jours-non-ouvres?q=Roi')).body.data[0];
  await respAc.del(`/api/jours-non-ouvres/${roi.id}`, { motif: 'Essai' });
  calendrier.seedAll();
  assert.equal(getDb().prepare("SELECT COUNT(*) AS n FROM jours_non_ouvres WHERE entite_id = ? AND mois_jour = '11-15'").get(ac.id).n, 1, 'jamais recréé');
  // Le 15 novembre 2027 tombe un lundi.
  const sansRoi = (await simuler(agentAc, { priorite: 'P2', recu_le: '2027-11-12T08:00:00Z' })).data; // vendredi 12/11/2027 09:00
  assert.equal(sansRoi.prise_en_charge_le.local, '2027-11-15 09:00', 'lundi 15 novembre redevenu ouvrable');
  const re = await respAc.put(`/api/jours-non-ouvres/${roi.id}`, { is_active: 1 });
  assert.equal(re.body.data.is_active, 1);
  const avecRoi = (await simuler(agentAc, { priorite: 'P2', recu_le: '2027-11-12T08:00:00Z' })).data;
  assert.equal(avecRoi.prise_en_charge_le.local, '2027-11-16 09:00');
  const actions = new Set(getDb().prepare("SELECT action FROM audit_log WHERE entity_type = 'jour_non_ouvre'").all().map((a) => a.action));
  for (const a of ['jour_non_ouvre.create', 'jour_non_ouvre.deactivate', 'jour_non_ouvre.reactivate']) assert.ok(actions.has(a), a);
  const annee = (await agentAc.get('/api/jours-non-ouvres?annee=2027&is_active=1')).body.data;
  assert.ok(annee.every((j) => j.nature === 'conge'), 'la fermeture 2026 n’est pas de 2027');
});

test('calendrier vide : le calcul le dit au lieu de tourner sans fin', async () => {
  const e = (await admin.post('/api/entites', { code: 'VV', nom_fr: 'Vide', nom_nl: 'Leeg' })).body.data;
  const r = await person(srv.base, admin, 'k.vide@exemple.test', e.id, [[e.id, 'responsable']]);
  for (const j of [1, 2, 3, 4, 5]) await r.put(`/api/horaires/${j}`, { debut: null, fin: null });
  const s = await simuler(r, { priorite: 'P3', recu_le: '2026-10-19T12:00:00Z' });
  assert.equal(s.code, 'CALENDRIER_VIDE');
  const p1 = (await simuler(r, { priorite: 'P1', recu_le: '2026-10-19T12:00:00Z' })).data;
  assert.equal(p1.fin_le.local, '2026-10-19 18:00', 'P1 en heures calendaires : aucun jour ouvré nécessaire');
});

test('MCP : horaire, congés et simulateur sous les droits de la personne', async () => {
  assert.equal((await tool(agentAc, 'get_horaire', { jour: 5 })).data.fin, '12:00');
  assert.equal((await tool(agentAc, 'update_horaire', { jour: 5, fin: '13:00' })).code, 'FORBIDDEN');
  assert.equal((await tool(respAc, 'update_horaire', { jour: 5, fin: '13:00' })).data.fin, '13:00');
  const p = await tool(respAc, 'prepare_reset_horaire', { jour: 5 });
  assert.equal((await tool(respAc, 'confirm_reset_horaire', { confirmation_token: p.data.confirmation_token })).data.fin, '12:00');
  const c = await tool(respAc, 'create_jour_non_ouvre', { nature: 'fermeture', date_debut: '2027-07-19', date_fin: '2027-07-23', libelle_fr: 'Été', libelle_nl: 'Zomer' });
  assert.equal(c.data.nature, 'fermeture');
  const s = await tool(agentAc, 'simuler_echeance', { priorite: 'P2', recu_le: '2027-07-16T07:00:00Z' }); // vendredi 09:00
  assert.equal(s.data.prise_en_charge_le.local, '2027-07-26 09:00');
  const d = await tool(respAc, 'prepare_deactivate_jour_non_ouvre', { id: c.data.id, motif: 'Essai' });
  assert.equal((await tool(respAc, 'confirm_deactivate_jour_non_ouvre', { confirmation_token: d.data.confirmation_token })).data.is_active, 0);
});
