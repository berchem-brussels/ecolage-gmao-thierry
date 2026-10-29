/** Entités : cinq routes REST et la liste des personnes de l'entité, appelant la couche de service (standard v3.2, section 7.3). */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validate, validateQuery, validateParams, idParam } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const entites = require('../services/entites');

const router = express.Router();
router.use(authMiddleware);

router.get('/', validateQuery(S.entiteList), handle((req, res) => {
  const { rows, pagination } = entites.list(req.user, req.query);
  ok(res, rows, { resource: 'entites' }, pagination);
}));

router.get('/:id', validateParams(idParam), handle((req, res) => {
  ok(res, entites.get(req.user, Number(req.params.id)), { resource: 'entites' });
}));

router.get('/:id/membres', validateParams(idParam), handle((req, res) => {
  ok(res, entites.membres(req.user, Number(req.params.id)), { resource: 'entites' });
}));

router.post('/', validate(S.entiteCreate), handle((req, res) => {
  ok(res, entites.create(req.user, req.body), { resource: 'entites' }, null, 201);
}));

router.put('/:id', validateParams(idParam), validate(S.entiteUpdate), handle((req, res) => {
  ok(res, entites.update(req.user, Number(req.params.id), req.body), { resource: 'entites' });
}));

/** DELETE = désactivation avec motif ; jamais de suppression physique. */
router.delete('/:id', validateParams(idParam), validate(S.entiteDeactivate), handle((req, res) => {
  ok(res, entites.deactivate(req.user, Number(req.params.id), req.body.motif), { resource: 'entites' });
}));

module.exports = router;
