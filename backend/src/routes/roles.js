/**
 * Catalogue des rôles, en lecture seule : il vient de config/roles.json, livré pour l'application Droits.
 * Il ne se modifie pas par l'API (il change avec une version de l'application).
 */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validateQuery, validateParams } = require('../validation');
const { ok, handle, AppError } = require('../envelope');
const S = require('../schemas');
const { ROLES, publicRole } = require('../roles');

const router = express.Router();
router.use(authMiddleware);

function list() { return ROLES.map(publicRole); }
function get(code) {
  const r = ROLES.find((x) => x.code === code);
  if (!r) throw new AppError(404, 'NOT_FOUND');
  return publicRole(r);
}

router.get('/', validateQuery(S.roleList), handle((req, res) => {
  const rows = list();
  ok(res, rows, { resource: 'roles' }, { total: rows.length, limit: rows.length, offset: 0 });
}));

router.get('/:code', validateParams(S.roleParams), handle((req, res) => {
  ok(res, get(req.params.code), { resource: 'roles' });
}));

router.service = { list, get };
module.exports = router;
