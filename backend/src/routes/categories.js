/**
 * Catégories d'intervention en arbre (REF-06) : cinq routes REST et l'arbre de l'entité active, appelant la couche de
 * service (standard v3.2, section 7.3). DELETE désactive avec un motif ; aucune suppression physique.
 * 0.7.0 (DEM-05) : liste et ajout des questions de la catégorie ; la fiche d'une question est sous /api/questions-categorie.
 */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validate, validateQuery, validateParams, idParam } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const categories = require('../services/categories');
const questions = require('../services/questions-categorie');

const router = express.Router();
router.use(authMiddleware);

router.get('/', validateQuery(S.categorieList), handle((req, res) => {
  const { rows, pagination } = categories.list(req.user, req.query);
  ok(res, rows, { resource: 'categories' }, pagination);
}));

router.get('/arbre', validateQuery(S.categorieArbre), handle((req, res) => {
  ok(res, categories.arbre(req.user, req.query), { resource: 'categories' });
}));

router.get('/:id', validateParams(idParam), handle((req, res) => {
  ok(res, categories.get(req.user, Number(req.params.id)), { resource: 'categories' });
}));

/** Questions propres de la catégorie (DEM-05, 0.7.0) : liste (inclure_inactives = 1 pour la fiche) et ajout. */
router.get('/:id/questions', validateParams(idParam), validateQuery(S.questionList), handle((req, res) => {
  const r = questions.list(req.user, Number(req.params.id), req.query);
  ok(res, r.rows, { resource: 'questions-categorie', categorie_id: r.categorie_id, max_actives: r.max_actives });
}));

router.post('/:id/questions', validateParams(idParam), validate(S.questionCreate), handle((req, res) => {
  ok(res, questions.create(req.user, Number(req.params.id), req.body), { resource: 'questions-categorie' }, null, 201);
}));

router.post('/', validate(S.categorieCreate), handle((req, res) => {
  ok(res, categories.create(req.user, req.body), { resource: 'categories' }, null, 201);
}));

router.put('/:id', validateParams(idParam), validate(S.categorieUpdate), handle((req, res) => {
  ok(res, categories.update(req.user, Number(req.params.id), req.body), { resource: 'categories' });
}));

/** DELETE = désactivation avec motif ; refusée pour un domaine qui a encore des natures actives. */
router.delete('/:id', validateParams(idParam), validate(S.categorieDeactivate), handle((req, res) => {
  ok(res, categories.deactivate(req.user, Number(req.params.id), req.body.motif), { resource: 'categories' });
}));

module.exports = router;
