/**
 * Simulateur d'échéance de l'entité active (PRI-02, PRI-03) : « une demande de cette priorité (ou de cette catégorie)
 * reçue à cet instant est à prendre en charge et à terminer le … ». Calcul en lecture seule, rien n'est écrit.
 */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validateQuery } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const echeances = require('../services/echeances');

const router = express.Router();
router.use(authMiddleware);

router.get('/simulation', validateQuery(S.echeanceSimulation), handle((req, res) => {
  ok(res, echeances.simuler(req.user, req.query), { resource: 'echeances' });
}));

module.exports = router;
