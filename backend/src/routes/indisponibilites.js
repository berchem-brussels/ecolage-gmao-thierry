/**
 * Indisponibilités des ouvriers de l'entité active (0.21.0, étape 17, point 2 ; PLA-04). Règles : services/indisponibilites.js.
 */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validate, validateQuery, validateParams, idParam } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const indispo = require('../services/indisponibilites');

const router = express.Router();
router.use(authMiddleware);

router.get('/', validateQuery(S.indispoList), handle((req, res) => {
  const { rows, pagination } = indispo.list(req.user, req.query);
  ok(res, rows, { resource: 'indisponibilites' }, pagination);
}));
router.get('/:id', validateParams(idParam), handle((req, res) => {
  ok(res, indispo.get(req.user, Number(req.params.id)), { resource: 'indisponibilites' });
}));
router.post('/', validate(S.indispoCreate), handle((req, res) => {
  ok(res, indispo.create(req.user, req.body), { resource: 'indisponibilites' }, null, 201);
}));
router.put('/:id', validateParams(idParam), validate(S.indispoUpdate), handle((req, res) => {
  ok(res, indispo.update(req.user, Number(req.params.id), req.body), { resource: 'indisponibilites' });
}));
router.delete('/:id', validateParams(idParam), handle((req, res) => {
  ok(res, indispo.remove(req.user, Number(req.params.id)), { resource: 'indisponibilites' });
}));

module.exports = router;
