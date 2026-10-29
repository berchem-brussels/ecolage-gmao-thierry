/**
 * Priorités P1 à P4 et délais de l'entité active (PRI-02) : lecture pour toute personne de l'entité, réglage par le
 * responsable du service technique. Catalogue fermé (config/priorites.json, écart E-19) : PUT règle une priorité,
 * DELETE rend ses valeurs livrées ; ni création ni suppression.
 */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validate, validateQuery, validateParams } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const priorites = require('../services/priorites');

const router = express.Router();
router.use(authMiddleware);

router.get('/', validateQuery(S.prioriteList), handle((req, res) => {
  const { rows, pagination } = priorites.list(req.user);
  ok(res, rows, { resource: 'priorites' }, pagination);
}));

router.get('/:code', validateParams(S.prioriteParams), handle((req, res) => {
  ok(res, priorites.get(req.user, req.params.code), { resource: 'priorites' });
}));

router.put('/:code', validateParams(S.prioriteParams), validate(S.prioriteUpdate), handle((req, res) => {
  ok(res, priorites.update(req.user, req.params.code, req.body), { resource: 'priorites' });
}));

router.delete('/:code', validateParams(S.prioriteParams), validate(S.prioriteReset), handle((req, res) => {
  ok(res, priorites.reset(req.user, req.params.code), { resource: 'priorites' });
}));

module.exports = router;
