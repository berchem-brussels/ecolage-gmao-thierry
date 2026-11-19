/**
 * Corps de métier et compétences des ouvriers (0.19.0, étape 15, point 1 ; cahier des charges ROL-05 ; DV-154) :
 * deux listes de valeurs de plus, propres à chaque entité, réglées par le responsable (listes:gerer), lues par tous les
 * rôles de l'entité ; valeurs livrées créées pour chaque entité, y compris sur une installation existante (démarrage).
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { getDb } = require('../src/database');
const listes = require('../src/services/listes-valeurs');

const CORPS = ['electricite', 'plomberie', 'chauffage', 'menuiserie', 'maconnerie', 'peinture', 'serrurerie', 'espaces_verts', 'proprete',
  'manutention', 'polyvalent'];
const COMPETENCES = ['ba4', 'ba5', 'vca', 'hauteur', 'nacelle', 'chariot', 'permis_c', 'soudure', 'tronconneuse', 'phytolicence', 'secourisme'];

let srv;
let admin;
let ea;
let eb;
let resp;
let respB;
let gest;
let agent;

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  resp = await person(srv.base, admin, 'resp.met@exemple.test', ea.id, [[ea.id, 'responsable']]);
  respB = await person(srv.base, admin, 'respb.met@exemple.test', eb.id, [[eb.id, 'responsable']]);
  gest = await person(srv.base, admin, 'gest.met@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  agent = await person(srv.base, admin, 'agent.met@exemple.test', ea.id);
});
after(() => srv.stop());

const codes = async (c, liste) => (await c.get(`/api/listes-valeurs?liste=${liste}&limit=200`)).body.data.map((v) => v.code);

test('valeurs livrées dans chaque entité, dans l’ordre, en FR et NL ; lues par un demandeur', async () => {
  assert.deepEqual(await codes(agent, 'corps_metier'), CORPS);
  assert.deepEqual(await codes(agent, 'competence'), COMPETENCES);
  assert.deepEqual(await codes(respB, 'corps_metier'), CORPS, 'seconde entité, créée après l’installation');
  const v = (await agent.get('/api/listes-valeurs?liste=competence&q=ba5')).body.data[0];
  assert.equal(v.libelle_fr, 'BA5 : personne qualifiée (électricité)');
  assert.equal(v.libelle_nl, 'BA5: vakbekwaam persoon (elektriciteit)');
});

test('le responsable règle les deux listes ; gestionnaire et demandeur refusés (403)', async () => {
  const corps = { liste: 'corps_metier', code: 'vitrerie', libelle_fr: 'Vitrerie', libelle_nl: 'Glaswerk' };
  assert.equal((await gest.post('/api/listes-valeurs', corps)).status, 403);
  assert.equal((await agent.post('/api/listes-valeurs', corps)).status, 403);
  const r = await resp.post('/api/listes-valeurs', corps);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal((await resp.post('/api/listes-valeurs', corps)).status, 409, 'code unique dans la liste et l’entité');
  const comp = await resp.post('/api/listes-valeurs', { liste: 'competence', code: 'amiante', libelle_fr: 'Amiante', libelle_nl: 'Asbest' });
  assert.equal(comp.status, 201);
  assert.equal((await gest.put(`/api/listes-valeurs/${comp.body.data.id}`, { libelle_fr: 'Autre' })).status, 403);
  assert.equal((await resp.put(`/api/listes-valeurs/${comp.body.data.id}`, { libelle_fr: 'Amiante (retrait)' })).body.data.libelle_fr, 'Amiante (retrait)');
});

test('cloison : une valeur de l’autre entité n’est ni lue ni modifiée (403) ; chaque entité garde ses listes', async () => {
  const idB = (await respB.get('/api/listes-valeurs?liste=corps_metier&q=peinture')).body.data[0].id;
  assert.equal((await resp.get(`/api/listes-valeurs/${idB}`)).status, 403);
  assert.equal((await resp.put(`/api/listes-valeurs/${idB}`, { libelle_fr: 'Pris' })).status, 403);
  assert.equal((await resp.del(`/api/listes-valeurs/${idB}`, { motif: 'essai' })).status, 403);
  assert.ok(!(await codes(respB, 'corps_metier')).includes('vitrerie'), 'la valeur ajoutée par AA reste dans AA');
});

test('installation existante : les listes nouvelles sont créées au démarrage ; une valeur retirée n’est pas recréée', async () => {
  const db = getDb();
  const id = (await resp.get('/api/listes-valeurs?liste=competence&q=tronconneuse')).body.data[0].id;
  assert.equal((await resp.del(`/api/listes-valeurs/${id}`, { motif: 'Pas de tronçonneuse au service' })).status, 200);
  // Une installation de la 0.18.0 n'a aucune valeur de ces listes : on retire celles des compétences pour BB (celles des
  // corps de métier sont désormais portées par les catégories livrées, 0.19.0 point 4), puis on rejoue le démarrage.
  db.prepare("DELETE FROM listes_valeurs WHERE entite_id = ? AND liste = 'competence'").run(eb.id);
  assert.deepEqual(await codes(respB, 'competence'), []);
  listes.seedAll();
  assert.deepEqual(await codes(respB, 'competence'), COMPETENCES);
  const t = db.prepare('SELECT is_active, motif_desactivation FROM listes_valeurs WHERE id = ?').get(id);
  assert.deepEqual({ ...t }, { is_active: 0, motif_desactivation: 'Pas de tronçonneuse au service' }, 'jamais réactivée');
});

test('liste inconnue refusée (400)', async () => {
  assert.equal((await resp.post('/api/listes-valeurs', { liste: 'metier', code: 'xx', libelle_fr: 'X', libelle_nl: 'X' })).status, 400);
  assert.equal((await agent.get('/api/listes-valeurs?liste=metier')).status, 400);
});
