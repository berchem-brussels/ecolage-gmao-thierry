/**
 * Paramètres de l'instance (ADM-01), réservés à l'administrateur ; la couche de service porte le contrôle.
 * Le catalogue est fermé (config/parametres-instance.json) : ni création ni suppression d'une clé.
 * PUT règle une valeur ; DELETE rend le défaut livré (annulation de la valeur de l'instance, standard v3.2 section 7.3).
 */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validate, validateQuery, validateParams } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const parametres = require('../services/parametres');

const router = express.Router();
router.use(authMiddleware);

router.get('/', validateQuery(S.parametreList), handle((req, res) => {
  const { rows, pagination } = parametres.list(req.user, req.query);
  ok(res, rows, { resource: 'parametres' }, pagination);
}));

router.get('/:cle', validateParams(S.parametreParams), handle((req, res) => {
  ok(res, parametres.get(req.user, req.params.cle), { resource: 'parametres' });
}));

router.put('/:cle', validateParams(S.parametreParams), validate(S.parametreUpdate), handle((req, res) => {
  ok(res, parametres.update(req.user, req.params.cle, req.body.valeur), { resource: 'parametres' });
}));

router.delete('/:cle', validateParams(S.parametreParams), validate(S.parametreReset), handle((req, res) => {
  ok(res, parametres.reset(req.user, req.params.cle), { resource: 'parametres' });
}));

module.exports = router;
