/**
 * Socle de réception des fichiers (version 0.8.0, point 1 ; écart E-16 : `multer` 2.x ; standard v3.2, section 10.2,
 * famille Validation) : contrôle du contenu (JPEG, PNG, PDF), lecteur multipart commun, refus avant lecture du fichier.
 * Les règles de la photo d'un lieu elles-mêmes restent dans lieux.test.js ; la cloison dans cloison.test.js.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { startServer, setup, person } = require('./helpers');
const { jpeg, png, pdf } = require('./fixtures');
const { controler, typeDe, IMAGES, PDF } = require('../src/fichiers');

const TOUS = [...IMAGES, PDF];

/* ---------- Contrôle du contenu ---------- */

test('type reconnu sur les premiers octets, jamais sur l’étiquette', () => {
  assert.equal(typeDe(jpeg()), 'image/jpeg');
  assert.equal(typeDe(png()), 'image/png');
  assert.equal(typeDe(pdf()), PDF);
  assert.equal(typeDe(Buffer.concat([Buffer.from('MZ'), Buffer.alloc(200, 0x90)])), null, 'exécutable');
  assert.equal(typeDe(Buffer.from('<svg onload=alert(1)>')), null, 'SVG');
  assert.equal(typeDe(Buffer.alloc(0)), null);
  assert.equal(typeDe('pas un tampon'), null);
});

test('PDF sain accepté là où le PDF est admis, refusé pour une photo', () => {
  const r = controler(pdf(), PDF, TOUS);
  assert.equal(r.type, PDF);
  assert.ok(r.data.equals(pdf()), 'un PDF ne se réécrit pas');
  assert.equal(controler(pdf(), null, IMAGES).error, 'FILE_TYPE');
  assert.equal(controler(pdf(), 'image/png', TOUS).error, 'FILE_TYPE', 'type annoncé faux');
  assert.equal(controler(jpeg(), PDF, TOUS).error, 'FILE_TYPE', 'JPEG annoncé PDF');
});

test('PDF avec contenu actif ou fichier embarqué refusé, même avec un nom échappé', () => {
  for (const corps of ['/OpenAction << /S /JavaScript /JS (app.alert(1)) >>', '/Names << /EmbeddedFiles 9 0 R >>',
    '/AA << /O << /S /Launch /F (cmd.exe) >> >>', '/OpenAction << /S /J#61vaScript /J#53 (x) >>', '/AcroForm << /XFA 8 0 R >>',
    '/RichMedia 7 0 R', '/OpenAction << /S /SubmitForm >>']) {
    assert.equal(controler(pdf({ corps }), PDF, TOUS).error, 'FILE_ACTIVE', corps);
  }
  assert.equal(controler(pdf({ corps: '/OpenAction [3 0 R /Fit]' }), PDF, TOUS).type, PDF, 'ouverture sur une page : admise');
});

test('PDF tronqué ou mal formé refusé', () => {
  assert.equal(controler(pdf({ fin: false }), PDF, TOUS).error, 'FILE_INVALID');
  assert.equal(controler(Buffer.from('%PDF-x\n%%EOF'), PDF, TOUS).error, 'FILE_INVALID');
});

test('photos : le contrôle commun passe par images.js (métadonnées retirées, dimensions plafonnées)', () => {
  const r = controler(jpeg(), 'image/jpeg', IMAGES);
  assert.equal(r.type, 'image/jpeg');
  assert.doesNotMatch(r.data.toString('latin1'), /Exif|GPS|COMMENTAIRE/);
  assert.doesNotMatch(controler(png(), null, IMAGES).data.toString('latin1'), /AUTEUR/);
  assert.equal(controler(jpeg({ width: 9000 }), null, IMAGES).error, 'FILE_INVALID');
});

/* ---------- Lecteur multipart, sur la route de la photo d'un lieu ---------- */

let srv;
let gest;
let agent;
let lieu;

before(async () => {
  srv = await startServer();
  const { admin, ea } = await setup(srv.base);
  gest = await person(srv.base, admin, 'f.gest@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  agent = await person(srv.base, admin, 'f.agent@exemple.test', ea.id);
  lieu = (await gest.post('/api/lieux', { nature: 'site', code: 'F1', nom_fr: 'Site fichiers', nom_nl: 'Site bestanden' })).body.data;
});
after(() => srv.stop());

async function envoyer(c, body, headers = {}) {
  const h = { Cookie: c.cookie, 'X-CSRF-Token': c.csrf, ...headers };
  const res = await fetch(`${srv.base}/api/lieux/${lieu.id}/photo`, { method: 'POST', headers: h, body });
  return { status: res.status, body: await res.json() };
}

const formulaire = (...parts) => {
  const f = new FormData();
  for (const [champ, valeur, type] of parts) {
    if (type) f.append(champ, new Blob([valeur], { type }), 'f');
    else f.append(champ, valeur);
  }
  return f;
};

test('formulaire multipart avec un fichier au champ « fichier » : accepté', async () => {
  const r = await envoyer(gest, formulaire(['fichier', jpeg(), 'image/jpeg']));
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.has_photo, 1);
});

test('corps binaire brut (ancien dépôt), champ inconnu, deux fichiers, aucun fichier : refusés et codés', async () => {
  const brut = await envoyer(gest, jpeg(), { 'Content-Type': 'image/jpeg' });
  assert.equal(brut.status, 400);
  assert.equal(brut.body.code, 'FILE_FORM');
  assert.equal((await envoyer(gest, formulaire(['photo', jpeg(), 'image/jpeg']))).body.code, 'FILE_FORM', 'autre champ');
  assert.equal((await envoyer(gest, formulaire(['fichier', jpeg(), 'image/jpeg'], ['fichier', png(), 'image/png']))).body.code, 'FILE_FORM', 'deux fichiers');
  const vide = await envoyer(gest, formulaire(['note', 'texte seul']));
  assert.equal(vide.status, 400);
  assert.equal(vide.body.code, 'FILE_MISSING');
  assert.match(vide.body.message, /Aucun fichier/);
});

test('type annoncé hors liste (premier tri) et PDF sur une photo : FILE_TYPE', async () => {
  assert.equal((await envoyer(gest, formulaire(['fichier', 'x', 'application/x-msdownload']))).body.code, 'FILE_TYPE');
  assert.equal((await envoyer(gest, formulaire(['fichier', pdf(), 'application/pdf']))).body.code, 'FILE_TYPE');
  assert.equal((await envoyer(gest, formulaire(['fichier', pdf(), 'image/jpeg']))).body.code, 'FILE_TYPE', 'PDF déguisé en JPEG');
});

test('plafond de taille de `multer` : 413 et libellé de l’enveloppe', async () => {
  const r = await envoyer(gest, formulaire(['fichier', Buffer.concat([jpeg(), Buffer.alloc(1100 * 1024)]), 'image/jpeg']));
  assert.equal(r.status, 413);
  assert.equal(r.body.code, 'PAYLOAD_TOO_LARGE');
  assert.equal(r.body.message, 'Contenu trop volumineux.');
});

test('droits contrôlés avant la lecture du fichier : un demandeur reçoit 403, même avec un fichier trop gros', async () => {
  const r = await envoyer(agent, formulaire(['fichier', Buffer.alloc(2 * 1024 * 1024), 'image/jpeg']));
  assert.equal(r.status, 403);
  assert.equal(r.body.code, 'FORBIDDEN');
});

test('aucun fichier temporaire : stockage en mémoire, aucun dossier de dépôt créé par `multer`', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'fichiers.js'), 'utf8');
  assert.match(src, /memoryStorage\(\)/);
  assert.doesNotMatch(src, /diskStorage|dest:/);
});

test('contrat OpenAPI : le dépôt de la photo d’un lieu est déclaré en multipart, champ, types et plafond', async () => {
  const doc = (await gest.get('/api/openapi.json')).body;
  const op = doc.paths['/api/lieux/{id}/photo'].post;
  const corps = op.requestBody.content['multipart/form-data'];
  assert.equal(corps.schema.properties.fichier.format, 'binary');
  assert.equal(corps.encoding.fichier.contentType, 'image/jpeg, image/png');
  assert.match(op.requestBody.description, /1048576 octets/);
  assert.equal(op.requestBody.content['application/json'], undefined);
});
