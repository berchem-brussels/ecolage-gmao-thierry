/** Tickets : routes REST qui appellent la couche de service (standard, section 13.5). */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validate, validateQuery, validateParams, idParam } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const tickets = require('../services/tickets');

const router = express.Router();
router.use(authMiddleware);
const meta = { resource: 'tickets' };

router.get('/', validateQuery(S.ticketList), handle((req, res) => {
  const { rows, pagination } = tickets.list(req.user, req.query);
  ok(res, rows, meta, pagination);
}));
router.get('/stats', handle((req, res) => ok(res, tickets.stats(req.user), meta)));
router.get('/to-handle', handle((req, res) => ok(res, tickets.toHandle(req.user), meta)));
router.get('/:id', validateParams(idParam), handle((req, res) => ok(res, tickets.get(req.user, Number(req.params.id)), meta)));
router.get('/:id/screenshot', validateParams(idParam), handle((req, res) => {
  const m = /^data:(image\/(?:png|jpeg));base64,(.+)$/.exec(tickets.screenshot(req.user, Number(req.params.id)));
  res.setHeader('Content-Type', m[1]);
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  res.send(Buffer.from(m[2], 'base64'));
}));
router.post('/', validate(S.ticketCreate), handle((req, res) => ok(res, tickets.create(req.user, req.body), meta, null, 201)));
router.put('/:id', validateParams(idParam), validate(S.ticketUpdate), handle((req, res) => ok(res, tickets.update(req.user, Number(req.params.id), req.body), meta)));
router.post('/:id/status', validateParams(idParam), validate(S.ticketStatus), handle((req, res) => ok(res, tickets.changeStatus(req.user, Number(req.params.id), req.body), meta)));
router.post('/:id/faq', validateParams(idParam), validate(S.faqFromTicket), handle((req, res) => ok(res, tickets.toFaq(req.user, Number(req.params.id), req.body), { resource: 'faq' }, null, 201)));
router.post('/:id/messages', validateParams(idParam), validate(S.ticketMessage), handle((req, res) => ok(res, tickets.addMessage(req.user, Number(req.params.id), req.body), meta, null, 201)));

module.exports = router;
