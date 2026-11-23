/**
 * Jours non ouvrés propres à l'entité active (PRI-02) : congés répétés chaque année et fermetures ponctuelles.
 * Cinq routes REST appelant la couche de service ; DELETE désactive avec un motif, sans suppression physique.
 */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validate, validateQuery, validateParams, idParam } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const calendrier = require('../services/calendrier');

const router = express.Router();
router.use(authMiddleware);

router.get('/', validateQuery(S.jourList), handle((req, res) => {
  const { rows, pagination } = calendrier.listJours(req.user, req.query);
  ok(res, rows, { resource: 'jours-non-ouvres' }, pagination);
}));

router.get('/:id', validateParams(idParam), handle((req, res) => {
  ok(res, calendrier.getJour(req.user, Number(req.params.id)), { resource: 'jours-non-ouvres' });
}));

router.post('/', validate(S.jourCreate), handle((req, res) => {
  ok(res, calendrier.createJour(req.user, req.body), { resource: 'jours-non-ouvres' }, null, 201);
}));

router.put('/:id', validateParams(idParam), validate(S.jourUpdate), handle((req, res) => {
  ok(res, calendrier.updateJour(req.user, Number(req.params.id), req.body), { resource: 'jours-non-ouvres' });
}));

router.delete('/:id', validateParams(idParam), validate(S.jourDeactivate), handle((req, res) => {
  ok(res, calendrier.deactivateJour(req.user, Number(req.params.id), req.body.motif), { resource: 'jours-non-ouvres' });
}));

module.exports = router;
