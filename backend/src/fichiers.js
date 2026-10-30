/**
 * Réception et contrôle des fichiers déposés (standard v3.2, sections 4.2 et 10.2, famille Validation ; écart E-16 :
 * `multer` 2.x décidé par Renaud le 28/10/2026 ; version 0.8.0, point 1).
 * Un seul mécanisme pour tout dépôt de l'application (photo d'un lieu, pièces jointes des demandes) :
 *   1. `recevoir(options)` rend le lecteur `multer` d'une route : formulaire multipart, un seul fichier dans le champ
 *      `fichier`, gardé en mémoire (aucun fichier temporaire sur le disque), taille plafonnée par `limits.fileSize`,
 *      type annoncé filtré par `fileFilter` (premier tri seulement : l'étiquette du navigateur ne prouve rien).
 *   2. `controler(buf, annonce, types)` juge le contenu lui-même : type reconnu sur les premiers octets ; JPEG et PNG
 *      parcourus et nettoyés par images.js (métadonnées retirées, dimensions plafonnées) ; PDF contrôlé ici.
 *   3. Les refus deviennent des erreurs codées de l'enveloppe : 413 PAYLOAD_TOO_LARGE, 400 FILE_TYPE, FILE_INVALID,
 *      FILE_MISSING ou FILE_FORM. Le lecteur passe après authMiddleware : session et jeton anti-CSRF sont contrôlés
 *      avant la lecture du corps.
 * Limite connue du contrôle PDF : un PDF ne se réécrit pas ; ses métadonnées de document (auteur, logiciel) restent,
 * et un contenu actif caché dans un flux compressé n'est pas décompressé. Le fichier n'est jamais servi en ligne
 * (téléchargement en pièce jointe, `nosniff`).
 */
const multer = require('multer');
const { AppError } = require('./envelope');
const { cleanPhoto, typeOf } = require('./images');

const CHAMP = 'fichier';
const PDF = 'application/pdf';
const IMAGES = ['image/jpeg', 'image/png'];

/** Type reconnu sur les premiers octets : JPEG, PNG ou PDF ; null sinon. */
function typeDe(buf) {
  if (!Buffer.isBuffer(buf) || !buf.length) return null;
  if (buf.length > 5 && buf.toString('latin1', 0, 5) === '%PDF-') return PDF;
  return typeOf(buf);
}

/** Noms PDF qui portent du contenu actif ou un fichier caché ; les échappements #xx des noms sont décodés avant. */
const PDF_INTERDITS = /\/(JavaScript|JS|Launch|EmbeddedFiles?|RichMedia|XFA|SubmitForm|ImportData)\b/;

function controlerPdf(buf) {
  const texte = buf.toString('latin1');
  if (!/^%PDF-\d\.\d/.test(texte)) return { error: 'FILE_INVALID' };
  // Fin de fichier attendue dans les derniers 1 024 octets (structure complète, pas un fichier tronqué).
  if (!texte.slice(-1024).includes('%%EOF')) return { error: 'FILE_INVALID' };
  const noms = texte.replace(/\/[^\s/<>[\]()]*#[0-9A-Fa-f]{2}[^\s/<>[\]()]*/g,
    (nom) => nom.replace(/#([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))));
  if (PDF_INTERDITS.test(noms)) return { error: 'FILE_ACTIVE' };
  return { type: PDF, data: buf };
}

/**
 * Contrôle du contenu : rend { type, data[, width, height] } ou { error }.
 * FILE_TYPE : type non admis pour cette route, ou type annoncé différent du contenu ;
 * FILE_INVALID : structure ou dimensions refusées ; FILE_ACTIVE : PDF avec contenu actif ou fichier embarqué.
 */
function controler(buf, annonce, types) {
  const type = typeDe(buf);
  if (!type || !types.includes(type)) return { error: 'FILE_TYPE' };
  if (annonce && annonce !== type) return { error: 'FILE_TYPE' };
  if (type === PDF) return controlerPdf(buf);
  return cleanPhoto(buf, type);
}

/**
 * Lecteur `multer` d'une route : un fichier, en mémoire, plafonné ; erreurs traduites en codes de l'enveloppe.
 * `maxOctets` et `types` sont des valeurs fixes (photo d'un lieu) ou des fonctions de la requête, lues après le
 * contrôle préalable de la route (plafonds de l'entité active, pièces jointes) ; `contrat` donne alors au contrat OpenAPI
 * le plafond et les types les plus larges. Les noms de fichiers sont lus en UTF-8.
 */
function recevoir({ maxOctets, types, contrat = null }) {
  const valeur = (v, req) => (typeof v === 'function' ? v(req) : v);
  const lire = (req, res, next) => {
    if (!req.is('multipart/form-data')) return next(new AppError(400, 'FILE_FORM'));
    const admis = valeur(types, req);
    const lecteur = multer({
      storage: multer.memoryStorage(),
      defParamCharset: 'utf8',
      limits: { fileSize: valeur(maxOctets, req), files: 1, fields: 5, parts: 6, fieldSize: 1024 },
      fileFilter: (r, file, cb) => (admis.includes(file.mimetype) ? cb(null, true) : cb(new AppError(400, 'FILE_TYPE'))),
    }).single(CHAMP);
    lecteur(req, res, (err) => {
      if (!err) {
        if (!req.file || !req.file.buffer || !req.file.buffer.length) return next(new AppError(400, 'FILE_MISSING'));
        return next();
      }
      if (err instanceof AppError) return next(err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') return next(new AppError(413, 'PAYLOAD_TOO_LARGE'));
        return next(new AppError(400, 'FILE_FORM'));
      }
      return next(new AppError(400, 'FILE_FORM'));
    });
  };
  // Lu par openapi.js : le contrat déclare le corps multipart, ses types et son plafond.
  lire.fichierContrat = contrat
    ? { champ: CHAMP, types: [...contrat.types], maxOctets: contrat.maxOctets }
    : { champ: CHAMP, types: [...types], maxOctets };
  return lire;
}

/** Type annoncé par le navigateur pour le fichier reçu, s'il fait partie des types admis ; null sinon. */
function annonce(req, types) {
  const t = req.file && req.file.mimetype;
  return types.includes(t) ? t : null;
}

module.exports = { recevoir, controler, annonce, typeDe, CHAMP, PDF, IMAGES };
