/** Équipes du service technique (ROL-05, 0.19.0, étape 15, point 2) : cinq routes REST appelant la couche de service. */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validate, validateQuery, validateParams, idParam } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const equipes = require('../services/equipes');

const router = express.Router();
router.use(authMiddleware);

router.get('/', validateQuery(S.equipeList), handle((req, res) => {
  const { rows, pagination } = equipes.list(req.user, req.query);
  ok(res, rows, { resource: 'equipes' }, pagination);
}));

router.get('/:id', validateParams(idParam), handle((req, res) => {
  ok(res, equipes.get(req.user, Number(req.params.id)), { resource: 'equipes' });
}));

router.post('/', validate(S.equipeCreate), handle((req, res) => {
  ok(res, equipes.create(req.user, req.body), { resource: 'equipes' }, null, 201);
}));

router.put('/:id', validateParams(idParam), validate(S.equipeUpdate), handle((req, res) => {
  ok(res, equipes.update(req.user, Number(req.params.id), req.body), { resource: 'equipes' });
}));

/** DELETE = désactivation avec motif ; jamais de suppression physique. */
router.delete('/:id', validateParams(idParam), validate(S.equipeDeactivate), handle((req, res) => {
  ok(res, equipes.deactivate(req.user, Number(req.params.id), req.body.motif), { resource: 'equipes' });
}));

module.exports = router;
