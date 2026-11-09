/**
 * États d'une demande et table des passages (0.14.0, étape 9 ; CYC-01, CYC-04) : libellés de l'entité active vus par
 * le demandeur et envoyés à la GRC, réglés par le responsable ; table des passages permis, en lecture.
 * Appelle services/cycle.js, comme les outils MCP list_etats_demande, list_transitions_demande et update_etat_demande.
 */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validate, validateParams } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const cycle = require('../services/cycle');

const router = express.Router();
router.use(authMiddleware);

router.get('/', handle((req, res) => {
  ok(res, cycle.listEtats(req.user), { resource: 'etats-demande' });
}));

router.get('/transitions', handle((req, res) => {
  ok(res, cycle.listTransitions(req.user), { resource: 'etats-demande' });
}));

router.put('/:code', validateParams(S.etatDemandeParams), validate(S.etatDemandeUpdate), handle((req, res) => {
  ok(res, cycle.updateEtat(req.user, req.params.code, req.body), { resource: 'etats-demande' });
}));

module.exports = router;
