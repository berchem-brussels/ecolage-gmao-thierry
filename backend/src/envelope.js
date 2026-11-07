/**
 * Contrat de réponse commun à toutes les applications (patron PILOT lib/envelope.js, standard v3.2 section 7.3).
 * Succès : { data, meta[, pagination] }, meta porte toujours le marqueur envelope: 1.
 * Erreur : { error: true, code, message[, details] }. Exceptions : JSON-RPC du MCP et document OpenAPI, servis bruts.
 */
const { L, langOf } = require('./i18n-server');

class AppError extends Error {
  /**
   * texte (0.12.0, R2) : message propre à ce refus, en FR et en NL ({ fr, nl }), qui remplace le message général du
   * code ; par exemple le réglage et la valeur refusés au lieu de « Données invalides ».
   */
  constructor(status, code, details, texte) {
    super(code);
    this.status = status;
    this.code = code;
    this.details = details;
    this.texte = texte;
  }
}

/** Message d'une erreur dans la langue demandée : son texte propre s'il en a un, sinon celui de son code. */
const messageOf = (lang, err) => (err && err.texte ? (err.texte[lang] || err.texte.fr) : L(lang, err ? err.code : 'INTERNAL'));

function ok(res, data, meta = {}, pagination = null, status = 200) {
  const body = { data, meta: { envelope: 1, ...meta } };
  if (pagination) body.pagination = pagination;
  res.status(status).json(body);
}

function fail(res, req, status, code, details, texte) {
  const lang = langOf(req);
  const body = { error: true, code, message: texte ? (texte[lang] || texte.fr) : L(lang, code) };
  if (details) body.details = details;
  res.status(status).json(body);
}

/** Enveloppe une route : une AppError devient une réponse codée ; tout le reste devient 500 sans détail. */
function handle(fn) {
  return async (req, res, next) => {
    try { await fn(req, res, next); } catch (e) { next(e); }
  };
}

module.exports = { AppError, ok, fail, handle, messageOf };
