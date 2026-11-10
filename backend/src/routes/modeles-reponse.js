/** Modèles de réponse au demandeur (GES-09, 0.15.0, point 4) : cinq routes REST appelant la couche de service. */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validate, validateQuery, validateParams, idParam } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const modeles = require('../services/modeles-reponse');

const router = express.Router();
router.use(authMiddleware);

router.get('/', validateQuery(S.modeleList), handle((req, res) => {
  const { rows, pagination, variables } = modeles.list(req.user, req.query);
  ok(res, rows, { resource: 'modeles-reponse', variables }, pagination);
}));

router.get('/:id', validateParams(idParam), handle((req, res) => {
  ok(res, modeles.get(req.user, Number(req.params.id)), { resource: 'modeles-reponse' });
}));

router.post('/', validate(S.modeleCreate), handle((req, res) => {
  ok(res, modeles.create(req.user, req.body), { resource: 'modeles-reponse' }, null, 201);
}));

router.put('/:id', validateParams(idParam), validate(S.modeleUpdate), handle((req, res) => {
  ok(res, modeles.update(req.user, Number(req.params.id), req.body), { resource: 'modeles-reponse' });
}));

/** DELETE = désactivation avec motif ; jamais de suppression physique. */
router.delete('/:id', validateParams(idParam), validate(S.modeleDeactivate), handle((req, res) => {
  ok(res, modeles.deactivate(req.user, Number(req.params.id), req.body.motif), { resource: 'modeles-reponse' });
}));

module.exports = router;
