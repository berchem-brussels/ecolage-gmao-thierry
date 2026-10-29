/**
 * Contrat de réponse commun à toutes les applications (patron PILOT lib/envelope.js, standard v3.2 section 7.3).
 * Succès : { data, meta[, pagination] }, meta porte toujours le marqueur envelope: 1.
 * Erreur : { error: true, code, message[, details] }. Exceptions : JSON-RPC du MCP et document OpenAPI, servis bruts.
 */
const { L, langOf } = require('./i18n-server');

class AppError extends Error {
  constructor(status, code, details) {
    super(code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function ok(res, data, meta = {}, pagination = null, status = 200) {
  const body = { data, meta: { envelope: 1, ...meta } };
  if (pagination) body.pagination = pagination;
  res.status(status).json(body);
}

function fail(res, req, status, code, details) {
  const body = { error: true, code, message: L(langOf(req), code) };
  if (details) body.details = details;
  res.status(status).json(body);
}

/** Enveloppe une route : une AppError devient une réponse codée ; tout le reste devient 500 sans détail. */
function handle(fn) {
  return async (req, res, next) => {
    try { await fn(req, res, next); } catch (e) { next(e); }
  };
}

module.exports = { AppError, ok, fail, handle };
