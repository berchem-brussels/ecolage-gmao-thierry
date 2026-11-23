/**
 * Ouvriers de l'entité active et leur profil : corps de métier et compétences (ROL-05, 0.19.0, étape 15, point 2).
 * Trois routes : les comptes eux-mêmes se gèrent dans Utilisateurs ; ici, seul le profil de métier change.
 */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validate, validateQuery, validateParams, idParam } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const equipes = require('../services/equipes');

const router = express.Router();
router.use(authMiddleware);

router.get('/', validateQuery(S.ouvrierList), handle((req, res) => {
  const { rows, pagination } = equipes.listOuvriers(req.user, req.query);
  ok(res, rows, { resource: 'ouvriers' }, pagination);
}));

router.get('/:id', validateParams(idParam), handle((req, res) => {
  ok(res, equipes.getOuvrier(req.user, Number(req.params.id)), { resource: 'ouvriers' });
}));

router.put('/:id', validateParams(idParam), validate(S.ouvrierUpdate), handle((req, res) => {
  ok(res, equipes.updateOuvrier(req.user, Number(req.params.id), req.body), { resource: 'ouvriers' });
}));

module.exports = router;
