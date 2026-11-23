/**
 * Modules activables (ADM-02) : lecture pour toute personne connectée, réglage par l'administrateur pour toute
 * l'instance. Catalogue fermé (config/modules.json) : ni création ni suppression.
 */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validate, validateQuery, validateParams } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const modules = require('../services/modules');

const router = express.Router();
router.use(authMiddleware);

router.get('/', validateQuery(S.moduleList), handle((req, res) => {
  const { rows, pagination } = modules.list(req.user, req.query);
  ok(res, rows, { resource: 'modules' }, pagination);
}));

router.get('/:code', validateParams(S.moduleParams), handle((req, res) => {
  ok(res, modules.get(req.user, req.params.code), { resource: 'modules' });
}));

router.put('/:code', validateParams(S.moduleParams), validate(S.moduleUpdate), handle((req, res) => {
  ok(res, modules.update(req.user, req.params.code, req.body.actif), { resource: 'modules' });
}));

module.exports = router;
