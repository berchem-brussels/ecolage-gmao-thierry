/**
 * Questions propres à la catégorie (DEM-05, version 0.7.0) : lecture, modification et désactivation d'une question,
 * appelant la couche de service (standard v3.2, section 7.3). La liste et la création se font sur la catégorie
 * (routes/categories.js : GET et POST /api/categories/:id/questions). DELETE désactive avec un motif.
 */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validate, validateParams, idParam } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const questions = require('../services/questions-categorie');

const router = express.Router();
router.use(authMiddleware);

router.get('/:id', validateParams(idParam), handle((req, res) => {
  ok(res, questions.get(req.user, Number(req.params.id)), { resource: 'questions-categorie' });
}));

router.put('/:id', validateParams(idParam), validate(S.questionUpdate), handle((req, res) => {
  ok(res, questions.update(req.user, Number(req.params.id), req.body), { resource: 'questions-categorie' });
}));

/** DELETE = désactivation avec motif. */
router.delete('/:id', validateParams(idParam), validate(S.questionDeactivate), handle((req, res) => {
  ok(res, questions.deactivate(req.user, Number(req.params.id), req.body.motif), { resource: 'questions-categorie' });
}));

module.exports = router;
