/** Comptes : réservés à l'administrateur, sauf la lecture de sa propre fiche (standard v3.2, section 8.4). */
const express = require('express');
const { authMiddleware, requireRole } = require('../auth');
const { validate, validateQuery, validateParams, idParam } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const users = require('../services/users');

const router = express.Router();
router.use(authMiddleware);

router.get('/', requireRole('admin'), validateQuery(S.userList), handle((req, res) => {
  const { rows, pagination } = users.list(req.user, req.query);
  ok(res, rows, { resource: 'users' }, pagination);
}));

router.get('/:id', validateParams(idParam), handle((req, res) => {
  ok(res, users.get(req.user, Number(req.params.id)), { resource: 'users' });
}));

router.post('/', requireRole('admin'), validate(S.userCreate), handle((req, res) => {
  ok(res, users.create(req.user, req.body), { resource: 'users' }, null, 201);
}));

router.put('/:id', requireRole('admin'), validateParams(idParam), validate(S.userUpdate), handle((req, res) => {
  ok(res, users.update(req.user, Number(req.params.id), req.body), { resource: 'users' });
}));

/** DELETE = désactivation ; le compte reste en base. */
router.delete('/:id', requireRole('admin'), validateParams(idParam), handle((req, res) => {
  ok(res, users.deactivate(req.user, Number(req.params.id)), { resource: 'users' });
}));

module.exports = router;
