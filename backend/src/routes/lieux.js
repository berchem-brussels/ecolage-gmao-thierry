/**
 * Référentiel des lieux (REF-01, REF-02) : cinq routes REST, l'arbre de l'entité active et la photo d'un lieu.
 * La photo arrive en corps binaire (image/jpeg ou image/png, 1 Mo au plus) par le lecteur intégré d'Express,
 * sans bibliothèque de plus (écart E-16) ; elle se lit par le seul cookie de session, comme une balise image l'envoie.
 */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validate, validateQuery, validateParams, idParam } = require('../validation');
const { ok, handle } = require('../envelope');
const { PHOTO_MAX_OCTETS } = require('../config');
const S = require('../schemas');
const lieux = require('../services/lieux');

const router = express.Router();
router.use(authMiddleware);

const PHOTO_TYPES = ['image/jpeg', 'image/png'];
const rawPhoto = express.raw({ type: PHOTO_TYPES, limit: PHOTO_MAX_OCTETS });

router.get('/', validateQuery(S.lieuList), handle((req, res) => {
  const { rows, pagination } = lieux.list(req.user, req.query);
  ok(res, rows, { resource: 'lieux' }, pagination);
}));

router.get('/arbre', validateQuery(S.lieuArbre), handle((req, res) => {
  ok(res, lieux.arbre(req.user, req.query), { resource: 'lieux' });
}));

router.get('/:id', validateParams(idParam), handle((req, res) => {
  ok(res, lieux.get(req.user, Number(req.params.id)), { resource: 'lieux' });
}));

router.post('/', validate(S.lieuCreate), handle((req, res) => {
  ok(res, lieux.create(req.user, req.body), { resource: 'lieux' }, null, 201);
}));

router.put('/:id', validateParams(idParam), validate(S.lieuUpdate), handle((req, res) => {
  ok(res, lieux.update(req.user, Number(req.params.id), req.body), { resource: 'lieux' });
}));

/** DELETE = désactivation avec motif ; jamais de suppression physique du lieu. */
router.delete('/:id', validateParams(idParam), validate(S.lieuDeactivate), handle((req, res) => {
  ok(res, lieux.deactivate(req.user, Number(req.params.id), req.body.motif), { resource: 'lieux' });
}));

router.get('/:id/photo', validateParams(idParam), handle((req, res) => {
  const { file, type } = lieux.photoFile(req.user, Number(req.params.id));
  res.setHeader('Content-Type', type);
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Cache-Control', 'private, no-store');
  res.sendFile(file);
}));

router.post('/:id/photo', validateParams(idParam), rawPhoto, handle((req, res) => {
  const announced = String(req.headers['content-type'] || '').split(';')[0].trim();
  ok(res, lieux.setPhoto(req.user, Number(req.params.id), req.body, PHOTO_TYPES.includes(announced) ? announced : null), { resource: 'lieux' });
}));

/** Suppression réelle de la photo (standard v3.2, section 9.1) : fichier effacé, lien vidé, journal d'audit. */
router.delete('/:id/photo', validateParams(idParam), handle((req, res) => {
  ok(res, lieux.deletePhoto(req.user, Number(req.params.id)), { resource: 'lieux' });
}));

module.exports = router;
