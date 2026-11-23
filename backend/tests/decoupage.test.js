/**
 * Découpage d'une demande en plusieurs (0.16.0, étape 12, point 5 ; GES-06) : demandes nouvelles liées à l'origine,
 * même demandeur et mêmes abonnés, « À qualifier », délais depuis la réception de l'origine ; origine inchangée ;
 * refus codés, tout ou rien ; cloison ; MCP en deux appels ; journal sans texte libre.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { getDb } = require('../src/database');

let srv;
let admin;
let ea;
let eb;
let gest;
let gestB;
let agent;
let suiveur;
let lieu;
let lieu2;
let lieuB;
let eclairage;
let plomberie;

const parse = (r) => JSON.parse(r.body.result.content[0].text);
const tool = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));
async function deposer(description = 'La lampe du couloir est grillée et le robinet de la cuisine fuit.') {
  const r = await agent.post('/api/demandes', { lieu_id: lieu, categorie_id: eclairage.id, description });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.data;
}
const nb = () => getDb().prepare('SELECT COUNT(*) AS n FROM demandes').get().n;

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  gest = await person(srv.base, admin, 'gest.dec@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  gestB = await person(srv.base, admin, 'gest.decb@exemple.test', eb.id, [[eb.id, 'gestionnaire']]);
  agent = await person(srv.base, admin, 'agent.dec@exemple.test', ea.id);
  suiveur = await person(srv.base, admin, 'suiveur.dec@exemple.test', ea.id);
  lieu = (await gest.post('/api/lieux', { nature: 'site', code: 'DC', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis' })).body.data.id;
  lieu2 = (await gest.post('/api/lieux', { nature: 'site', code: 'DD', nom_fr: 'École', nom_nl: 'School' })).body.data.id;
  lieuB = (await gestB.post('/api/lieux', { nature: 'site', code: 'DB', nom_fr: 'Centre', nom_nl: 'Centrum' })).body.data.id;
  eclairage = (await gest.get('/api/categories?niveau=nature&q=eclairage')).body.data[0];
  plomberie = (await gest.get('/api/categories?niveau=nature&q=fuite')).body.data[0];
  assert.ok(plomberie, 'une nature de la plomberie livrée');
});
after(() => srv.stop());

test('découpage : demandes nouvelles liées à l’origine, demandeur et abonnés gardés, délais depuis la réception ; origine inchangée', async () => {
  const o = await deposer();
  await suiveur.post(`/api/demandes/${o.id}/suivre`, { remarque: 'Chez nous aussi.' });
  getDb().prepare("UPDATE demandes SET created_at = datetime('now', '-2 days') WHERE id = ?").run(o.id);
  const r = await gest.post(`/api/demandes/${o.id}/decouper`, {
    parties: [{ description: 'Le robinet de la cuisine fuit.', categorie_id: plomberie.id }, { description: 'Prise électrique de l’école arrachée.', lieu_id: lieu2 }],
    commentaire: 'Deux problèmes, deux demandes.',
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.data.id, o.id, 'rend la fiche de l’origine');
  assert.equal(r.body.data.etat, 'a_qualifier', 'origine inchangée');
  assert.equal(r.body.data.description, o.description);
  assert.deepEqual(r.body.data.nouvelles.map((x) => x.numero), ['AA-DI-2026-00002', 'AA-DI-2026-00003']);
  assert.deepEqual(r.body.data.issues.map((x) => x.numero), ['AA-DI-2026-00002', 'AA-DI-2026-00003']);
  const [n1, n2] = r.body.data.nouvelles;
  const f1 = (await agent.get(`/api/demandes/${n1.id}`)).body.data;
  assert.deepEqual([f1.demandeur_id, f1.categorie_id, f1.lieu_id, f1.etat, f1.issue_de, f1.issue_de_numero], [agent.id, plomberie.id, lieu, 'a_qualifier', o.id, o.numero]);
  const f2 = (await gest.get(`/api/demandes/${n2.id}`)).body.data;
  assert.deepEqual([f2.categorie_id, f2.lieu_id], [eclairage.id, lieu2], 'catégorie de l’origine, lieu donné');
  const row = getDb().prepare('SELECT decompte_depuis, created_by FROM demandes WHERE id = ?').get(n1.id);
  const origine = getDb().prepare('SELECT created_at FROM demandes WHERE id = ?').get(o.id);
  assert.equal(row.decompte_depuis, origine.created_at, 'délais comptés depuis la réception de l’origine');
  assert.equal(row.created_by, gest.id);
  assert.deepEqual(getDb().prepare('SELECT user_id, remarque FROM demande_suiveurs WHERE demande_id = ?').all(n1.id), [{ user_id: suiveur.id, remarque: 'Chez nous aussi.' }]);
  const h = (await agent.get(`/api/demandes/${n1.id}/historique`)).body.data;
  assert.deepEqual([h[0].vers_etat, h[0].commentaire, h[0].auteur], ['a_qualifier', 'Deux problèmes, deux demandes.', 'service']);
  assert.ok((await agent.get('/api/demandes')).body.data.some((x) => x.id === n1.id), 'dans « Mes demandes » du demandeur');
  const j = JSON.parse(getDb().prepare("SELECT details_json FROM audit_log WHERE action = 'demande.decoupage' AND entity_id = ?").get(o.id).details_json);
  assert.deepEqual(j, { numero: o.numero, nouvelles: ['AA-DI-2026-00002', 'AA-DI-2026-00003'], commentaire_donne: 1 });
  const jc = JSON.parse(getDb().prepare("SELECT details_json FROM audit_log WHERE action = 'demande.create' AND entity_id = ?").get(n1.id).details_json);
  assert.equal(jc.issue_de, o.id);
  const ligne = (await admin.get('/api/audit?action=demande.create&limit=200')).body.data.find((l) => l.entity_id === n1.id);
  assert.deepEqual([ligne.noms.issue_de.type, ligne.noms.issue_de.code], ['demande', o.numero], 'origine nommée par son numéro au journal');
  assert.equal((await gest.get(`/api/demandes/${o.id}`)).body.data.decoupable, 1);
  assert.equal((await agent.get(`/api/demandes/${o.id}`)).body.data.decoupable, 0);
});

test('refus : demandeur, état, partie hors de l’entité ou trop courte ; tout ou rien', async () => {
  const o = await deposer('Deux soucis : la vitre et la porte du local 4.');
  const avant = nb();
  assert.equal((await agent.post(`/api/demandes/${o.id}/decouper`, { parties: [{ description: 'La porte du local 4 coince.' }] })).status, 403);
  assert.equal((await gest.post(`/api/demandes/${o.id}/decouper`, { parties: [{ description: 'court' }] })).status, 400);
  assert.equal((await gest.post(`/api/demandes/${o.id}/decouper`, { parties: [] })).status, 400);
  const hors = await gest.post(`/api/demandes/${o.id}/decouper`, { parties: [{ description: 'La porte du local 4 coince.' }, { description: 'Lieu de l’autre entité.', lieu_id: lieuB }] });
  assert.equal(hors.status, 403, 'lieu de l’autre entité');
  assert.equal(nb(), avant, 'aucune demande créée par un refus (tout ou rien)');
  assert.equal((await gestB.post(`/api/demandes/${o.id}/decouper`, { parties: [{ description: 'Depuis l’autre entité.' }] })).status, 403);
  await agent.del(`/api/demandes/${o.id}`, { motif: 'Réglé.' });
  assert.equal((await gest.post(`/api/demandes/${o.id}/decouper`, { parties: [{ description: 'La porte du local 4 coince.' }] })).body.code, 'DECOUPAGE_ETAT');
  assert.equal(nb(), avant);
});

test('MCP : deux appels, effet décrit avant ; numérotation sans trou', async () => {
  const o = await deposer('Néon et radiateur en panne au deuxième.');
  const p = await tool(gest, 'prepare_decouper_demande', { id: o.id, parties: [{ description: 'Radiateur froid au deuxième.' }] });
  assert.deepEqual([p.data.demande.numero, p.data.nouvelles], [o.numero, 1]);
  const avant = nb();
  const c = await tool(gest, 'confirm_decouper_demande', { confirmation_token: p.data.confirmation_token });
  assert.equal(nb(), avant + 1);
  const seq = getDb().prepare('SELECT sequence FROM demandes ORDER BY sequence').all().map((x) => x.sequence);
  assert.deepEqual(seq, seq.map((_, i) => i + 1), 'aucun trou');
  assert.equal(c.data.nouvelles.length, 1);
});
