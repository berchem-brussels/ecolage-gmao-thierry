/**
 * Mention « Modifié le … par … » (version 0.4.1, DV-04) sur les fiches de catégorie, de priorité, de jour de l'horaire,
 * de congé et de fermeture : valeur livrée, créée, modifiée, rétablie ; nom rendu aux seules personnes de l'entité.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { getDb } = require('../src/database');
const { trace } = require('../src/services/trace');

let srv;
let admin;
let ea;
let eb;
let resp;
let gest;
let respB;

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const NOM = 'Prénom Nom';

/** Recule la création d'une fiche d'une minute : une modification faite dans la même seconde reste distincte. */
const RECULER = {
  categories: "UPDATE categories SET created_at = datetime(created_at, '-1 minute'), updated_at = datetime(updated_at, '-1 minute') WHERE id = ?",
  jours: "UPDATE jours_non_ouvres SET created_at = datetime(created_at, '-1 minute'), updated_at = datetime(updated_at, '-1 minute') WHERE id = ?",
};
const reculer = (table, id) => getDb().prepare(RECULER[table]).run(id);

function attendu(t, etat, avecNom = true) {
  assert.equal(t.etat, etat);
  if (etat === 'livree') { assert.equal(t.le, null); assert.equal(t.par, null); return; }
  assert.match(t.le, ISO);
  assert.equal(t.par, avecNom ? NOM : null);
}

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  resp = await person(srv.base, admin, 'tr.resp@exemple.test', ea.id, [[ea.id, 'responsable']]);
  gest = await person(srv.base, admin, 'tr.gest@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  respB = await person(srv.base, admin, 'tr.respb@exemple.test', eb.id, [[eb.id, 'responsable']]);
});
after(() => srv.stop());

test('les fiches livrées portent « Valeur livrée », sans date ni nom, et pas d’identifiant d’auteur', async () => {
  const p = (await resp.get('/api/priorites')).body.data[0];
  attendu(p.trace, 'livree');
  assert.equal('updated_by' in p, false);
  attendu((await resp.get('/api/horaires/3')).body.data.trace, 'livree');
  const c = (await resp.get('/api/categories?limit=1')).body.data[0];
  attendu(c.trace, 'livree');
  assert.equal('created_by' in c, false);
  const arbre = (await resp.get('/api/categories/arbre')).body.data;
  attendu(arbre.domaines[0].trace, 'livree');
  attendu(arbre.domaines[0].natures[0].trace, 'livree');
  attendu((await resp.get('/api/jours-non-ouvres?nature=conge&limit=1')).body.data[0].trace, 'livree');
});

test('priorité : modifiée par …, puis « Valeur livrée, rétablie » après le retour à la valeur livrée', async () => {
  const m = await resp.put('/api/priorites/P3', { libelle_fr: 'Normale (test)' });
  attendu(m.body.data.trace, 'modifiee');
  attendu((await gest.get('/api/priorites/P3')).body.data.trace, 'modifiee', true);
  const r = await resp.del('/api/priorites/P3', {});
  assert.equal(r.body.data.est_defaut, true);
  attendu(r.body.data.trace, 'retablie');
});

test('jour de l’horaire : modifié, puis rétabli', async () => {
  attendu((await resp.put('/api/horaires/2', { debut: '08:00', fin: '15:00' })).body.data.trace, 'modifiee');
  attendu((await resp.del('/api/horaires/2', {})).body.data.trace, 'retablie');
  attendu((await resp.get('/api/horaires')).body.data.find((h) => h.jour === 2).trace, 'retablie');
});

test('catégorie : livrée modifiée ; créée à l’écran, puis modifiée', async () => {
  const c = (await resp.get('/api/categories?niveau=domaine&limit=1')).body.data[0];
  attendu((await resp.put(`/api/categories/${c.id}`, { libelle_nl: 'Test' })).body.data.trace, 'modifiee');
  const n = await resp.post('/api/categories', { code: 'tr_cat', libelle_fr: 'Catégorie test', libelle_nl: 'Testcategorie', priorite_defaut: 'P3', validation: 0 });
  assert.equal(n.status, 201, JSON.stringify(n.body));
  attendu(n.body.data.trace, 'creee');
  attendu((await gest.get(`/api/categories/${n.body.data.id}`)).body.data.trace, 'creee');
  reculer('categories', n.body.data.id);
  attendu((await resp.put(`/api/categories/${n.body.data.id}`, { ordre: 999 })).body.data.trace, 'modifiee');
});

test('congé et fermeture : créés, puis modifiés ; congé livré modifié', async () => {
  const conge = (await resp.get('/api/jours-non-ouvres?nature=conge&limit=1')).body.data[0];
  attendu((await resp.put(`/api/jours-non-ouvres/${conge.id}`, { libelle_fr: 'Congé (test)' })).body.data.trace, 'modifiee');
  const f = await resp.post('/api/jours-non-ouvres', { nature: 'fermeture', date_debut: '2026-12-28', date_fin: '2026-12-30', libelle_fr: 'Fin d’année', libelle_nl: 'Eindejaar' });
  attendu(f.body.data.trace, 'creee');
  reculer('jours', f.body.data.id);
  attendu((await resp.put(`/api/jours-non-ouvres/${f.body.data.id}`, { date_fin: '2026-12-31' })).body.data.trace, 'modifiee');
  const c2 = await resp.post('/api/jours-non-ouvres', { nature: 'conge', mois_jour: '06-02', libelle_fr: 'Congé local', libelle_nl: 'Lokale verlofdag' });
  attendu(c2.body.data.trace, 'creee');
});

test('nom rendu aux seules personnes de l’entité : la cloison refuse les autres, la trace ne rend que la date', async () => {
  const id = (await resp.get('/api/categories?niveau=domaine&limit=1')).body.data[0].id;
  assert.equal((await respB.get(`/api/categories/${id}`)).status, 403, 'une personne d’une autre entité ne lit pas la fiche');
  const ligne = getDb().prepare('SELECT entite_id, created_by, updated_by, created_at, updated_at FROM categories WHERE id = ?').get(id);
  const t1 = trace({ id: 999, entiteId: eb.id, roles: ['responsable'] }, ligne);
  assert.equal(t1.etat, 'modifiee');
  assert.match(t1.le, ISO);
  assert.equal(t1.par, null, 'hors de l’entité : pas de nom');
  assert.equal(trace({ id: 999, entiteId: ea.id, roles: [] }, ligne).par, null, 'sans rôle dans l’entité : pas de nom');
  assert.equal(trace({ id: 999, entiteId: ea.id, roles: ['agent'] }, ligne).par, NOM, 'personne de l’entité : le nom');
});
