/** Chiffrement AES-256-GCM des paramètres secrets, clé dédiée CONFIG_ENC_KEY (patron PILOT, standard v3.2 section 5). */
const crypto = require('crypto');
const { CONFIG_ENC_KEY } = require('./config');

const ALGO = 'aes-256-gcm';
const key = () => crypto.createHash('sha256').update(CONFIG_ENC_KEY).digest();

function encrypt(plaintext) {
  if (!plaintext) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  return `enc:${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${enc.toString('hex')}`;
}

function decrypt(ciphertext) {
  if (!ciphertext || !String(ciphertext).startsWith('enc:')) return '';
  const [, iv, tag, data] = String(ciphertext).split(':');
  try {
    const d = crypto.createDecipheriv(ALGO, key(), Buffer.from(iv, 'hex'));
    d.setAuthTag(Buffer.from(tag, 'hex'));
    return Buffer.concat([d.update(Buffer.from(data, 'hex')), d.final()]).toString('utf8');
  } catch (e) {
    console.error('[CRYPTO] Déchiffrement impossible');
    return '';
  }
}

module.exports = { encrypt, decrypt };
