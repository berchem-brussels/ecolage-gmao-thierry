/** Notes de version pour les utilisateurs (lecture), filtrées selon le public de chaque ligne. */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validateQuery, validateParams } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const notes = require('../services/notes-version');

const router = express.Router();
router.use(authMiddleware);

router.get('/', validateQuery(S.noteList), handle((req, res) => {
  const { rows, pagination } = notes.list(req.user, req.query);
  ok(res, rows, { resource: 'notes-version' }, pagination);
}));

router.get('/:version', validateParams(S.noteParams), handle((req, res) => {
  ok(res, notes.get(req.user, req.params.version), { resource: 'notes-version' });
}));

module.exports = router;
