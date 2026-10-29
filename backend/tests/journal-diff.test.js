/**
 * Journal d'audit des modifications (version 0.4.1, DV-04) : la modification d'une catégorie, d'un congé, d'une
 * fermeture, d'un lieu, d'une valeur de liste ou d'une entité ne note que les champs changés, avec l'ancienne et la
 * nouvelle valeur, comme pour les priorités et l'horaire. Un formulaire renvoyé sans changement n'ajoute aucune ligne.
 * Chaque cas renvoie le formulaire complet, comme l'écran, avec un seul champ modifié.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { getDb } = require('../src/database');

let srv;
let admin;
let ea;
let resp;

const lignes = (type, id) => getDb()
  .prepare('SELECT action, details_json FROM audit_log WHERE entity_type = ? AND entity_id = ? ORDER BY id')
  .all(type, id)
  .map((l) => ({ action: l.action, details: JSON.parse(l.details_json) }));

/** Envoie le formulaire complet avec un seul champ changé, vérifie la ligne notée, puis le renvoi sans changement. */
async function verifier(c, url, type, id, formulaire, champ, ancienne, nouvelle, identite) {
  const avant = lignes(type, id).length;
  const r = await c.put(url, { ...formulaire, [champ]: nouvelle });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const l = lignes(type, id);
  assert.equal(l.length, avant + 1, 'une ligne au journal');
  const d = l.at(-1).details;
  assert.deepEqual(d.avant, { [champ]: ancienne }, 'seul le champ changé, avec son ancienne valeur');
  assert.deepEqual(d.apres, { [champ]: nouvelle }, 'seul le champ changé, avec sa nouvelle valeur');
  for (const [k, v] of Object.entries(identite)) assert.equal(d[k], v, `la ligne porte ${k}`);
  const autres = Object.keys(d).filter((k) => !['avant', 'apres', ...Object.keys(identite)].includes(k));
  assert.deepEqual(autres, [], 'rien d’autre du formulaire');
  const r2 = await c.put(url, { ...formulaire, [champ]: nouvelle });
  assert.equal(r2.status, 200);
  assert.equal(lignes(type, id).length, avant + 1, 'sans changement, aucune ligne de plus');
}

before(async () => {
  srv = await startServer();
  ({ admin, ea } = await setup(srv.base));
  resp = await person(srv.base, admin, 'jd.resp@exemple.test', ea.id, [[ea.id, 'responsable']]);
});
after(() => srv.stop());

test('catégorie : seuls les champs changés, avec l’ancienne et la nouvelle valeur', async () => {
  const c = (await resp.get('/api/categories?niveau=domaine&limit=1')).body.data[0];
  const form = {
    code: c.code, libelle_fr: c.libelle_fr, libelle_nl: c.libelle_nl, icone: c.icone,
    priorite_defaut: c.priorite_defaut, validation: c.validation, delai_fin_jours: c.delai_fin_jours, ordre: c.ordre,
  };
  await verifier(resp, `/api/categories/${c.id}`, 'categorie', c.id, form, 'libelle_fr', c.libelle_fr, 'Mobilier de bureau', { code: c.code });
  // Une valeur vidée (null) est notée comme telle.
  const n = (await resp.get('/api/categories?niveau=nature&limit=1')).body.data[0];
  await resp.put(`/api/categories/${n.id}`, { delai_fin_jours: 7 });
  const nform = { code: n.code, libelle_fr: n.libelle_fr, libelle_nl: n.libelle_nl, delai_fin_jours: 7 };
  await verifier(resp, `/api/categories/${n.id}`, 'categorie', n.id, nform, 'delai_fin_jours', 7, null, { code: n.code });
});

test('congé : seuls les champs changés, avec la nature et la date pour le reconnaître', async () => {
  const j = (await resp.get('/api/jours-non-ouvres?nature=conge&limit=1')).body.data[0];
  const form = { mois_jour: j.mois_jour, libelle_fr: j.libelle_fr, libelle_nl: j.libelle_nl };
  await verifier(resp, `/api/jours-non-ouvres/${j.id}`, 'jour_non_ouvre', j.id, form, 'libelle_nl', j.libelle_nl, 'Verlofdag (test)',
    { nature: 'conge', mois_jour: j.mois_jour, date_debut: null });
});

test('fermeture : seuls les champs changés, la date de fin avant et après', async () => {
  const f = (await resp.post('/api/jours-non-ouvres', {
    nature: 'fermeture', date_debut: '2026-12-28', date_fin: '2026-12-30', libelle_fr: 'Fin d’année', libelle_nl: 'Eindejaar',
  })).body.data;
  const form = { date_debut: f.date_debut, date_fin: f.date_fin, libelle_fr: f.libelle_fr, libelle_nl: f.libelle_nl };
  await verifier(resp, `/api/jours-non-ouvres/${f.id}`, 'jour_non_ouvre', f.id, form, 'date_fin', '2026-12-30', '2026-12-31',
    { nature: 'fermeture', mois_jour: null, date_debut: '2026-12-28' });
});

test('lieu : seuls les champs changés', async () => {
  const l = (await resp.post('/api/lieux', { nature: 'site', code: 'JD1', nom_fr: 'Site', nom_nl: 'Site', commune: 'Démoville' })).body.data;
  const form = { code: l.code, nom_fr: l.nom_fr, nom_nl: l.nom_nl, adresse: l.adresse, code_postal: l.code_postal, commune: l.commune };
  await verifier(resp, `/api/lieux/${l.id}`, 'lieu', l.id, form, 'nom_fr', 'Site', 'Site renommé', { code: 'JD1' });
});

test('valeur de liste : seuls les champs changés, avec la liste et le code', async () => {
  const v = (await resp.get('/api/listes-valeurs?liste=type_lieu&limit=1')).body.data[0];
  const form = { libelle_fr: v.libelle_fr, libelle_nl: v.libelle_nl, ordre: v.ordre };
  await verifier(resp, `/api/listes-valeurs/${v.id}`, 'liste_valeur', v.id, form, 'ordre', v.ordre, v.ordre + 50,
    { liste: 'type_lieu', code: v.code });
});

test('entité : seuls les champs changés', async () => {
  const e = (await admin.get(`/api/entites/${ea.id}`)).body.data;
  const form = { code: e.code, nom_fr: e.nom_fr, nom_nl: e.nom_nl };
  await verifier(admin, `/api/entites/${e.id}`, 'entite', e.id, form, 'nom_nl', e.nom_nl, 'Fictief bestuur (test)', { code: e.code });
});
