/** Listes de valeurs par entité (REF-08) : cinq routes REST appelant la couche de service (standard v3.2, section 7.3). */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validate, validateQuery, validateParams, idParam } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const valeurs = require('../services/listes-valeurs');

const router = express.Router();
router.use(authMiddleware);

router.get('/', validateQuery(S.valeurList), handle((req, res) => {
  const { rows, pagination } = valeurs.list(req.user, req.query);
  ok(res, rows, { resource: 'listes-valeurs' }, pagination);
}));

router.get('/:id', validateParams(idParam), handle((req, res) => {
  ok(res, valeurs.get(req.user, Number(req.params.id)), { resource: 'listes-valeurs' });
}));

router.post('/', validate(S.valeurCreate), handle((req, res) => {
  ok(res, valeurs.create(req.user, req.body), { resource: 'listes-valeurs' }, null, 201);
}));

router.put('/:id', validateParams(idParam), validate(S.valeurUpdate), handle((req, res) => {
  ok(res, valeurs.update(req.user, Number(req.params.id), req.body), { resource: 'listes-valeurs' });
}));

/** DELETE = désactivation avec motif ; jamais de suppression physique. */
router.delete('/:id', validateParams(idParam), validate(S.valeurDeactivate), handle((req, res) => {
  ok(res, valeurs.deactivate(req.user, Number(req.params.id), req.body.motif), { resource: 'listes-valeurs' });
}));

module.exports = router;
