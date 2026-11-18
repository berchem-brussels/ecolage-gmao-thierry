/**
 * Export des listes en Excel et en CSV (0.18.0, point 2 ; IMP-03 ; DV-149) : mêmes droits, même cloison et mêmes filtres
 * que les listes ; colonnes dans la langue de la personne ; CSV sans formule exécutable ; plafond ; journal sans contenu.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { startServer, setup, person } = require('./helpers');
const { getDb } = require('../src/database');
const exportsSvc = require('../src/services/exports');

let srv;
let admin;
let ea;
let eb;
let agent;
let gest;
let gestB;
let chef;
let lieu;
let lieuB;
let nature;
let natureB;
let natureValider;
const numeros = [];

/** Téléchargement brut (le client des tests lit du texte) : rend le statut, les en-têtes et les octets. */
async function telecharger(c, url) {
  const res = await fetch(srv.base + url, { headers: { Cookie: c.cookie } });
  return { status: res.status, headers: res.headers, buffer: Buffer.from(await res.arrayBuffer()) };
}
const lignesCsv = (buf) => buf.toString('utf8').replace(/^﻿/, '').split('\r\n').filter(Boolean);
async function feuille(buf) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  const rows = [];
  ws.eachRow((r) => rows.push(r.values.slice(1).map((v) => (v === null || v === undefined ? '' : String(v)))));
  return { ws, rows };
}

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  agent = await person(srv.base, admin, 'agent.exp@exemple.test', ea.id);
  gest = await person(srv.base, admin, 'gest.exp@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  gestB = await person(srv.base, admin, 'gestb.exp@exemple.test', eb.id, [[eb.id, 'gestionnaire']]);
  chef = await person(srv.base, admin, 'chef.exp@exemple.test', ea.id, [[ea.id, 'valideur']]);
  lieu = (await gest.post('/api/lieux', { nature: 'site', code: 'EX', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis' })).body.data.id;
  lieuB = (await gestB.post('/api/lieux', { nature: 'site', code: 'EXB', nom_fr: 'Site B', nom_nl: 'Site B' })).body.data.id;
  nature = (await agent.get('/api/categories?niveau=nature&q=eclairage')).body.data[0].id;
  natureB = (await gestB.get('/api/categories?niveau=nature&q=eclairage')).body.data[0].id;
  natureValider = (await agent.get('/api/categories?niveau=nature&q=demenagement')).body.data[0].id;
  for (const description of ['La lampe du bureau ne s’allume plus.', '=SOMME(A1:A9) cellule piégée ; avec "guillemets"']) {
    const r = await agent.post('/api/demandes', { lieu_id: lieu, categorie_id: nature, description });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    numeros.push(r.body.data.numero);
  }
  assert.equal((await gestB.post('/api/demandes', { lieu_id: lieuB, categorie_id: natureB, description: 'Demande de l’autre entité.' })).status, 201);
  // Demande à valider : l'agent est membre du service du chef.
  const service = (await admin.post('/api/services', { entite_id: ea.id, code: 'SEC', nom_fr: 'Secrétariat', nom_nl: 'Secretariaat', valideur_id: chef.id })).body.data;
  assert.equal((await admin.put(`/api/users/${agent.id}`, { service_id: service.id })).status, 200);
  const v = await agent.post('/api/demandes', { lieu_id: lieu, categorie_id: natureValider, description: 'Déménagement de deux bureaux.' });
  assert.equal(v.body.data.etat, 'en_validation', JSON.stringify(v.body));
  numeros.push(v.body.data.numero);
  assert.equal((await agent.post('/api/tickets', { type: 'question', title: 'Comment exporter ?', description: 'Je cherche le bouton.' })).status, 201);
});
after(() => srv.stop());

test('mes demandes en CSV : fichier nommé, BOM, « ; », colonnes FR sans demandeur, formule neutralisée', async () => {
  const r = await telecharger(agent, '/api/demandes/export?format=csv');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /^text\/csv; charset=utf-8/);
  assert.match(r.headers.get('content-disposition'), /^attachment; filename="mes-demandes-AA-\d{4}-\d{2}-\d{2}\.csv"$/);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.deepEqual([...r.buffer.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'BOM UTF-8 : Excel lit les accents');
  const l = lignesCsv(r.buffer);
  assert.equal(l[0], 'Numéro;Déposée le;État;Catégorie;Lieu;Description');
  assert.equal(l.length, 4, 'titres et trois demandes');
  assert.equal(r.headers.get('x-export-lignes'), '3');
  const piegee = l.find((x) => x.includes('SOMME'));
  assert.ok(piegee.endsWith(';"\'=SOMME(A1:A9) cellule piégée ; avec ""guillemets"""'), piegee);
  assert.match(l[1], /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/, 'date à l’heure de Bruxelles');
});

test('en néerlandais : titres des colonnes et libellés en NL', async () => {
  await agent.put('/api/auth/preferences', { preferred_lang: 'nl' });
  try {
    const l = lignesCsv((await telecharger(agent, '/api/demandes/export?format=csv')).buffer);
    assert.equal(l[0], 'Nummer;Ingediend op;Status;Categorie;Plaats;Beschrijving');
    assert.ok(l.some((x) => x.includes('Gemeentehuis')));
  } finally { await agent.put('/api/auth/preferences', { preferred_lang: 'fr' }); }
});

test('demandes de l’entité en Excel : droit exigé, demandeur et échéance, cloison, filtres de la liste', async () => {
  assert.equal((await telecharger(agent, '/api/demandes/export?format=xlsx&perimetre=entite')).status, 403, 'un agent n’exporte pas l’entité');
  const r = await telecharger(gest, '/api/demandes/export?format=xlsx&perimetre=entite');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  assert.match(r.headers.get('content-disposition'), /filename="demandes-entite-AA-\d{4}-\d{2}-\d{2}\.xlsx"/);
  const { ws, rows } = await feuille(r.buffer);
  assert.equal(ws.name, "Demandes de l'entité");
  assert.deepEqual(rows[0], ['Numéro', 'Déposée le', 'État', 'Priorité', 'Catégorie', 'Lieu', 'Demandeur', 'Échéance', 'Description']);
  assert.equal(ws.getRow(1).font.bold, true);
  assert.equal(ws.views[0].state, 'frozen');
  assert.equal(ws.views[0].ySplit, 1, 'ligne de titres figée');
  assert.ok(ws.autoFilter, 'filtre automatique');
  const corps = rows.slice(1);
  assert.equal(corps.length, 3);
  assert.ok(corps.every((x) => x[6] === 'Prénom Nom'), 'demandeur pour le service');
  assert.ok(corps.some((x) => x[2] === 'À qualifier'), 'libellé du service');
  assert.ok(!corps.some((x) => x.join(' ').includes('autre entité')), 'cloison : rien de l’entité BB');
  assert.equal(corps.find((x) => x[8].startsWith('=SOMME'))[8], '=SOMME(A1:A9) cellule piégée ; avec "guillemets"', 'Excel garde le texte, sans formule');
  assert.equal(ws.getCell('I3').type, ExcelJS.ValueType.String);
  const filtre = await feuille((await telecharger(gest, `/api/demandes/export?format=xlsx&perimetre=entite&q=${numeros[0]}`)).buffer);
  assert.deepEqual(filtre.rows.slice(1).map((x) => x[0]), [numeros[0]], 'recherche de la liste appliquée');
  const etats = await feuille((await telecharger(gest, '/api/demandes/export?format=xlsx&perimetre=entite&etats=en_validation')).buffer);
  assert.deepEqual(etats.rows.slice(1).map((x) => x[0]), [numeros[2]], 'filtre d’état appliqué');
  const b = await feuille((await telecharger(gestB, '/api/demandes/export?format=xlsx&perimetre=entite')).buffer);
  assert.equal(b.rows.length, 2, 'BB : sa seule demande');
  assert.ok(b.rows[1][8].includes('autre entité'));
});

test('demandes à valider : celles du chef de service seulement (vide pour les autres, comme la liste)', async () => {
  assert.equal(lignesCsv((await telecharger(gest, '/api/demandes/a-valider/export?format=csv')).buffer).length, 1, 'titres seuls');
  const r = await telecharger(chef, '/api/demandes/a-valider/export?format=csv');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-disposition'), /filename="demandes-a-valider-AA-/);
  const l = lignesCsv(r.buffer);
  assert.equal(l[0], 'Numéro;Déposée le;Catégorie;Lieu;Demandeur;Description');
  assert.equal(l.length, 2);
  assert.ok(l[1].startsWith(`${numeros[2]};`));
});

test('tickets : ceux que la personne voit, libellés traduits', async () => {
  const l = lignesCsv((await telecharger(agent, '/api/tickets/export?format=csv')).buffer);
  assert.equal(l[0], 'Référence;Type;Titre;Priorité;Statut;File;Demandeur;Attribué à;Créé le;Mis à jour le');
  assert.equal(l.length, 2);
  assert.match(l[1], /;Question métier;Comment exporter \?;P\d;Nouveau;Métier;Prénom Nom;;/);
  assert.equal(lignesCsv((await telecharger(gestB, '/api/tickets/export?format=csv')).buffer).length, 1, 'aucun ticket de l’autre entité');
  const filtre = lignesCsv((await telecharger(agent, '/api/tickets/export?format=csv&status=closed')).buffer);
  assert.equal(filtre.length, 1, 'filtre de statut appliqué');
});

test('contrôles : session, format obligatoire, paramètre inconnu', async () => {
  const anonyme = await fetch(`${srv.base}/api/demandes/export?format=csv`);
  assert.equal(anonyme.status, 401);
  assert.equal((await agent.get('/api/demandes/export')).status, 400, 'format obligatoire');
  assert.equal((await agent.get('/api/demandes/export?format=pdf')).status, 400);
  assert.equal((await agent.get('/api/demandes/export?format=csv&limit=10')).status, 400, 'pas de pagination');
  assert.equal((await agent.get('/api/tickets/export?format=csv&inconnu=1')).status, 400);
});

test('journal : export.liste avec la liste, le format et le nombre de lignes, jamais le contenu', async () => {
  await telecharger(gest, '/api/demandes/export?format=xlsx&perimetre=entite');
  const l = getDb().prepare("SELECT user_id, entite_id, details_json FROM audit_log WHERE action = 'export.liste' ORDER BY id DESC LIMIT 1").get();
  assert.equal(l.user_id, gest.id);
  assert.equal(l.entite_id, ea.id);
  assert.deepEqual(JSON.parse(l.details_json), { liste: 'demandes_entite', format: 'xlsx', lignes: 3 });
  const tous = getDb().prepare("SELECT details_json FROM audit_log WHERE action = 'export.liste'").all().map((x) => x.details_json).join(' ');
  assert.ok(!/lampe|SOMME|exporter/.test(tous), 'aucun texte libre au journal (DV-116)');
});

test('plafond : au-delà de 5 000 lignes, refus EXPORT_TROP sans charger les lignes', async () => {
  let chargees = false;
  const lire = (limit) => { if (limit > 1) chargees = true; return { rows: [], pagination: { total: exportsSvc.EXPORT_MAX + 1 } }; };
  await assert.rejects(exportsSvc.produire({ id: 1, entiteId: null, lang: 'fr' }, { liste: 'tickets', format: 'csv', lire }), (e) => e.code === 'EXPORT_TROP');
  assert.equal(chargees, false);
});

test('cellule CSV et date locale', () => {
  assert.equal(exportsSvc.celluleCsv('+32 2 000 00 00'), "'+32 2 000 00 00");
  assert.equal(exportsSvc.celluleCsv('-5'), "'-5");
  assert.equal(exportsSvc.celluleCsv('@cmd'), "'@cmd");
  assert.equal(exportsSvc.celluleCsv('a;b'), '"a;b"');
  assert.equal(exportsSvc.celluleCsv('ligne 1\nligne 2'), '"ligne 1\nligne 2"');
  assert.equal(exportsSvc.celluleCsv(null), '');
  assert.equal(exportsSvc.dateLocale('2026-07-01 22:30:00'), '02/07/2026 00:30', 'heure d’été : UTC+2');
  assert.equal(exportsSvc.dateLocale('2026-12-01 09:05:00'), '01/12/2026 10:05', 'heure d’hiver : UTC+1');
  assert.equal(exportsSvc.dateLocale(null), '');
});
