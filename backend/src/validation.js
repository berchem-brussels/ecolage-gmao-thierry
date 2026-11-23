/**
 * Validation des entrées par ajv (patron SAGA validation.js).
 * additionalProperties:false sur tout schéma : un champ inconnu est refusé (mass assignment).
 */
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { fail } = require('./envelope');

const ajv = new Ajv({ coerceTypes: true, allErrors: true, strict: false, useDefaults: true });
addFormats(ajv);

const T = {
  str: (max = 500) => ({ type: ['string', 'null'], maxLength: max }),
  reqStr: (max = 500) => ({ type: 'string', minLength: 1, maxLength: max }),
  text: (max = 20000) => ({ type: ['string', 'null'], maxLength: max }),
  email: () => ({ type: 'string', format: 'email', maxLength: 200 }),
  int: (min, max) => ({ type: 'integer', ...(min !== undefined && { minimum: min }), ...(max !== undefined && { maximum: max }) }),
  en: (...vals) => ({ enum: vals }),
  bool: () => ({ type: 'boolean' }),
};

function obj(properties, required = []) {
  return { type: 'object', properties, required, additionalProperties: false };
}

/**
 * Champs jamais retouchés : un mot de passe garde ses espaces, qui en font partie (DV-37).
 * Toute clé nouvelle qui porte un secret saisi par une personne s'ajoute ici.
 */
const SANS_NETTOYAGE = new Set(['password', 'current_password', 'new_password']);

/**
 * Retire les espaces de début et de fin de toute chaîne reçue, à toute profondeur, sauf sous une clé de
 * SANS_NETTOYAGE (DV-37, défaut « Mobilier » relevé à la recette de la 0.4.1). Modifie la valeur en place et la rend.
 * Appelé avant le schéma : un champ obligatoire fait seulement d'espaces devient vide et minLength le refuse.
 * Sert aux routes (validate, validateQuery, validateParams) et aux outils MCP (callTool) : un seul chemin.
 */
function nettoyer(valeur) {
  if (Array.isArray(valeur)) {
    for (let i = 0; i < valeur.length; i += 1) valeur[i] = typeof valeur[i] === 'string' ? valeur[i].trim() : nettoyer(valeur[i]);
    return valeur;
  }
  if (valeur && typeof valeur === 'object') {
    for (const cle of Object.keys(valeur)) {
      if (SANS_NETTOYAGE.has(cle)) continue;
      const v = valeur[cle];
      if (typeof v === 'string') valeur[cle] = v.trim();
      else if (v && typeof v === 'object') nettoyer(v);
    }
    return valeur;
  }
  return typeof valeur === 'string' ? valeur.trim() : valeur;
}

function compile(schema, where) {
  const check = ajv.compile(schema);
  const mw = function validateInput(req, res, next) {
    const target = nettoyer(req[where] || {});
    if (!check(target)) {
      const details = (check.errors || []).slice(0, 6).map((e) => {
        const field = (e.instancePath || '').replace(/^\//, '') || e.params?.missingProperty || e.params?.additionalProperty || where;
        return `${field}: ${e.message}`;
      });
      return fail(res, req, 400, 'VALIDATION', details);
    }
    next();
  };
  mw.ajvSchema = schema;
  mw.ajvWhere = where;
  return mw;
}

const validate = (schema) => compile(schema, 'body');
const validateQuery = (schema) => compile(schema, 'query');
const validateParams = (schema) => compile(schema, 'params');

const idParam = obj({ id: T.int(1) }, ['id']);

module.exports = { ajv, T, obj, validate, validateQuery, validateParams, idParam, nettoyer, SANS_NETTOYAGE };
