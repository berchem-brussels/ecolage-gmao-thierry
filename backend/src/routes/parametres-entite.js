/**
 * Paramètres métier de l'entité active (ADM-03) : lecture pour toute personne de l'entité, réglage par le
 * responsable du service technique. Catalogue fermé (config/parametres-entite.json) : PUT règle une valeur,
 * DELETE rend le défaut livré.
 */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validate, validateQuery, validateParams } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const parametres = require('../services/parametres-entite');

const router = express.Router();
router.use(authMiddleware);

router.get('/', validateQuery(S.parametreEntiteList), handle((req, res) => {
  const { rows, pagination } = parametres.list(req.user, req.query);
  ok(res, rows, { resource: 'parametres-entite' }, pagination);
}));

router.get('/:cle', validateParams(S.parametreParams), handle((req, res) => {
  ok(res, parametres.get(req.user, req.params.cle), { resource: 'parametres-entite' });
}));

router.put('/:cle', validateParams(S.parametreParams), validate(S.parametreUpdate), handle((req, res) => {
  ok(res, parametres.update(req.user, req.params.cle, req.body.valeur), { resource: 'parametres-entite' });
}));

router.delete('/:cle', validateParams(S.parametreParams), validate(S.parametreReset), handle((req, res) => {
  ok(res, parametres.reset(req.user, req.params.cle), { resource: 'parametres-entite' });
}));

module.exports = router;
