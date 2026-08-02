'use strict';
const commService = require('../../../domains/commissions/service');
const { ok } = require('../../../shared/utils/response');

async function list(req, res, next) {
  try {
    const result = await commService.findAllForAdmin({
      status: req.query.status,
      dealerId: req.query.dealer_id,
      page: parseInt(req.query.page ?? 1),
      limit: parseInt(req.query.limit ?? 20),
    });
    return ok(res, result);
  } catch (err) { next(err); }
}

module.exports = { list };
