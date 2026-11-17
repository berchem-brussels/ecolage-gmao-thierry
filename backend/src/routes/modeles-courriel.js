/**
 * Modèles de courriel (0.17.0, étape 13, point 3 ; services/modeles-courriel.js, commun au MCP) : liste, lecture,
 * modification, retour au texte livré, aperçu. Administrateur seulement.
 */
const express = require('express');
const { authMiddleware, requireRole } = require('../auth');
const { validate, validateParams } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const modeles = require('../services/modeles-courriel');

const router = express.Router();
router.use(authMiddleware, requireRole('admin'));

router.get('/', handle((req, res) => {
  ok(res, modeles.list(req.user), { resource: 'modeles-courriel', variables: modeles.VARIABLES });
}));
router.get('/:code', validateParams(S.modeleCourrielParams), handle((req, res) => {
  ok(res, modeles.get(req.user, req.params.code), { resource: 'modeles-courriel' });
}));
router.put('/:code', validateParams(S.modeleCourrielParams), validate(S.modeleCourrielUpdate), handle((req, res) => {
  ok(res, modeles.update(req.user, req.params.code, req.body), { resource: 'modeles-courriel' });
}));
router.post('/:code/retablir', validateParams(S.modeleCourrielParams), validate(S.modeleCourrielRetablir), handle((req, res) => {
  ok(res, modeles.retablir(req.user, req.params.code), { resource: 'modeles-courriel' });
}));
router.post('/:code/apercu', validateParams(S.modeleCourrielParams), validate(S.modeleCourrielApercu), handle((req, res) => {
  ok(res, modeles.apercu(req.user, req.params.code, req.body), { resource: 'modeles-courriel' });
}));

module.exports = router;
