/**
 * Planning de l'entité active (0.21.0, étape 17, point 3 ; PLA-03), lecture seule. Règles : services/planning.js.
 */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validateQuery } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const planning = require('../services/planning');

const router = express.Router();
router.use(authMiddleware);

router.get('/', validateQuery(S.planningQuery), handle((req, res) => {
  ok(res, planning.lire(req.user, req.query), { resource: 'planning' });
}));

module.exports = router;
