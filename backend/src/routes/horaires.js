/**
 * Horaire par jour de la semaine de l'entité active (PRI-02) : sept jours (1 lundi à 7 dimanche), catalogue fermé
 * (écart E-19). Lecture pour toute personne de l'entité ; PUT règle un jour, DELETE rend l'horaire livré
 * (responsable du service technique).
 */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validate, validateQuery, validateParams } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const calendrier = require('../services/calendrier');

const router = express.Router();
router.use(authMiddleware);

router.get('/', validateQuery(S.horaireList), handle((req, res) => {
  const { rows, pagination } = calendrier.listHoraires(req.user);
  ok(res, rows, { resource: 'horaires' }, pagination);
}));

router.get('/:jour', validateParams(S.horaireParams), handle((req, res) => {
  ok(res, calendrier.getHoraire(req.user, Number(req.params.jour)), { resource: 'horaires' });
}));

router.put('/:jour', validateParams(S.horaireParams), validate(S.horaireUpdate), handle((req, res) => {
  ok(res, calendrier.updateHoraire(req.user, Number(req.params.jour), req.body), { resource: 'horaires' });
}));

router.delete('/:jour', validateParams(S.horaireParams), validate(S.horaireReset), handle((req, res) => {
  ok(res, calendrier.resetHoraire(req.user, Number(req.params.jour)), { resource: 'horaires' });
}));

module.exports = router;
