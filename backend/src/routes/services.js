/** Services des entités et leur valideur (ROL-04, 0.16.0, point 1) : cinq routes REST de l'administrateur. */
const express = require('express');
const { authMiddleware, requireRole } = require('../auth');
const { validate, validateQuery, validateParams, idParam } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const services = require('../services/services');

const router = express.Router();
router.use(authMiddleware, requireRole('admin'));

router.get('/', validateQuery(S.serviceList), handle((req, res) => {
  const { rows, pagination } = services.list(req.user, req.query);
  ok(res, rows, { resource: 'services' }, pagination);
}));

router.get('/:id', validateParams(idParam), handle((req, res) => {
  ok(res, services.get(req.user, Number(req.params.id)), { resource: 'services' });
}));

router.post('/', validate(S.serviceCreate), handle((req, res) => {
  ok(res, services.create(req.user, req.body), { resource: 'services' }, null, 201);
}));

router.put('/:id', validateParams(idParam), validate(S.serviceUpdate), handle((req, res) => {
  ok(res, services.update(req.user, Number(req.params.id), req.body), { resource: 'services' });
}));

/** DELETE = désactivation avec motif ; jamais de suppression physique. */
router.delete('/:id', validateParams(idParam), validate(S.serviceDeactivate), handle((req, res) => {
  ok(res, services.deactivate(req.user, Number(req.params.id), req.body.motif), { resource: 'services' });
}));

module.exports = router;
