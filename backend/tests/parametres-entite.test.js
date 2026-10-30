/**
 * Paramètres métier par entité (cahier des charges ADM-03, SEC-01 ; standard v3.2, section 11.4).
 * Défauts livrés ; lecture par toute personne de l'entité ; réglage par le responsable du service technique ;
 * cloison entre entités ; contrôle selon le type ; retour au défaut ; journal avec l'entité ; MCP.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { getDb } = require('../src/database');
const pe = require('../src/services/parametres-entite');

let srv;
let admin;
let ea;
let eb;
let resp;
let respB;
let gest;
let agent;
let double;
const parse = (r) => JSON.parse(r.body.result.content[0].text);
const tool = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));
const val = (rows, cle) => rows.find((p) => p.cle === cle);

before(async () => {
  srv = await startServer();
  ({ admin, ea, eb } = await setup(srv.base));
  resp = await person(srv.base, admin, 'pe.resp@exemple.test', ea.id, [[ea.id, 'responsable']]);
  respB = await person(srv.base, admin, 'pe.respb@exemple.test', eb.id, [[eb.id, 'responsable']]);
  gest = await person(srv.base, admin, 'pe.gest@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  agent = await person(srv.base, admin, 'pe.agent@exemple.test', ea.id);
  double = await person(srv.base, admin, 'pe.double@exemple.test', ea.id, [[ea.id, 'responsable'], [eb.id, 'agent']]);
});
after(() => srv.stop());

test('défauts livrés : contact vide, délai de réouverture de 7 jours, numérotation DI annuelle ; libellés FR et NL', async () => {
  const r = await agent.get('/api/parametres-entite');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.data.map((p) => p.cle), ['contact.nom_fr', 'contact.nom_nl', 'contact.telephone', 'contact.courriel', 'urgence.telephone', 'demandes.delai_reouverture_jours', 'pieces.nombre_max', 'pieces.taille_max_mo', 'pieces.formats', 'numerotation.demande_type', 'numerotation.remise',
    'rgpd.dpo_contact', 'rgpd.mention_courte_fr', 'rgpd.mention_courte_nl', 'rgpd.mention_fr', 'rgpd.mention_nl']);
  for (const p of r.body.data) {
    assert.equal(p.entite_id, ea.id);
    assert.equal(p.est_defaut, true);
    for (const f of ['libelle_fr', 'libelle_nl', 'description_fr', 'description_nl']) assert.ok(p[f], `${p.cle} ${f}`);
  }
  assert.equal(val(r.body.data, 'contact.telephone').valeur, '');
  assert.equal(val(r.body.data, 'demandes.delai_reouverture_jours').valeur, '7');
  assert.equal(val(r.body.data, 'numerotation.demande_type').valeur, 'DI');
  assert.equal(val(r.body.data, 'numerotation.remise').valeur, 'annuelle');
  assert.equal((await agent.get('/api/parametres-entite?groupe=contact')).body.data.length, 4);
});

test('réglage par le responsable ; refusé au gestionnaire, au demandeur et à l’administrateur sans rôle', async () => {
  const r = await resp.put('/api/parametres-entite/contact.telephone', { valeur: ' 02 000 00 00 ' });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.valeur, '02 000 00 00');
  assert.equal(r.body.data.est_defaut, false);
  for (const c of [gest, agent, admin]) {
    const x = await c.put('/api/parametres-entite/contact.telephone', { valeur: '02 111 11 11' });
    assert.equal(x.status, 403);
  }
  assert.equal((await agent.get('/api/parametres-entite/contact.telephone')).body.data.valeur, '02 000 00 00', 'lisible par le demandeur');
});

test('cloison : chaque entité a sa valeur ; changer d’entité active change la valeur lue', async () => {
  await respB.put('/api/parametres-entite/contact.telephone', { valeur: '02 999 99 99' });
  assert.equal((await resp.get('/api/parametres-entite/contact.telephone')).body.data.valeur, '02 000 00 00');
  assert.equal((await respB.get('/api/parametres-entite/contact.telephone')).body.data.valeur, '02 999 99 99');
  assert.equal(pe.valeur(ea.id, 'contact.telephone'), '02 000 00 00');
  assert.equal(pe.valeur(eb.id, 'contact.telephone'), '02 999 99 99');
  await double.put('/api/auth/entite', { entite_id: eb.id });
  assert.equal((await double.get('/api/parametres-entite/contact.telephone')).body.data.valeur, '02 999 99 99');
  const x = await double.put('/api/parametres-entite/contact.telephone', { valeur: '02 555 55 55' });
  assert.equal(x.status, 403, 'responsable dans AA, simple demandeur dans BB : refus dans BB');
  assert.equal(pe.valeur(eb.id, 'contact.telephone'), '02 999 99 99');
  await double.put('/api/auth/entite', { entite_id: ea.id });
});

test('valeur contrôlée selon son type', async () => {
  const bad = async (cle, valeur) => {
    const r = await resp.put(`/api/parametres-entite/${cle}`, { valeur });
    assert.equal(r.status, 400, `${cle} = ${valeur}`);
    assert.equal(r.body.code, 'VALIDATION');
  };
  await bad('contact.telephone', 'appeler Jean');
  await bad('contact.courriel', 'pas-une-adresse');
  await bad('demandes.delai_reouverture_jours', '91');
  await bad('demandes.delai_reouverture_jours', '-1');
  await bad('demandes.delai_reouverture_jours', 'sept');
  await bad('contact.nom_fr', 'x'.repeat(201));
  assert.equal((await resp.put('/api/parametres-entite/demandes.delai_reouverture_jours', { valeur: '014' })).body.data.valeur, '14');
  assert.equal((await resp.put('/api/parametres-entite/contact.courriel', { valeur: 'service.technique@exemple.test' })).status, 200);
  assert.equal((await resp.put('/api/parametres-entite/inconnu.cle', { valeur: 'x' })).status, 404);
  assert.equal((await resp.put('/api/parametres-entite/contact.courriel', { valeur: 'a@b.test', entite_id: eb.id })).status, 400, 'entité dans le corps refusée');
});

test('journal d’audit avec l’entité, l’ancienne et la nouvelle valeur ; retour au défaut', async () => {
  const a = getDb().prepare("SELECT entite_id, details_json FROM audit_log WHERE action = 'parametre_entite.update' AND details_json LIKE '%delai%' ORDER BY id DESC").get();
  assert.equal(a.entite_id, ea.id);
  assert.deepEqual(JSON.parse(a.details_json), { cle: 'demandes.delai_reouverture_jours', avant: '7', apres: '14' });
  const r = await resp.del('/api/parametres-entite/demandes.delai_reouverture_jours', {});
  assert.equal(r.body.data.valeur, '7');
  assert.equal(r.body.data.est_defaut, true);
  assert.equal(getDb().prepare("SELECT entite_id FROM audit_log WHERE action = 'parametre_entite.reset' ORDER BY id DESC").get().entite_id, ea.id);
});

test('paramètres de l’entité par MCP : mêmes droits, retour au défaut en deux appels', async () => {
  assert.equal((await tool(agent, 'get_parametre_entite', { cle: 'contact.telephone' })).data.valeur, '02 000 00 00');
  assert.equal((await tool(gest, 'update_parametre_entite', { cle: 'urgence.telephone', valeur: '02 123 45 67' })).code, 'FORBIDDEN');
  assert.equal((await tool(resp, 'update_parametre_entite', { cle: 'urgence.telephone', valeur: '02 123 45 67' })).data.valeur, '02 123 45 67');
  assert.equal((await tool(gest, 'prepare_reset_parametre_entite', { cle: 'urgence.telephone' })).code, 'FORBIDDEN');
  const p = await tool(resp, 'prepare_reset_parametre_entite', { cle: 'urgence.telephone' });
  assert.equal(p.data.valeur, '02 123 45 67');
  assert.equal((await tool(resp, 'confirm_reset_parametre_entite', { confirmation_token: p.data.confirmation_token })).data.est_defaut, true);
  assert.equal(getDb().prepare("SELECT channel FROM audit_log WHERE action = 'parametre_entite.reset' ORDER BY id DESC").get().channel, 'mcp');
});
