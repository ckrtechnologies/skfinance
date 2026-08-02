'use strict';
const auditRepo = require('../../../domains/notifications/auditRepository');
const { ok } = require('../../../shared/utils/response');

async function list(req, res, next) {
  try {
    const result = await auditRepo.findMany({
      filters: {
        entity: req.query.entity,
        entity_id: req.query.entity_id,
        actor_profile_id: req.query.actor_profile_id,
        action: req.query.action,
      },
      page: parseInt(req.query.page ?? 1),
      limit: parseInt(req.query.limit ?? 50),
    });
    return ok(res, result);
  } catch (err) { next(err); }
}

module.exports = { list };
