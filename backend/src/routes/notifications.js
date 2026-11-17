/**
 * Notifications de la cloche (0.17.0, étape 13 ; services/notifications.js) : celles de la personne connectée, dans
 * l'entité active. Les routes fixes passent avant la route à identifiant.
 */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validate, validateQuery, validateParams, idParam } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const notifications = require('../services/notifications');

const router = express.Router();
router.use(authMiddleware);

router.get('/', validateQuery(S.notificationList), handle((req, res) => {
  const { rows, pagination } = notifications.list(req.user, req.query);
  ok(res, rows, { resource: 'notifications', ...notifications.compteur(req.user) }, pagination);
}));
router.get('/compteur', handle((req, res) => {
  ok(res, notifications.compteur(req.user), { resource: 'notifications' });
}));
router.get('/evenements', handle((req, res) => {
  ok(res, notifications.evenements(req.user), { resource: 'notifications' });
}));
router.put('/lues', validate(S.notificationLue), handle((req, res) => {
  ok(res, notifications.marquerToutes(req.user), { resource: 'notifications' });
}));
router.get('/:id', validateParams(idParam), handle((req, res) => {
  ok(res, notifications.get(req.user, Number(req.params.id)), { resource: 'notifications' });
}));
router.put('/:id/lue', validateParams(idParam), validate(S.notificationLue), handle((req, res) => {
  ok(res, notifications.marquerLue(req.user, Number(req.params.id)), { resource: 'notifications' });
}));

module.exports = router;
