/**
 * Demandes ouvertes du même bâtiment et « Moi aussi » (cahier des charges DEM-04 ; version 0.7.0, point 1).
 * Le « même bâtiment » est le bâtiment du lieu choisi et tous ses locaux ; un site entier si le lieu n'est dans aucun
 * bâtiment. Ni nom ni identifiant du demandeur pour les autres agents ; la remarque n'est lue que par le service technique.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { getDb } = require('../src/database');

let srv;
let admin;
let ea;
let agent1;
let agent2;
let agent3;
let gestA;
const L = {};
const C = {};
const D = {};
const parse = (r) => JSON.parse(r.body.result.content[0].text);
const call = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));
const voisines = (c, lieu, extra = '') => c.get(`/api/demandes/voisines?lieu_id=${lieu}${extra}`);

before(async () => {
  srv = await startServer();
  ({ admin, ea } = await setup(srv.base));
  agent1 = await person(srv.base, admin, 'agent1.vois@exemple.test', ea.id);
  agent2 = await person(srv.base, admin, 'agent2.vois@exemple.test', ea.id);
  agent3 = await person(srv.base, admin, 'agent3.vois@exemple.test', ea.id);
  gestA = await person(srv.base, admin, 'gest.vois@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  const lieu = async (body) => { const r = await gestA.post('/api/lieux', body); assert.equal(r.status, 201, JSON.stringify(r.body)); return r.body.data.id; };
  const type = (await gestA.get('/api/listes-valeurs?liste=type_lieu')).body.data[0].id;
  L.site = await lieu({ nature: 'site', code: 'MC', nom_fr: 'Site administratif', nom_nl: 'Administratieve site' });
  L.batA = await lieu({ nature: 'batiment', parent_id: L.site, code: 'MC-A', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis' });
  L.niv = await lieu({ nature: 'niveau', parent_id: L.batA, code: 'MC-A-0', nom_fr: 'Rez-de-chaussée', nom_nl: 'Gelijkvloers' });
  L.acc33 = await lieu({ nature: 'local', parent_id: L.niv, code: 'MC-A-33', nom_fr: 'Accueil du 33', nom_nl: 'Onthaal 33', type_id: type });
  L.accPop = await lieu({ nature: 'local', parent_id: L.niv, code: 'MC-A-POP', nom_fr: 'Accueil Population', nom_nl: 'Onthaal Bevolking', type_id: type });
  L.batB = await lieu({ nature: 'batiment', parent_id: L.site, code: 'MC-B', nom_fr: 'Annexe', nom_nl: 'Bijgebouw' });
  L.annexe = await lieu({ nature: 'local', parent_id: L.batB, code: 'MC-B-1', nom_fr: 'Bureau annexe', nom_nl: 'Bureau bijgebouw', type_id: type });
  L.parking = await lieu({ nature: 'local', parent_id: L.site, code: 'MC-P', nom_fr: 'Parking', nom_nl: 'Parking', type_id: type });
  C.eclairage = (await agent1.get('/api/categories?niveau=nature&q=eclairage')).body.data[0].id;
  C.autre = (await agent1.get('/api/categories?niveau=nature&limit=200')).body.data.find((c) => c.id !== C.eclairage).id;
  const deposer = async (c, lieuId, cat, description) => {
    const r = await c.post('/api/demandes', { lieu_id: lieuId, categorie_id: cat, description });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    return r.body.data;
  };
  D.pop = await deposer(agent1, L.accPop, C.eclairage, 'Le néon de l’accueil Population clignote depuis lundi matin, il fait très sombre au guichet 2.');
  D.acc33 = await deposer(agent1, L.acc33, C.autre, 'La porte de l’accueil du 33 ferme mal.');
  D.annexe = await deposer(agent1, L.annexe, C.eclairage, 'Lampe en panne au bureau de l’annexe.');
  D.close = await deposer(agent1, L.accPop, C.eclairage, 'Ancienne demande déjà réglée à l’accueil.');
  getDb().prepare("UPDATE demandes SET etat = 'cloturee' WHERE id = ?").run(D.close.id);
});
after(() => srv.stop());

test('même bâtiment : les demandes ouvertes de la Maison communale, pas celles de l’annexe ni les closes', async () => {
  const r = await voisines(agent2, L.acc33);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const v = r.body.data;
  assert.equal(v.batiment.id, L.batA);
  assert.equal(v.batiment.nom_fr, 'Maison communale');
  assert.equal(v.total, 2);
  assert.deepEqual(v.demandes.map((d) => d.id), [D.acc33.id, D.pop.id], 'même local en tête');
  assert.equal(v.demandes[0].meme_lieu, 1);
  assert.equal(v.demandes[1].meme_lieu, 0);
  assert.ok(!v.demandes.some((d) => d.id === D.annexe.id || d.id === D.close.id));
});

test('aucun nom ni identifiant de demandeur ; début de la description limité à 60 caractères', async () => {
  const v = (await voisines(agent2, L.accPop)).body.data;
  const pop = v.demandes.find((d) => d.id === D.pop.id);
  assert.ok(pop.extrait.length <= 60);
  assert.ok(pop.extrait.endsWith('…'));
  assert.ok(D.pop.description.startsWith(pop.extrait.slice(0, -1)));
  const court = v.demandes.find((d) => d.id === D.acc33.id);
  assert.equal(court.extrait, D.acc33.description, 'une description courte est rendue entière');
  for (const d of v.demandes) {
    assert.ok(!('demandeur_id' in d) && !('demandeur_nom' in d) && !('demandeur_prenom' in d) && !('description' in d), Object.keys(d).join());
    assert.equal(d.propre, 0);
  }
  assert.doesNotMatch(JSON.stringify(v), /agent1\.vois|Agent1/i);
});

test('ordre : même local, puis même catégorie, puis les plus récentes ; limite et total', async () => {
  const v = (await voisines(agent2, L.acc33, `&categorie_id=${C.eclairage}`)).body.data;
  assert.deepEqual(v.demandes.map((d) => d.id), [D.acc33.id, D.pop.id], 'le même local passe avant la même catégorie');
  const un = (await voisines(agent2, L.acc33, '&limit=1')).body.data;
  assert.equal(un.total, 2);
  assert.equal(un.demandes.length, 1);
  assert.equal((await voisines(agent2, L.acc33, '&limit=0')).status, 400);
});

test('un site choisi vaut pour tous ses bâtiments ; un local hors bâtiment se range sous son site', async () => {
  const site = (await voisines(agent2, L.site)).body.data;
  assert.equal(site.batiment.id, L.site);
  assert.equal(site.total, 3);
  const parking = (await voisines(agent2, L.parking)).body.data;
  assert.equal(parking.batiment.id, L.site);
  assert.equal(parking.total, 3);
  const niveau = (await voisines(agent2, L.niv)).body.data;
  assert.equal(niveau.batiment.id, L.batA, 'un niveau remonte à son bâtiment');
});

test('le demandeur voit sa propre demande marquée « propre » ; lieu inconnu 404', async () => {
  const v = (await voisines(agent1, L.acc33)).body.data;
  assert.ok(v.demandes.every((d) => d.propre === 1));
  assert.equal((await voisines(agent1, 999999)).status, 404);
});

test('« Moi aussi » : la demande rejointe est suivie, lisible sans le nom du demandeur, dans « Mes demandes »', async () => {
  const r = await agent2.post(`/api/demandes/${D.pop.id}/suivre`, { remarque: '  Chez nous aussi, au guichet 4.  ' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const d = r.body.data;
  assert.equal(d.numero, D.pop.numero);
  assert.equal(d.suivie, 1);
  assert.equal(d.nb_suiveurs, 1);
  assert.equal(d.demandeur_id, null);
  assert.equal(d.demandeur_prenom, null);
  assert.equal(d.demandeur_nom, null);
  assert.equal(d.suiveurs, undefined, 'la remarque n’est pas rendue à l’agent');
  const mes = (await agent2.get('/api/demandes')).body.data;
  assert.deepEqual(mes.map((x) => x.id), [D.pop.id]);
  assert.equal(mes[0].suivie, 1);
  assert.equal(mes[0].demandeur_nom, null);
  assert.equal((await agent2.get(`/api/demandes/${D.pop.id}`)).status, 200);
  assert.equal((await agent2.get(`/api/demandes/${D.acc33.id}`)).status, 403, 'une demande voisine non suivie reste fermée');
  const v = (await voisines(agent2, L.accPop)).body.data;
  assert.equal(v.demandes.find((x) => x.id === D.pop.id).suivie, 1);
});

test('« Moi aussi » : un second appel ne change rien ; journal sans la remarque', async () => {
  const r = await agent2.post(`/api/demandes/${D.pop.id}/suivre`, { remarque: 'Double clic' });
  assert.equal(r.status, 200);
  const db = getDb();
  const rows = db.prepare('SELECT remarque, canal FROM demande_suiveurs WHERE demande_id = ?').all(D.pop.id);
  assert.deepEqual(rows, [{ remarque: 'Chez nous aussi, au guichet 4.', canal: 'ecran' }]);
  const j = db.prepare("SELECT details_json AS details, entite_id FROM audit_log WHERE action = 'demande.suivre'").all();
  assert.equal(j.length, 1);
  assert.equal(j[0].entite_id, ea.id);
  assert.doesNotMatch(j[0].details, /guichet/);
  assert.deepEqual(JSON.parse(j[0].details), { numero: D.pop.numero, remarque: 1 });
});

test('service technique : nom et remarque des personnes qui suivent ; le demandeur voit seulement leur nombre', async () => {
  const g = (await gestA.get(`/api/demandes/${D.pop.id}`)).body.data;
  assert.equal(g.suiveurs.length, 1);
  assert.equal(g.suiveurs[0].remarque, 'Chez nous aussi, au guichet 4.');
  assert.ok(g.suiveurs[0].nom);
  assert.ok(g.demandeur_nom, 'le gestionnaire garde le nom du demandeur');
  const a = (await agent1.get(`/api/demandes/${D.pop.id}`)).body.data;
  assert.equal(a.suiveurs, undefined);
  assert.equal(a.nb_suiveurs, 1);
  assert.equal(a.suivie, 0);
  assert.ok(a.demandeur_nom, 'le demandeur garde son propre nom');
  assert.doesNotMatch(JSON.stringify(a), /guichet 4/);
});

test('« Moi aussi » refusé : sa propre demande, une demande close, une demande inconnue', async () => {
  const propre = await agent1.post(`/api/demandes/${D.pop.id}/suivre`, {});
  assert.equal(propre.status, 409);
  assert.equal(propre.body.code, 'DEMANDE_PROPRE');
  const close = await agent3.post(`/api/demandes/${D.close.id}/suivre`, {});
  assert.equal(close.status, 409);
  assert.equal(close.body.code, 'DEMANDE_FERMEE');
  assert.equal((await agent3.post('/api/demandes/999999/suivre', {})).status, 404);
  assert.equal((await agent3.post(`/api/demandes/${D.pop.id}/suivre`, { inconnu: 1 })).status, 400);
  assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM demande_suiveurs WHERE user_id = ?').get(agent3.id).n, 0);
});

test('remarque faite d’espaces : aucune remarque enregistrée', async () => {
  const r = await agent3.post(`/api/demandes/${D.acc33.id}/suivre`, { remarque: '    ' });
  assert.equal(r.status, 200);
  assert.equal(getDb().prepare('SELECT remarque FROM demande_suiveurs WHERE demande_id = ? AND user_id = ?').get(D.acc33.id, agent3.id).remarque, null);
});

test('MCP : list_demandes_voisines et suivre_demande, mêmes règles, canal noté', async () => {
  const v = await call(agent3, 'list_demandes_voisines', { lieu_id: L.annexe });
  assert.equal(v.data.total, 1);
  assert.equal(v.data.demandes[0].id, D.annexe.id);
  assert.ok(!('demandeur_nom' in v.data.demandes[0]));
  const s = await call(agent3, 'suivre_demande', { id: D.annexe.id, remarque: 'Même panne à côté.' });
  assert.equal(s.data.suivie, 1);
  assert.equal(getDb().prepare('SELECT canal FROM demande_suiveurs WHERE demande_id = ? AND user_id = ?').get(D.annexe.id, agent3.id).canal, 'mcp');
  assert.equal((await call(agent1, 'suivre_demande', { id: D.annexe.id })).code, 'DEMANDE_PROPRE');
  assert.equal(getDb().prepare("SELECT channel FROM audit_log WHERE action = 'demande.suivre' ORDER BY id DESC").get().channel, 'mcp');
});
