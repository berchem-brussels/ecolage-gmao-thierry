/** Rôles des personnes par entité : cinq routes REST réservées à l'administrateur (cahier des charges ROL-02). */
const express = require('express');
const { authMiddleware, requireRole } = require('../auth');
const { validate, validateQuery, validateParams, idParam } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const svc = require('../services/roles-utilisateurs');

const router = express.Router();
router.use(authMiddleware, requireRole('admin'));

router.get('/', validateQuery(S.userRoleList), handle((req, res) => {
  const { rows, pagination } = svc.list(req.user, req.query);
  ok(res, rows, { resource: 'roles-utilisateurs' }, pagination);
}));

router.get('/:id', validateParams(idParam), handle((req, res) => {
  ok(res, svc.get(req.user, Number(req.params.id)), { resource: 'roles-utilisateurs' });
}));

router.post('/', validate(S.userRoleCreate), handle((req, res) => {
  ok(res, svc.create(req.user, req.body), { resource: 'roles-utilisateurs' }, null, 201);
}));

router.put('/:id', validateParams(idParam), validate(S.userRoleUpdate), handle((req, res) => {
  ok(res, svc.update(req.user, Number(req.params.id), req.body), { resource: 'roles-utilisateurs' });
}));

/** DELETE = retrait du rôle avec motif ; la ligne reste en base. */
router.delete('/:id', validateParams(idParam), validate(S.userRoleRetrait), handle((req, res) => {
  ok(res, svc.retirer(req.user, Number(req.params.id), req.body.motif), { resource: 'roles-utilisateurs' });
}));

module.exports = router;
