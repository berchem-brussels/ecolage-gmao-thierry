/**
 * Pièces jointes des demandes (cahier des charges DEM-09, DEM-10, RGPD-01, RGPD-02 ; version 0.8.0, étape 6 ;
 * décisions DV-83 à DV-85).
 *   1. Une pièce s'ajoute au brouillon de la personne dans l'entité active (DV-85) : envoyée et contrôlée dès l'ajout,
 *      retrouvée à la reprise, rattachée à la demande dans la transaction d'envoi (services/demandes.js).
 *   2. Plafonds de l'entité (DV-83, réglages « pieces ») : nombre par demande (0 à 10, 5 livré ; 0 ferme le dépôt),
 *      taille par fichier (1 à 10 Mo, 10 livré ; jamais au-delà de PIECE_MAX_OCTETS), formats (photos et PDF, ou photos
 *      seulement). Le nombre et le droit sont contrôlés avant la lecture du fichier.
 *   3. Contenu contrôlé par fichiers.js : type sur les premiers octets, photo nettoyée (métadonnées), PDF sans contenu
 *      actif. Nom sur le disque généré par le serveur ; le nom d'origine, nettoyé, sert seulement à l'affichage.
 *   4. Lecture (SEC-01, SEC-02) : une pièce de brouillon par son auteur seul ; une pièce de demande par le demandeur,
 *      le bénéficiaire et le service technique de l'entité (« demandes:entite »). Une personne qui suit seulement la
 *      demande (« Moi aussi ») ne lit pas les pièces : elles peuvent montrer des personnes. Autre entité : 403.
 *   5. Suppression réelle (RGPD-02, DV-84) : fichier effacé du disque, ligne supprimée, journal sans contenu. Pièce de
 *      brouillon : son auteur. Pièce de demande : son auteur, s'il est le demandeur, tant que la demande est « Reçue »
 *      (a_qualifier) ; le gestionnaire et le responsable (« pieces:supprimer ») à tout moment. L'ouvrier : jamais.
 *   6. Brouillon effacé (« Recommencer à zéro ») : ses pièces aussi. Pièces de brouillon de plus de 30 jours sans
 *      brouillon : effacées avec la purge des brouillons.
 * Le MCP lit les pièces et les supprime (deux appels) ; il ne transporte aucun fichier (écart E-17).
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../database');
const { AppError } = require('../envelope');
const { logAudit } = require('../audit');
const { assertActif } = require('../modules');
const { rolesWith } = require('../roles');
const { PIECES_DIR, PIECE_MAX_OCTETS } = require('../config');
const { controler, IMAGES, PDF } = require('../fichiers');
const parametres = require('./parametres-entite');

const NOM_FICHIER = /^[a-f0-9]{32}\.(jpg|png|pdf)$/;
const EXTENSION = { 'image/jpeg': 'jpg', 'image/png': 'png', [PDF]: 'pdf' };
const FORMATS = { photos_pdf: [...IMAGES, PDF], photos: [...IMAGES] };
const JOURS = 30;
const COLUMNS = 'id, entite_id, demande_id, auteur_id, nom, type, octets, largeur, hauteur, canal, created_at';
const CANAUX = { api: 'ecran', mcp: 'mcp' };

const peut = (user, permission) => user.roles.some((r) => rolesWith(permission).includes(r));

function entiteActive(user) {
  if (!user.entiteId) throw new AppError(403, 'NO_ENTITE');
  return user.entiteId;
}

/** Plafonds en vigueur pour une entité : { nombre, octets, types }. */
function plafonds(entiteId) {
  const nombre = Number(parametres.valeur(entiteId, 'pieces.nombre_max'));
  const octets = Math.min(Number(parametres.valeur(entiteId, 'pieces.taille_max_mo')) * 1024 * 1024, PIECE_MAX_OCTETS);
  const types = FORMATS[parametres.valeur(entiteId, 'pieces.formats')] || FORMATS.photos_pdf;
  return { nombre, octets, types };
}

function chemin(nom) {
  if (!NOM_FICHIER.test(nom)) throw new AppError(500, 'INTERNAL');
  const p = path.resolve(PIECES_DIR, nom);
  if (path.dirname(p) !== path.resolve(PIECES_DIR)) throw new AppError(500, 'INTERNAL');
  return p;
}

function effacerFichier(nom) {
  try { fs.unlinkSync(chemin(nom)); } catch (e) { if (e.code !== 'ENOENT') throw e; }
}

/**
 * Nom affiché : nom d'origine sans chemin ni caractère de contrôle, 120 caractères au plus, extension remise d'après le
 * type reconnu. Un nom vide ou neutre (« fichier ») devient « photo.jpg », « photo.png » ou « document.pdf ».
 */
function nomAffiche(origine, type) {
  const ext = EXTENSION[type];
  let base = String(origine || '').normalize('NFC').split(/[\\/]/).pop()
    .replace(/[\u0000-\u001f\u007f"<>|*?:]/g, '').replace(/\s+/g, ' ').trim()
    .replace(/\.[A-Za-z0-9]{1,5}$/, '').trim();
  if (!base || base.toLowerCase() === 'fichier' || base.toLowerCase() === 'blob') base = type === PDF ? 'document' : 'photo';
  return `${base.slice(0, 120 - ext.length - 1)}.${ext}`;
}

const fiche = (p) => ({ ...p, brouillon: p.demande_id ? 0 : 1 });

/** Pièces du brouillon de la personne dans l'entité active, avec les plafonds en vigueur. */
function duBrouillon(user) {
  const entiteId = entiteActive(user);
  if (!peut(user, 'demandes:creer')) throw new AppError(403, 'FORBIDDEN');
  const rows = getDb().prepare(`SELECT ${COLUMNS} FROM pieces_jointes WHERE demande_id IS NULL AND auteur_id = ? AND entite_id = ?
    ORDER BY id`).all(user.id, entiteId).map((x) => ({ ...fiche(x), peut_retirer: 1 }));
  const p = plafonds(entiteId);
  return { pieces: rows, plafonds: { nombre: p.nombre, octets: p.octets, types: p.types } };
}

/**
 * Pièces d'une demande déjà autorisée en lecture (services/demandes.js), avec peut_retirer pour la personne (règle 5) :
 * confort d'affichage, le serveur contrôle de nouveau à la suppression.
 */
function deDemande(demandeId, user, d) {
  return getDb().prepare(`SELECT ${COLUMNS} FROM pieces_jointes WHERE demande_id = ? ORDER BY id`).all(demandeId).map((p) => {
    let peutRetirer = 1;
    try { controlerSuppression(user, p, d); } catch (e) { peutRetirer = 0; }
    return { ...fiche(p), peut_retirer: peutRetirer };
  });
}

/**
 * Contrôle préalable à l'ajout, avant la lecture du fichier : droit de déposer, module, dépôt ouvert dans l'entité,
 * nombre de pièces du brouillon. Rend les plafonds pour le lecteur `multer`.
 */
function peutAjouter(user) {
  const entiteId = entiteActive(user);
  if (!peut(user, 'demandes:creer')) throw new AppError(403, 'FORBIDDEN');
  assertActif('demandes');
  const p = plafonds(entiteId);
  if (p.nombre === 0) throw new AppError(409, 'PIECES_FERMEES');
  const n = getDb().prepare('SELECT COUNT(*) AS n FROM pieces_jointes WHERE demande_id IS NULL AND auteur_id = ? AND entite_id = ?')
    .get(user.id, entiteId).n;
  if (n >= p.nombre) throw new AppError(409, 'PIECES_PLAFOND', [`${p.nombre}`]);
  return p;
}

/** Ajoute une pièce au brouillon : contrôle du contenu, fichier écrit sous un nom généré, ligne au journal sans contenu. */
function ajouter(user, buf, annonce, origine, channel = 'api') {
  const p = peutAjouter(user);
  if (!Buffer.isBuffer(buf) || !buf.length) throw new AppError(400, 'FILE_MISSING');
  if (buf.length > p.octets) throw new AppError(413, 'PAYLOAD_TOO_LARGE');
  const c = controler(buf, annonce, p.types);
  if (c.error) throw new AppError(400, c.error);
  fs.mkdirSync(PIECES_DIR, { recursive: true });
  const fichier = `${crypto.randomBytes(16).toString('hex')}.${EXTENSION[c.type]}`;
  const cible = chemin(fichier);
  fs.writeFileSync(`${cible}.tmp`, c.data);
  fs.renameSync(`${cible}.tmp`, cible);
  const nom = nomAffiche(origine, c.type);
  let id;
  try {
    id = getDb().prepare(`INSERT INTO pieces_jointes (entite_id, demande_id, auteur_id, fichier, nom, type, octets, largeur, hauteur, canal)
      VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(user.entiteId, user.id, fichier, nom, c.type, c.data.length, c.width || null, c.height || null, CANAUX[channel] || 'api').lastInsertRowid;
  } catch (e) {
    effacerFichier(fichier);
    throw e;
  }
  logAudit(user.id, 'piece.add', 'piece', id, { type: c.type, octets: c.data.length, brouillon: 1 }, channel, user.entiteId);
  return get(user, id);
}

function ligne(id) {
  return getDb().prepare(`SELECT ${COLUMNS}, fichier FROM pieces_jointes WHERE id = ?`).get(id);
}

/** Pièce lisible par la personne (règle 4) : 404 inconnue, 403 autre entité ou personne non autorisée. */
function charger(user, id) {
  const p = ligne(id);
  if (!p) throw new AppError(404, 'NOT_FOUND');
  if (p.entite_id !== entiteActive(user)) throw new AppError(403, 'FORBIDDEN');
  if (!p.demande_id) {
    if (p.auteur_id !== user.id) throw new AppError(403, 'FORBIDDEN');
    return { p, d: null };
  }
  const d = getDb().prepare('SELECT id, entite_id, numero, etat, demandeur_id, beneficiaire_id FROM demandes WHERE id = ?').get(p.demande_id);
  if (d.demandeur_id !== user.id && d.beneficiaire_id !== user.id && !peut(user, 'demandes:entite')) throw new AppError(403, 'FORBIDDEN');
  return { p, d };
}

function sansFichier(p) {
  const out = { ...p };
  delete out.fichier;
  return fiche(out);
}

function get(user, id) {
  const { p, d } = charger(user, id);
  return { ...sansFichier(p), demande_numero: d ? d.numero : null };
}

/** Fichier pour la route de téléchargement authentifiée. */
function fichier(user, id) {
  const { p } = charger(user, id);
  const f = chemin(p.fichier);
  if (!fs.existsSync(f)) throw new AppError(404, 'NOT_FOUND');
  return { file: f, type: p.type, nom: p.nom };
}

/** Droit de supprimer (règle 5) ; lève 403 ou 409 PIECE_VERROUILLEE. */
function controlerSuppression(user, p, d) {
  if (!d) return;
  if (peut(user, 'pieces:supprimer')) return;
  if (p.auteur_id === user.id && d.demandeur_id === user.id) {
    if (d.etat !== 'a_qualifier') throw new AppError(409, 'PIECE_VERROUILLEE');
    return;
  }
  throw new AppError(403, 'FORBIDDEN');
}

/** Résumé avant confirmation (MCP prepare_delete_piece) : contrôle le droit sans rien effacer. */
function resumeSuppression(user, id) {
  const { p, d } = charger(user, id);
  controlerSuppression(user, p, d);
  return { action: 'delete_piece', piece: { id: p.id, nom: p.nom, type: p.type, octets: p.octets, demande_numero: d ? d.numero : null }, definitif: true };
}

/** Suppression réelle : ligne supprimée, fichier effacé du disque, journal (sans nom ni contenu). */
function supprimer(user, id, channel = 'api') {
  const { p, d } = charger(user, id);
  controlerSuppression(user, p, d);
  getDb().prepare('DELETE FROM pieces_jointes WHERE id = ?').run(p.id);
  effacerFichier(p.fichier);
  logAudit(user.id, 'piece.delete', 'piece', p.id,
    { type: p.type, octets: p.octets, demande_id: p.demande_id, numero: d ? d.numero : null, brouillon: d ? 0 : 1 }, channel, p.entite_id);
  return { id: p.id, supprime: 1 };
}

/** Dans la transaction d'envoi d'une demande : les pièces du brouillon passent à la demande ; rend leur nombre. */
function rattacher(userId, entiteId, demandeId) {
  return getDb().prepare('UPDATE pieces_jointes SET demande_id = ? WHERE demande_id IS NULL AND auteur_id = ? AND entite_id = ?')
    .run(demandeId, userId, entiteId).changes;
}

function effacerLignes(rows, userId, action, channel) {
  if (!rows.length) return 0;
  const db = getDb();
  for (const r of rows) {
    db.prepare('DELETE FROM pieces_jointes WHERE id = ?').run(r.id);
    effacerFichier(r.fichier);
    logAudit(userId, action, 'piece', r.id, { type: r.type, octets: r.octets, brouillon: 1 }, channel, r.entite_id);
  }
  return rows.length;
}

/** « Recommencer à zéro » : les pièces du brouillon sont effacées avec lui. */
function effacerBrouillon(user, channel = 'api') {
  const rows = getDb().prepare('SELECT id, entite_id, fichier, type, octets FROM pieces_jointes WHERE demande_id IS NULL AND auteur_id = ? AND entite_id = ?')
    .all(user.id, user.entiteId);
  return effacerLignes(rows, user.id, 'piece.delete', channel);
}

/** Purge : pièces de brouillon de plus de 30 jours dont l'auteur n'a plus de brouillon dans l'entité. */
function purger() {
  const rows = getDb().prepare(`SELECT p.id, p.entite_id, p.fichier, p.type, p.octets FROM pieces_jointes p
    WHERE p.demande_id IS NULL AND p.created_at < datetime('now', ?)
    AND NOT EXISTS (SELECT 1 FROM brouillons b WHERE b.user_id = p.auteur_id AND b.entite_id = p.entite_id)`).all(`-${JOURS} days`);
  return effacerLignes(rows, null, 'piece.purge', 'api');
}

module.exports = {
  plafonds, duBrouillon, deDemande, peutAjouter, ajouter, get, fichier, resumeSuppression, supprimer, rattacher,
  effacerBrouillon, purger, nomAffiche, FORMATS,
};
