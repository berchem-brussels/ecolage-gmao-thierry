/** Prestataires externes (REF-07, 0.19.0, étape 15, point 3) : cinq routes REST appelant la couche de service. */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validate, validateQuery, validateParams, idParam } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const prestataires = require('../services/prestataires');

const router = express.Router();
router.use(authMiddleware);

router.get('/', validateQuery(S.prestataireList), handle((req, res) => {
  const { rows, pagination } = prestataires.list(req.user, req.query);
  ok(res, rows, { resource: 'prestataires' }, pagination);
}));

router.get('/:id', validateParams(idParam), handle((req, res) => {
  ok(res, prestataires.get(req.user, Number(req.params.id)), { resource: 'prestataires' });
}));

router.post('/', validate(S.prestataireCreate), handle((req, res) => {
  ok(res, prestataires.create(req.user, req.body), { resource: 'prestataires' }, null, 201);
}));

router.put('/:id', validateParams(idParam), validate(S.prestataireUpdate), handle((req, res) => {
  ok(res, prestataires.update(req.user, Number(req.params.id), req.body), { resource: 'prestataires' });
}));

/** DELETE = désactivation avec motif ; jamais de suppression physique. */
router.delete('/:id', validateParams(idParam), validate(S.prestataireDeactivate), handle((req, res) => {
  ok(res, prestataires.deactivate(req.user, Number(req.params.id), req.body.motif), { resource: 'prestataires' });
}));

module.exports = router;
