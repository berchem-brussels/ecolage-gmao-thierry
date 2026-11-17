/**
 * Modèles de courriel (0.17.0, étape 13, point 3 ; NOT-04, NOT-06, LNG-05) : livrés pour chaque événement, réservés à
 * l'administrateur ; variables admises seulement et {numero} dans chaque langue ; modification et retour au texte livré
 * journalisés sans texte ; composition dans la langue du destinataire, pied fixe, lien complet ou phrase de repli ;
 * aperçu sans envoi ; MCP.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, setup, person } = require('./helpers');
const { getDb } = require('../src/database');

let srv;
let admin;
let ea;
let gest;

const parse = (r) => JSON.parse(r.body.result.content[0].text);
const outil = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));
const CAT = require('../config/modeles-courriel.json');
const EVENEMENTS = require('../config/notifications.json').evenements;

before(async () => {
  srv = await startServer();
  ({ admin, ea } = await setup(srv.base));
  gest = await person(srv.base, admin, 'gest.modc@exemple.test', ea.id, [[ea.id, 'gestionnaire'], [ea.id, 'responsable']]);
});
after(() => srv.stop());

test('modèles livrés : un par événement de la demande et des tickets, variantes de l’accusé ; variables admises seulement ; FR et NL', async () => {
  const r = await admin.get('/api/modeles-courriel');
  assert.equal(r.status, 200);
  const codes = r.body.data.map((m) => m.code);
  for (const e of EVENEMENTS.filter((x) => x.module === 'demandes' || x.module === null)) assert.ok(codes.includes(e.code), `modèle de ${e.code}`);
  for (const v of ['demande.recue.validation', 'demande.recue.beneficiaire']) assert.ok(codes.includes(v), v);
  assert.deepEqual(r.body.meta.variables, ['numero', 'lieu', 'etat', 'delai', 'lien', 'entite', 'application']);
  for (const m of r.body.data) {
    assert.equal(m.texte_livre, 1);
    assert.equal(m.trace.etat, 'livree');
    assert.ok(m.libelle_fr && m.libelle_nl, m.code);
    for (const l of ['fr', 'nl']) {
      assert.ok(`${m[`sujet_${l}`]} ${m[`corps_${l}`]}`.includes('{numero}'), `${m.code} ${l} : {numero}`);
      for (const v of `${m[`sujet_${l}`]} ${m[`corps_${l}`]}`.matchAll(/\{([^{}\s]+)\}/g)) assert.ok(CAT.variables.includes(v[1]), `${m.code} : {${v[1]}}`);
      assert.doesNotMatch(m[`sujet_${l}`], /[\r\n]/);
    }
  }
  assert.equal(r.body.data.find((m) => m.code === 'demande.recue.validation').libelle_fr, 'Accusé de réception d\'une demande (demande à valider)');
});

test('réservé à l’administrateur (API et MCP)', async () => {
  assert.equal((await gest.get('/api/modeles-courriel')).status, 403);
  assert.equal((await gest.put('/api/modeles-courriel/demande.recue', { sujet_fr: 'Piraté {numero}' })).status, 403);
  assert.equal((await outil(gest, 'list_modeles_courriel')).code, 'FORBIDDEN');
});

test('modification : variable inconnue refusée, {numero} exigé, sujet sur une ligne ; journal sans texte ; trace ; retour au texte livré', async () => {
  const u = '/api/modeles-courriel/demande.etat';
  const inconnue = await admin.put(u, { corps_fr: 'Bonjour {prenom}, demande {numero}.' });
  assert.equal(inconnue.status, 409);
  assert.equal(inconnue.body.code, 'MODELE_VARIABLE');
  assert.match(inconnue.body.message, /\{prenom\}/);
  const sansNumero = await admin.put(u, { sujet_nl: 'Statuswijziging', corps_nl: 'Uw aanvraag is gewijzigd.' });
  assert.equal(sansNumero.body.code, 'MODELE_SANS_NUMERO');
  assert.equal((await admin.put(u, { sujet_fr: 'Ligne\nInjectée {numero}' })).status, 400);
  assert.equal((await admin.put(u, {})).status, 400, 'au moins un champ');
  assert.equal((await admin.put('/api/modeles-courriel/demande.inconnu', { sujet_fr: 'X {numero}' })).status, 404);
  const r = await admin.put(u, { sujet_fr: 'Votre demande {numero} avance', corps_fr: 'La demande {numero} est maintenant : {etat}.\n{lien}' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.texte_livre, 0);
  assert.equal(r.body.data.trace.etat, 'modifiee');
  assert.equal(r.body.data.trace.par, 'Ada Admin');
  const j = JSON.parse(getDb().prepare("SELECT details_json FROM audit_log WHERE action = 'modele_courriel.update' ORDER BY id DESC").get().details_json);
  assert.deepEqual(j, { code: 'demande.etat', champs: ['sujet_fr', 'corps_fr'] }, 'les champs, jamais les textes');
  const re = await admin.post(`${u}/retablir`, {});
  assert.equal(re.body.data.texte_livre, 1);
  assert.equal(re.body.data.trace.etat, 'retablie');
  assert.equal(re.body.data.sujet_fr, CAT.modeles.find((m) => m.code === 'demande.etat').sujet_fr);
});

test('composition (LNG-05) : langue du destinataire, variables remplies, pied fixe, lien complet ou phrase de repli ; sujet sur une ligne', async () => {
  const { composer } = require('../src/services/modeles-courriel');
  const v = { numero: 'AA-DI-2026-00007', lieu: 'Maison communale', etat: 'Prise en charge', delai: 'pour le 20/11/2026', lien: '/demandes?demande=7', entite: 'Administration fictive' };
  const sansAdresse = composer('demande.recue', 'nl', v);
  assert.equal(sansAdresse.sujet, 'Aanvraag AA-DI-2026-00007 ontvangen');
  assert.match(sansAdresse.corps, /door de technische dienst\.\nEntiteit: Administration fictive\n/);
  assert.doesNotMatch(JSON.stringify(require('../config/modeles-courriel.json').modeles), / de \{entite\}| van \{entite\}/, 'jamais « de {entite} » : « de Administration », « de CPAS »');
  assert.match(sansAdresse.corps, /De aanvraag opvolgen: open .+ en zoek het nummer AA-DI-2026-00007/);
  assert.match(sansAdresse.corps, /Automatische e-mail van .+: antwoord er niet op\.$/);
  await admin.put('/api/settings/courriel', { public_url: 'https://gmao.exemple.test/' });
  const fr = composer('demande.recue', 'fr', v);
  assert.match(fr.corps, /Suivre la demande : https:\/\/gmao\.exemple\.test\/demandes\?demande=7/);
  assert.match(fr.corps, /Délai indicatif : pour le 20\/11\/2026/);
  const manque = composer('demande.recue', 'fr', { ...v, delai: null });
  assert.match(manque.corps, /Délai indicatif : —/, 'valeur absente : tiret');
  const injection = composer('demande.etat', 'fr', { ...v, etat: 'Prise\r\nBcc: pirate@exemple.test' });
  assert.doesNotMatch(injection.sujet, /[\r\n]/);
  const repli = composer('demande.recue.inconnue', 'fr', v);
  assert.equal(repli.sujet, 'Demande AA-DI-2026-00007 reçue', 'variante absente : modèle de l’événement');
  await admin.put('/api/settings/courriel', { public_url: '' });
});

test('aperçu : texte enregistré ou en cours de saisie, valeurs d’exemple, rien n’est envoyé ; variable inconnue refusée', async () => {
  const avant = getDb().prepare('SELECT COUNT(*) AS n FROM courriels').get().n;
  const r = await admin.post('/api/modeles-courriel/demande.validation_demandee/apercu', { langue: 'fr' });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.sujet, 'Demande AC-DI-2026-00042 à valider');
  assert.match(r.body.data.corps, /Lieu : Maison communale › Bureau 1\.04/);
  const essai = await admin.post('/api/modeles-courriel/demande.validation_demandee/apercu', { langue: 'nl', sujet: 'Te keuren: {numero}', corps: 'Aanvraag {numero} in {entite}.' });
  assert.equal(essai.body.data.sujet, 'Te keuren: AC-DI-2026-00042');
  assert.match(essai.body.data.corps, /^Aanvraag AC-DI-2026-00042 in Fictief bestuur\./);
  assert.equal((await admin.post('/api/modeles-courriel/demande.validation_demandee/apercu', { langue: 'fr', corps: '{numero} {nom}' })).body.code, 'MODELE_VARIABLE');
  assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM courriels').get().n, avant);
});

test('modèle livré ajouté par une version : créé s’il manque ; un modèle modifié n’est jamais remplacé', async () => {
  const db = getDb();
  await admin.put('/api/modeles-courriel/demande.retard', { sujet_fr: 'Retard {numero}' });
  db.prepare("DELETE FROM modeles_courriel WHERE code = 'ticket.reponse'").run();
  const { assurer } = require('../src/services/modeles-courriel');
  assurer();
  assert.ok(db.prepare("SELECT 1 FROM modeles_courriel WHERE code = 'ticket.reponse'").get());
  assert.equal(db.prepare("SELECT sujet_fr FROM modeles_courriel WHERE code = 'demande.retard'").get().sujet_fr, 'Retard {numero}');
});

test('MCP : liste, aperçu, modification, retour au texte livré en deux appels', async () => {
  assert.ok((await outil(admin, 'list_modeles_courriel')).data.length >= 14);
  assert.equal((await outil(admin, 'apercu_modele_courriel', { code: 'demande.message', langue: 'nl' })).data.sujet, 'Nieuw bericht: aanvraag AC-DI-2026-00042');
  assert.equal((await outil(admin, 'update_modele_courriel', { code: 'demande.message', sujet_fr: 'Message sur {numero}' })).data.texte_livre, 0);
  const p = (await outil(admin, 'prepare_retablir_modele_courriel', { code: 'demande.message' })).data;
  assert.equal((await outil(admin, 'confirm_retablir_modele_courriel', { confirmation_token: p.confirmation_token })).data.texte_livre, 1);
});
