'use strict';
const notifService = require('../../../domains/notifications/service');
const { ok } = require('../../../shared/utils/response');

async function list(req, res, next) {
  try {
    const result = await notifService.listForProfile(req.user.profile.id, { page: parseInt(req.query.page ?? 1) });
    return ok(res, result);
  } catch (err) { next(err); }
}

async function markRead(req, res, next) {
  try {
    await notifService.markRead(req.params.id, req.user.profile.id);
    return ok(res, { message: 'Marked as read' });
  } catch (err) { next(err); }
}

module.exports = { list, markRead };
