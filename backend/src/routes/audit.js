/**
 * Journal d'audit en lecture seule, réservé à l'administrateur (standard v3.2, section 17.3). La liste rend aussi,
 * dans meta.actions, les actions présentes dans le journal pour le filtre de l'écran.
 */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validateQuery, validateParams, idParam } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const journal = require('../services/journal');

const router = express.Router();
router.use(authMiddleware);

router.get('/', validateQuery(S.auditList), handle((req, res) => {
  const { rows, pagination } = journal.list(req.user, req.query);
  ok(res, rows, { resource: 'audit', actions: journal.actions(req.user) }, pagination);
}));

router.get('/:id', validateParams(idParam), handle((req, res) => {
  ok(res, journal.get(req.user, Number(req.params.id)), { resource: 'audit' });
}));

module.exports = router;
