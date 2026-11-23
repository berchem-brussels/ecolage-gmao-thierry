/**
 * Vues enregistrées de la liste du service technique (GES-02, 0.9.0 ; services/vues-demandes.js) : une personne garde
 * ses filtres sous un nom, dans l'entité active.
 */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validate, validateQuery, validateParams, idParam } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const vues = require('../services/vues-demandes');

const router = express.Router();
router.use(authMiddleware);

router.get('/', validateQuery(S.vueList), handle((req, res) => {
  const { rows, pagination } = vues.list(req.user, req.query);
  ok(res, rows, { resource: 'vues-demandes' }, pagination);
}));
router.get('/:id', validateParams(idParam), handle((req, res) => {
  ok(res, vues.get(req.user, Number(req.params.id)), { resource: 'vues-demandes' });
}));
router.post('/', validate(S.vueCreate), handle((req, res) => {
  ok(res, vues.create(req.user, req.body), { resource: 'vues-demandes' }, null, 201);
}));
router.put('/:id', validateParams(idParam), validate(S.vueUpdate), handle((req, res) => {
  ok(res, vues.update(req.user, Number(req.params.id), req.body), { resource: 'vues-demandes' });
}));
router.delete('/:id', validateParams(idParam), handle((req, res) => {
  ok(res, vues.remove(req.user, Number(req.params.id)), { resource: 'vues-demandes' });
}));

module.exports = router;
