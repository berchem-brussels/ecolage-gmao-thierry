/**
 * Jours fériés légaux belges d'une année (PRI-02), calculés par le serveur ; lecture seule, rien n'est stocké.
 * Ressource calculée : une seule route, sans écriture (écart E-19).
 */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validateQuery } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const calendrier = require('../services/calendrier');

const router = express.Router();
router.use(authMiddleware);

router.get('/', validateQuery(S.ferieList), handle((req, res) => {
  const { rows, pagination } = calendrier.listFeries(req.user, req.query);
  ok(res, rows, { resource: 'jours-feries' }, pagination);
}));

module.exports = router;
