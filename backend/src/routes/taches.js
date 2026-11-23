/**
 * Tâches d'une demande (0.20.0, étape 16, point 1 ; CYC-03, DV-160) : fiche, modification et passage d'une tâche.
 * La liste et la création sont sous /api/demandes/:id/taches (routes/demandes.js). Même couche de service que le MCP.
 */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validate, validateParams, validateQuery, idParam } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const taches = require('../services/taches');

const router = express.Router();
router.use(authMiddleware);

router.get('/:id', validateParams(idParam), handle((req, res) => {
  ok(res, taches.get(req.user, Number(req.params.id)), { resource: 'taches' });
}));

router.put('/:id', validateParams(idParam), validate(S.tacheUpdate), handle((req, res) => {
  ok(res, taches.update(req.user, Number(req.params.id), req.body), { resource: 'taches' });
}));

/** Passage d'une tâche (à faire, en cours, terminée, annulée avec motif) ; peut faire passer la demande (règle 5). */
router.post('/:id/etat', validateParams(idParam), validate(S.tacheEtat), handle((req, res) => {
  ok(res, taches.passer(req.user, Number(req.params.id), req.body), { resource: 'taches' });
}));

/** Affectation à une équipe ou à des ouvriers, date et heure (PLA-01, DV-161) ; peut faire passer la demande « Planifiée ». */
router.put('/:id/affectation', validateParams(idParam), validate(S.tacheAffectation), handle((req, res) => {
  ok(res, taches.affecter(req.user, Number(req.params.id), req.body), { resource: 'taches' });
}));

/** Suggestion d'affectation (PLA-02, DV-162) : ouvriers triés par corps de métier, disponibilité et charge ; rien n'est écrit. */
router.get('/:id/suggestions', validateParams(idParam), validateQuery(S.tacheSuggestions), handle((req, res) => {
  ok(res, taches.suggestions(req.user, Number(req.params.id), req.query), { resource: 'taches' });
}));

module.exports = router;
