/**
 * Courriel (0.17.0, étape 13, point 2 ; services/courriel.js, commun au MCP) : réglages SMTP et mode test, envoi d'essai,
 * courriels retenus en mode test et journal des envois. Administrateur seulement.
 */
const express = require('express');
const { authMiddleware, requireRole } = require('../auth');
const { validate, validateQuery, validateParams, idParam } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const courriel = require('../services/courriel');

const router = express.Router();

router.get('/settings/courriel', authMiddleware, requireRole('admin'), handle((req, res) => {
  ok(res, courriel.lire(req.user), { resource: 'settings' });
}));
router.put('/settings/courriel', authMiddleware, requireRole('admin'), validate(S.courrielSettings), handle((req, res) => {
  ok(res, courriel.regler(req.user, req.body), { resource: 'settings' });
}));
router.post('/settings/courriel/essai', authMiddleware, requireRole('admin'), validate(S.courrielEssai), handle(async (req, res) => {
  ok(res, await courriel.essai(req.user, req.body), { resource: 'courriels' });
}));
router.get('/courriels', authMiddleware, requireRole('admin'), validateQuery(S.courrielList), handle((req, res) => {
  const { rows, pagination } = courriel.list(req.user, req.query);
  ok(res, rows, { resource: 'courriels', mode: courriel.mode() }, pagination);
}));
router.get('/courriels/:id', authMiddleware, requireRole('admin'), validateParams(idParam), handle((req, res) => {
  ok(res, courriel.get(req.user, Number(req.params.id)), { resource: 'courriels' });
}));

module.exports = router;
