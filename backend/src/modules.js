/**
 * Registre des modules et contrôle côté serveur (patron SAGA modules.js ; standard v3.2, section 6.2 ; cahier des
 * charges ADM-02, API-04). Le catalogue vient de config/modules.json ; l'état de l'instance est gardé dans app_settings
 * sous la clé module.<code> ('1' ou '0'), sinon l'état livré s'applique. Les modules valent pour toute l'instance.
 * Un module éteint répond 403 MODULE_DISABLED sur ses opérations, par l'API comme par le MCP : le contrôle se place
 * dans la fonction de service, juste après le contrôle du rôle (ordre API-04 : session, rôle, module, schéma...).
 */
const fs = require('fs');
const path = require('path');
const { getDb } = require('./database');
const { AppError, fail } = require('./envelope');

const MODULES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'modules.json'), 'utf8')).modules;
const CODES = MODULES.map((m) => m.code);

const cle = (code) => `module.${code}`;

function definition(code) {
  const m = MODULES.find((x) => x.code === code);
  if (!m) throw new Error(`Module inconnu : ${code}`);
  return m;
}

/** État en vigueur : un module du noyau est toujours actif ; sinon la base, sinon l'état livré. */
function estActif(code) {
  const m = definition(code);
  if (m.noyau) return true;
  const row = getDb().prepare('SELECT value FROM app_settings WHERE key = ?').get(cle(code));
  return row && row.value !== null ? row.value === '1' : !!m.actif_defaut;
}

function assertActif(code) {
  if (!estActif(code)) throw new AppError(403, 'MODULE_DISABLED');
}

/** Variante en middleware, pour une route qui n'a pas de contrôle de rôle propre à placer avant. */
function requireModule(code) {
  definition(code);
  return (req, res, next) => (estActif(code) ? next() : fail(res, req, 403, 'MODULE_DISABLED'));
}

module.exports = { MODULES, CODES, cle, definition, estActif, assertActif, requireModule };
