/**
 * Contrôle serveur des photos déposées (cahier des charges RGPD-01 ; standard v3.2, section 10.2, famille Validation).
 * Le navigateur réduit la photo et la réencode sans métadonnées ; le serveur ne fait pas confiance à ce travail :
 * - type reconnu sur les premiers octets (JPEG ou PNG seulement), jamais sur l'extension ni sur l'en-tête annoncé seul ;
 * - structure parcourue segment par segment : un fichier mal formé est refusé ;
 * - métadonnées retirées une seconde fois : segments APP1 à APP15 et commentaires du JPEG (EXIF, GPS, XMP),
 *   blocs texte, date et EXIF du PNG ;
 * - dimensions plafonnées pour écarter une image piégée qui exploserait en mémoire chez le lecteur.
 * Aucune bibliothèque : lecture des octets avec Buffer.
 */
const MAX_PIXELS = 4096;
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function typeOf(buf) {
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(PNG_SIG)) return 'image/png';
  return null;
}

/** JPEG : garde SOI, APP0, tables et trame ; retire APP1-APP15 (0xE1-0xEF) et COM (0xFE). */
function cleanJpeg(buf) {
  const parts = [buf.subarray(0, 2)];
  let i = 2;
  let width = 0;
  let height = 0;
  while (i < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    if (marker === 0xff) { i += 1; continue; }
    if (marker === 0xd9) { parts.push(buf.subarray(i, i + 2)); return { data: Buffer.concat(parts), width, height }; }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { parts.push(buf.subarray(i, i + 2)); i += 2; continue; }
    if (i + 4 > buf.length) return null;
    const len = buf.readUInt16BE(i + 2);
    if (len < 2 || i + 2 + len > buf.length) return null;
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      height = buf.readUInt16BE(i + 5);
      width = buf.readUInt16BE(i + 7);
    }
    if (marker === 0xda) {
      // Début de la trame : le reste du fichier (données compressées jusqu'à EOI) se recopie tel quel.
      if (buf[buf.length - 2] !== 0xff || buf[buf.length - 1] !== 0xd9) return null;
      parts.push(buf.subarray(i));
      return { data: Buffer.concat(parts), width, height };
    }
    const metadata = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!metadata) parts.push(buf.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  return null;
}

/** PNG : garde les blocs d'image, retire tEXt, zTXt, iTXt, eXIf et tIME ; IHDR en premier, IEND à la fin. */
function cleanPng(buf) {
  const parts = [PNG_SIG];
  let i = 8;
  let width = 0;
  let height = 0;
  let first = true;
  while (i + 12 <= buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString('latin1', i + 4, i + 8);
    const end = i + 12 + len;
    if (end > buf.length) return null;
    if (first) {
      if (type !== 'IHDR') return null;
      width = buf.readUInt32BE(i + 8);
      height = buf.readUInt32BE(i + 12);
      first = false;
    }
    if (!['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME'].includes(type)) parts.push(buf.subarray(i, end));
    if (type === 'IEND') return { data: Buffer.concat(parts), width, height };
    i = end;
  }
  return null;
}

/**
 * Rend { type, data } nettoyé, ou lève une erreur codée :
 * FILE_TYPE si ce n'est ni un JPEG ni un PNG, ou si le type annoncé ne correspond pas ; FILE_INVALID si la structure
 * ou les dimensions sont refusées.
 */
function cleanPhoto(buf, announced) {
  const type = typeOf(buf);
  if (!type || (announced && announced !== type)) return { error: 'FILE_TYPE' };
  const out = type === 'image/jpeg' ? cleanJpeg(buf) : cleanPng(buf);
  if (!out || !out.width || !out.height || out.width > MAX_PIXELS || out.height > MAX_PIXELS) return { error: 'FILE_INVALID' };
  return { type, data: out.data, width: out.width, height: out.height };
}

module.exports = { cleanPhoto, typeOf, MAX_PIXELS };
