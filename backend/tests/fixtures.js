/**
 * Images d'essai construites octet par octet, sans bibliothèque : la structure suffit au contrôle du serveur,
 * qui ne décode pas l'image. Les métadonnées piégées portent des marqueurs reconnaissables dans le fichier écrit.
 */
const seg = (marker, payload) => {
  const b = Buffer.alloc(4);
  b[0] = 0xff;
  b[1] = marker;
  b.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([b, payload]);
};

/** JPEG de largeur x hauteur avec APP0, APP1 (EXIF avec position GPS fictive), commentaire, tables, trame. */
function jpeg({ width = 64, height = 48, exif = true } = {}) {
  const sof = Buffer.alloc(15);
  sof[0] = 8;
  sof.writeUInt16BE(height, 1);
  sof.writeUInt16BE(width, 3);
  sof[5] = 3;
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    seg(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'latin1')),
    ...(exif ? [seg(0xe1, Buffer.from('Exif\0\0GPS-50.8566-4.2953-APPAREIL-PERSONNEL', 'latin1')), seg(0xfe, Buffer.from('COMMENTAIRE-SECRET'))] : []),
    seg(0xdb, Buffer.alloc(65, 1)),
    seg(0xc0, sof),
    seg(0xc4, Buffer.alloc(30, 2)),
    seg(0xda, Buffer.alloc(10, 3)),
    Buffer.from([0x11, 0x22, 0x33, 0x44, 0xff, 0x00, 0x55]),
    Buffer.from([0xff, 0xd9]),
  ]);
}

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  return Buffer.concat([len, Buffer.from(type, 'latin1'), data, Buffer.alloc(4)]);
};

/** PNG de largeur x hauteur avec un bloc texte qui porte une donnée personnelle fictive. */
function png({ width = 32, height = 32 } = {}) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('tEXt', Buffer.from('Author\0AUTEUR-PERSONNEL', 'latin1')),
    chunk('IDAT', Buffer.alloc(20, 7)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

module.exports = { jpeg, png };
