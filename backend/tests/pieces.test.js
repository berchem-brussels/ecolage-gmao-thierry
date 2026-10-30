/**
 * Pièces jointes des demandes (version 0.8.0, point 2 ; DEM-09, DEM-10, RGPD-01, RGPD-02 ; DV-83 à DV-85) :
 * ajout au brouillon, plafonds de l'entité, rattachement à l'envoi, lecture, téléchargement, suppression réelle,
 * effacement avec le brouillon, purge, MCP, contrat. La cloison entre entités est dans cloison.test.js.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { startServer, client, setup, person } = require('./helpers');
const { jpeg, png, pdf } = require('./fixtures');
const { getDb } = require('../src/database');
const { PIECES_DIR } = require('../src/config');

let srv;
let admin;
let ea;
let resp;
let gest;
let agent;
let collegue;
let ouvrier;
let lieu;
let categorie;

const parse = (r) => JSON.parse(r.body.result.content[0].text);
const tool = async (c, name, args = {}) => parse(await c.mcp('tools/call', { name, arguments: args }));
const surDisque = () => (fs.existsSync(PIECES_DIR) ? fs.readdirSync(PIECES_DIR).filter((f) => !f.endsWith('.tmp')) : []);
const audit = (action, id) => getDb().prepare('SELECT details_json, channel FROM audit_log WHERE action = ? AND entity_id = ? ORDER BY id DESC').get(action, id);
const fichierDe = (id) => getDb().prepare('SELECT fichier FROM pieces_jointes WHERE id = ?').get(id)?.fichier;

/** Dépôt d'une pièce au brouillon, en formulaire multipart, comme le navigateur. */
async function deposer(c, buf = jpeg(), type = 'image/jpeg', nom = 'photo.jpg', { csrf = true } = {}) {
  const headers = { Cookie: c.cookie };
  if (csrf) headers['X-CSRF-Token'] = c.csrf;
  const body = new FormData();
  body.append('fichier', new Blob([buf], { type }), nom);
  const res = await fetch(`${srv.base}/api/demandes/brouillon/pieces`, { method: 'POST', headers, body });
  return { status: res.status, body: await res.json() };
}

const envoyer = (c, extra = {}) => c.post('/api/demandes', { lieu_id: lieu, categorie_id: categorie, description: 'Fenêtre cassée au rez-de-chaussée.', ...extra });
const vider = async (c) => { await c.del('/api/demandes/brouillon'); };
const regler = (cle, valeur) => resp.put(`/api/parametres-entite/${cle}`, { valeur });
const defaut = (cle) => resp.del(`/api/parametres-entite/${cle}`);

before(async () => {
  srv = await startServer();
  ({ admin, ea } = await setup(srv.base));
  resp = await person(srv.base, admin, 'pj.resp@exemple.test', ea.id, [[ea.id, 'responsable']]);
  gest = await person(srv.base, admin, 'pj.gest@exemple.test', ea.id, [[ea.id, 'gestionnaire']]);
  agent = await person(srv.base, admin, 'pj.agent@exemple.test', ea.id);
  collegue = await person(srv.base, admin, 'pj.collegue@exemple.test', ea.id);
  ouvrier = await person(srv.base, admin, 'pj.ouvrier@exemple.test', ea.id, [[ea.id, 'ouvrier']]);
  lieu = (await gest.post('/api/lieux', { nature: 'site', code: 'PJ', nom_fr: 'Site pièces', nom_nl: 'Site bijlagen' })).body.data.id;
  categorie = (await gest.get('/api/categories?niveau=nature&q=eclairage')).body.data[0].id;
});
after(() => srv.stop());

/* ---------- Ajout au brouillon ---------- */

test('ajout au brouillon : 201, fiche sans nom de fichier sur le disque, métadonnées retirées, journal sans nom', async () => {
  const avant = surDisque().length;
  const r = await deposer(agent);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const p = r.body.data;
  assert.equal(p.brouillon, 1);
  assert.equal(p.demande_id, null);
  assert.equal(p.nom, 'photo.jpg');
  assert.equal(p.type, 'image/jpeg');
  assert.equal(p.largeur, 64);
  assert.equal(p.canal, 'ecran');
  assert.equal(p.fichier, undefined);
  assert.doesNotMatch(JSON.stringify(r.body), /[a-f0-9]{32}/, 'le nom sur le disque n’est pas rendu');
  assert.equal(surDisque().length, avant + 1);
  const disque = fs.readFileSync(path.join(PIECES_DIR, fichierDe(p.id)));
  assert.match(fichierDe(p.id), /^[a-f0-9]{32}\.jpg$/);
  assert.doesNotMatch(disque.toString('latin1'), /Exif|GPS|COMMENTAIRE/);
  assert.equal(p.octets, disque.length);
  const j = audit('piece.add', p.id);
  assert.deepEqual(JSON.parse(j.details_json), { type: 'image/jpeg', octets: disque.length, brouillon: 1 });
  await vider(agent);
});

test('liste du brouillon : pièces de la personne seule, avec les plafonds livrés (5, 10 Mo, JPEG, PNG, PDF)', async () => {
  await deposer(agent);
  await deposer(collegue, png(), 'image/png', 'autre.png');
  const r = await agent.get('/api/demandes/brouillon/pieces');
  assert.equal(r.status, 200);
  assert.equal(r.body.data.pieces.length, 1);
  assert.deepEqual(r.body.data.plafonds, { nombre: 5, octets: 10 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'application/pdf'] });
  assert.equal((await collegue.get('/api/demandes/brouillon/pieces')).body.data.pieces[0].nom, 'autre.png');
  await vider(agent);
  await vider(collegue);
});

test('PDF : accepté tel quel avec son nom d’origine (UTF-8) ; contenu actif refusé ; nom nettoyé', async () => {
  const r = await deposer(agent, pdf(), 'application/pdf', 'Devis chaudière été.pdf');
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.data.nom, 'Devis chaudière été.pdf');
  assert.equal(r.body.data.largeur, null);
  assert.ok(fs.readFileSync(path.join(PIECES_DIR, fichierDe(r.body.data.id))).equals(pdf()), 'un PDF ne se réécrit pas');
  const actif = await deposer(agent, pdf({ corps: '/OpenAction << /S /JavaScript /JS (app.alert(1)) >>' }), 'application/pdf', 'piege.pdf');
  assert.equal(actif.status, 400);
  assert.equal(actif.body.code, 'FILE_ACTIVE');
  const sale = await deposer(agent, png(), 'image/png', '..\\..\\C:/secret/"<plan>".PNG.exe');
  assert.equal(sale.body.data.nom, 'plan.PNG.png');
  assert.equal((await deposer(agent, jpeg(), 'image/jpeg', 'fichier')).body.data.nom, 'photo.jpg', 'nom neutre de l’interface');
  assert.equal((await deposer(agent, Buffer.concat([Buffer.from('MZ'), Buffer.alloc(100)]), 'image/jpeg', 'x.jpg')).body.code, 'FILE_TYPE', 'exécutable renommé');
  await vider(agent);
});

test('plafond du nombre : la sixième pièce est refusée avant la lecture du fichier (409 PIECES_PLAFOND)', async () => {
  for (let i = 0; i < 5; i += 1) assert.equal((await deposer(agent)).status, 201);
  const sixieme = await deposer(agent, Buffer.alloc(11 * 1024 * 1024), 'image/jpeg');
  assert.equal(sixieme.status, 409, 'le nombre est contrôlé avant la taille');
  assert.equal(sixieme.body.code, 'PIECES_PLAFOND');
  assert.equal((await agent.get('/api/demandes/brouillon/pieces')).body.data.pieces.length, 5);
  await vider(agent);
});

test('réglages de l’entité : dépôt fermé (0), photos seulement, taille de 1 Mo ; retour aux défauts', async () => {
  assert.equal((await gest.put('/api/parametres-entite/pieces.nombre_max', { valeur: '3' })).status, 403, 'le responsable règle');
  assert.equal((await regler('pieces.nombre_max', '11')).status, 400, '10 au plus');
  assert.equal((await regler('pieces.taille_max_mo', '11')).status, 400, '10 Mo au plus');
  await regler('pieces.nombre_max', '0');
  assert.equal((await deposer(agent)).body.code, 'PIECES_FERMEES');
  await defaut('pieces.nombre_max');
  await regler('pieces.formats', 'photos');
  assert.equal((await deposer(agent, pdf(), 'application/pdf', 'devis.pdf')).body.code, 'FILE_TYPE');
  assert.deepEqual((await agent.get('/api/demandes/brouillon/pieces')).body.data.plafonds.types, ['image/jpeg', 'image/png']);
  await defaut('pieces.formats');
  await regler('pieces.taille_max_mo', '1');
  const gros = await deposer(agent, Buffer.concat([pdf({ fin: false }), Buffer.alloc(1100 * 1024), Buffer.from('\n%%EOF')]), 'application/pdf', 'gros.pdf');
  assert.equal(gros.status, 413);
  assert.equal(gros.body.code, 'PAYLOAD_TOO_LARGE');
  await defaut('pieces.taille_max_mo');
  const p = await deposer(agent, Buffer.concat([pdf({ fin: false }), Buffer.alloc(1100 * 1024), Buffer.from('\n%%EOF')]), 'application/pdf', 'gros.pdf');
  assert.equal(p.status, 201, 'accepté sous le plafond livré de 10 Mo');
  await vider(agent);
});

test('ajout : jeton anti-CSRF exigé, session exigée', async () => {
  assert.equal((await deposer(agent, jpeg(), 'image/jpeg', 'x.jpg', { csrf: false })).body.code, 'CSRF');
  const anonyme = await fetch(`${srv.base}/api/demandes/brouillon/pieces`, { method: 'POST', body: new FormData() });
  assert.equal(anonyme.status, 401);
});

/* ---------- Pièces de brouillon : privées ---------- */

test('pièce de brouillon : lue et supprimée par son auteur seul, même par le service technique (403)', async () => {
  const p = (await deposer(agent)).body.data;
  assert.equal((await agent.get(`/api/pieces/${p.id}`)).status, 200);
  for (const c of [collegue, gest, resp]) {
    assert.equal((await c.get(`/api/pieces/${p.id}`)).status, 403);
    assert.equal((await c.get(`/api/pieces/${p.id}/fichier`)).status, 403);
    assert.equal((await c.del(`/api/pieces/${p.id}`)).status, 403);
  }
  assert.equal((await agent.get('/api/pieces/99999')).status, 404);
  await vider(agent);
});

/* ---------- Envoi, lecture, téléchargement ---------- */

let demande;
let pieceDemande;

test('envoi : les pièces du brouillon passent à la demande ; brouillon vide ; journal avec leur nombre', async () => {
  await deposer(agent);
  await deposer(agent, pdf(), 'application/pdf', 'devis.pdf');
  const r = await envoyer(agent, { beneficiaire_id: collegue.id });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  demande = r.body.data;
  assert.equal(demande.pieces.length, 2);
  assert.ok(demande.pieces.every((p) => p.demande_id === demande.id && p.brouillon === 0));
  [pieceDemande] = demande.pieces;
  assert.equal((await agent.get('/api/demandes/brouillon/pieces')).body.data.pieces.length, 0);
  const j = getDb().prepare("SELECT details_json FROM audit_log WHERE action = 'demande.create' AND entity_id = ?").get(demande.id);
  assert.equal(JSON.parse(j.details_json).pieces, 2);
  assert.equal((await agent.get(`/api/pieces/${pieceDemande.id}`)).body.data.demande_numero, demande.numero);
  const sans = await envoyer(agent);
  assert.deepEqual(sans.body.data.pieces, [], 'demande sans pièce');
});

test('lecture d’une pièce de demande : demandeur, bénéficiaire, gestionnaire et responsable ; pas les autres', async () => {
  for (const c of [agent, collegue, gest, resp]) {
    assert.equal((await c.get(`/api/pieces/${pieceDemande.id}`)).status, 200);
    assert.equal((await c.get(`/api/demandes/${demande.id}`)).body.data.pieces.length, 2);
  }
  assert.equal((await ouvrier.get(`/api/pieces/${pieceDemande.id}`)).status, 403);
});

test('« Moi aussi » : qui suit seulement la demande ne lit pas les pièces (fiche : pieces null ; pièce : 403)', async () => {
  const suiveur = await person(srv.base, admin, 'pj.suiveur@exemple.test', ea.id);
  assert.equal((await suiveur.post(`/api/demandes/${demande.id}/suivre`, {})).status, 200);
  const f = (await suiveur.get(`/api/demandes/${demande.id}`)).body.data;
  assert.equal(f.pieces, null);
  assert.equal((await suiveur.get(`/api/pieces/${pieceDemande.id}`)).status, 403);
  assert.equal((await suiveur.get(`/api/pieces/${pieceDemande.id}/fichier`)).status, 403);
});

test('téléchargement : toujours en pièce jointe, nom UTF-8, nosniff, sans cache, bac à sable ; 401 sans session', async () => {
  const pdfPiece = demande.pieces.find((p) => p.type === 'application/pdf');
  const res = await fetch(`${srv.base}/api/pieces/${pdfPiece.id}/fichier`, { headers: { Cookie: gest.cookie } });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/pdf');
  assert.match(res.headers.get('content-disposition'), /^attachment; filename="devis\.pdf"; filename\*=UTF-8''devis\.pdf$/);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.match(res.headers.get('cache-control'), /no-store/);
  assert.match(res.headers.get('content-security-policy'), /sandbox/);
  assert.ok(Buffer.from(await res.arrayBuffer()).equals(pdf()));
  assert.equal((await client(srv.base).get(`/api/pieces/${pdfPiece.id}/fichier`)).status, 401);
  const accent = (await deposer(agent, pdf(), 'application/pdf', 'Réparé.pdf')).body.data;
  const r2 = await fetch(`${srv.base}/api/pieces/${accent.id}/fichier`, { headers: { Cookie: agent.cookie } });
  assert.equal(r2.headers.get('content-disposition'), `attachment; filename="Repare.pdf"; filename*=UTF-8''${encodeURIComponent('Réparé.pdf')}`);
  await vider(agent);
});

/* ---------- Suppression réelle (DV-84) ---------- */

test('suppression par le demandeur tant que la demande est « Reçue » : fichier effacé, ligne supprimée, journal', async () => {
  const f = fichierDe(pieceDemande.id);
  assert.ok(fs.existsSync(path.join(PIECES_DIR, f)));
  assert.equal((await collegue.del(`/api/pieces/${pieceDemande.id}`)).status, 403, 'le bénéficiaire ne supprime pas');
  assert.equal((await ouvrier.del(`/api/pieces/${pieceDemande.id}`)).status, 403, 'l’ouvrier ne supprime jamais');
  const r = await agent.del(`/api/pieces/${pieceDemande.id}`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body.data, { id: pieceDemande.id, supprime: 1 });
  assert.equal(fs.existsSync(path.join(PIECES_DIR, f)), false, 'fichier effacé du disque');
  assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM pieces_jointes WHERE id = ?').get(pieceDemande.id).n, 0, 'ligne supprimée, pas désactivée');
  assert.equal((await agent.get(`/api/pieces/${pieceDemande.id}`)).status, 404);
  const j = JSON.parse(audit('piece.delete', pieceDemande.id).details_json);
  assert.equal(j.numero, demande.numero);
  assert.equal(j.brouillon, 0);
  assert.doesNotMatch(JSON.stringify(j), /photo\.jpg|[a-f0-9]{32}/, 'ni nom ni fichier au journal');
});

test('demande prise en charge : le demandeur ne supprime plus (409) ; gestionnaire et responsable oui', async () => {
  getDb().prepare("UPDATE demandes SET etat = 'qualifiee' WHERE id = ?").run(demande.id);
  const [p] = (await gest.get(`/api/demandes/${demande.id}`)).body.data.pieces;
  const r = await agent.del(`/api/pieces/${p.id}`);
  assert.equal(r.status, 409);
  assert.equal(r.body.code, 'PIECE_VERROUILLEE');
  assert.equal((await gest.del(`/api/pieces/${p.id}`)).status, 200);
  assert.equal((await gest.get(`/api/demandes/${demande.id}`)).body.data.pieces.length, 0);
  getDb().prepare("UPDATE demandes SET etat = 'a_qualifier' WHERE id = ?").run(demande.id);
});

test('« Recommencer à zéro » : les pièces du brouillon s’effacent avec lui, fichiers compris', async () => {
  await agent.put('/api/demandes/brouillon', { contenu: { description: 'Brouillon avec photos' } });
  const a = (await deposer(agent)).body.data;
  const b = (await deposer(agent, png(), 'image/png')).body.data;
  const fichiers = [fichierDe(a.id), fichierDe(b.id)];
  const r = await agent.del('/api/demandes/brouillon');
  assert.deepEqual(r.body.data, { efface: 1, pieces: 2 });
  for (const f of fichiers) assert.equal(fs.existsSync(path.join(PIECES_DIR, f)), false);
  assert.equal((await agent.get('/api/demandes/brouillon/pieces')).body.data.pieces.length, 0);
});

test('purge : pièces de plus de 30 jours sans brouillon effacées ; celles d’un brouillon en cours gardées', async () => {
  const vieille = (await deposer(collegue)).body.data;
  getDb().prepare("UPDATE pieces_jointes SET created_at = datetime('now', '-31 days') WHERE id = ?").run(vieille.id);
  const f = fichierDe(vieille.id);
  await agent.put('/api/demandes/brouillon', { contenu: { description: 'Toujours en cours' } });
  const gardee = (await deposer(agent)).body.data;
  getDb().prepare("UPDATE pieces_jointes SET created_at = datetime('now', '-31 days') WHERE id = ?").run(gardee.id);
  await agent.get('/api/demandes/brouillon');
  assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM pieces_jointes WHERE id = ?').get(vieille.id).n, 0);
  assert.equal(fs.existsSync(path.join(PIECES_DIR, f)), false);
  assert.ok(audit('piece.purge', vieille.id));
  assert.equal((await agent.get(`/api/pieces/${gardee.id}`)).status, 200, 'brouillon actif : pièce gardée');
  await vider(agent);
});

test('fiche : peut_retirer suit la règle DV-84 pour chaque personne (confort d’affichage)', async () => {
  await deposer(agent);
  const d = (await envoyer(agent, { beneficiaire_id: collegue.id })).body.data;
  const drapeau = async (c) => (await c.get(`/api/demandes/${d.id}`)).body.data.pieces[0].peut_retirer;
  assert.equal(await drapeau(agent), 1, 'demandeur, demande « Reçue »');
  assert.equal(await drapeau(collegue), 0, 'bénéficiaire');
  assert.equal(await drapeau(gest), 1);
  assert.equal(await drapeau(resp), 1);
  getDb().prepare("UPDATE demandes SET etat = 'planifiee' WHERE id = ?").run(d.id);
  assert.equal(await drapeau(agent), 0, 'demande prise en charge');
  assert.equal(await drapeau(gest), 1);
  await deposer(agent);
  assert.equal((await agent.get('/api/demandes/brouillon/pieces')).body.data.pieces[0].peut_retirer, 1, 'brouillon : son auteur');
  await vider(agent);
});

/* ---------- MCP et contrat ---------- */

test('MCP : liste du brouillon, fiche, suppression en deux appels ; aucun fichier transporté', async () => {
  const p = (await deposer(agent)).body.data;
  const l = await tool(agent, 'list_pieces_brouillon');
  assert.equal(l.data.pieces[0].id, p.id);
  const g = await tool(agent, 'get_piece', { id: p.id });
  assert.equal(g.data.nom, 'photo.jpg');
  assert.doesNotMatch(JSON.stringify(g), /base64|[a-f0-9]{32}\.jpg/);
  assert.equal((await tool(collegue, 'prepare_delete_piece', { id: p.id })).code, 'FORBIDDEN', 'aucun jeton sans le droit');
  const prep = await tool(agent, 'prepare_delete_piece', { id: p.id });
  assert.equal(prep.data.definitif, true);
  const c = await tool(agent, 'confirm_delete_piece', { confirmation_token: prep.data.confirmation_token });
  assert.equal(c.data.supprime, 1);
  assert.equal(audit('piece.delete', p.id).channel, 'mcp');
  await deposer(agent);
  const prepB = await tool(agent, 'prepare_delete_brouillon');
  assert.equal(prepB.data.pieces, 1, 'le résumé annonce les pièces effacées avec le brouillon');
  const cB = await tool(agent, 'confirm_delete_brouillon', { confirmation_token: prepB.data.confirmation_token });
  assert.equal(cB.data.pieces, 1);
});

test('contrat OpenAPI : dépôt multipart au champ « fichier », plafond absolu de 10 Mo, trois types', async () => {
  const op = (await agent.get('/api/openapi.json')).body.paths['/api/demandes/brouillon/pieces'].post;
  assert.equal(op.requestBody.content['multipart/form-data'].encoding.fichier.contentType, 'image/jpeg, image/png, application/pdf');
  assert.match(op.requestBody.description, /10485760 octets/);
});

test('exploitation : backup.sh copie le dossier des pièces ; nginx accepte 11 Mo sur la seule route de dépôt', () => {
  const racine = path.join(__dirname, '..', '..');
  const backup = fs.readFileSync(path.join(racine, 'backup.sh'), 'utf8');
  assert.match(backup, /docker cp "\$APP_NAME-api:\/app\/data\/pieces"/);
  assert.match(backup, /-pieces-\*\.tar\.gz" -mtime/);
  const nginx = fs.readFileSync(path.join(racine, 'frontend', 'nginx.conf'), 'utf8');
  assert.match(nginx, /location = \/api\/demandes\/brouillon\/pieces \{[^}]*client_max_body_size 11m;/);
  assert.equal((nginx.match(/client_max_body_size 11m;/g) || []).length, 1, 'ailleurs : 1 Mo');
  assert.match(nginx, /location \/api\/ \{[^}]*client_max_body_size 1m;/);
});
