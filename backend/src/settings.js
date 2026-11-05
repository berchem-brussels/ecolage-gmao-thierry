/**
 * Paramètres de l'instance en base (table app_settings), avec leur défaut et leur type (standard, section 11).
 * Les secrets sont chiffrés en AES-256-GCM et ne sont jamais renvoyés ; seul leur état « renseigné » l'est.
 */
const { getDb } = require('./database');
const { encrypt, decrypt } = require('./crypto-util');

const DEFAULTS = {
  'auth.mode': 'local',
  'auth.tenant': '',
  'auth.client_id': '',
  'auth.client_secret': '',
  'auth.public_url': '',
  'auth.domains': '',
  'tickets.sla_json': '{"P1":[1,8],"P2":[4,24],"P3":[8,72],"P4":[24,240]}',
  'tickets.reopen_days': '14',
  'tickets.business_roles': 'admin',
  'tickets.it_roles': 'admin',
};
const SECRETS = new Set(['auth.client_secret']);

function getSetting(key) {
  const row = getDb().prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
  const v = row ? row.value : DEFAULTS[key];
  if (v === undefined || v === null) return '';
  return SECRETS.has(key) ? decrypt(v) : String(v);
}

function isSet(key) {
  const row = getDb().prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
  return !!(row && row.value);
}

function setSetting(key, value) {
  if (!(key in DEFAULTS)) throw new Error(`Paramètre inconnu : ${key}`);
  const stored = SECRETS.has(key) ? encrypt(value) : String(value);
  getDb().prepare(`INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).run(key, stored);
}

const listSetting = (key) => getSetting(key).split(',').map((s) => s.trim()).filter(Boolean);

module.exports = { DEFAULTS, getSetting, setSetting, isSet, listSetting };
