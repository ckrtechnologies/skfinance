'use strict';
const lenderService = require('../../../domains/lenders/service');
const { lenderSchema } = require('../../../domains/lenders/validation');
const { ok, fail } = require('../../../shared/utils/response');

/** GET /admin/lenders */
async function listLenders(req, res, next) {
  try {
    const includeInactive = req.query.include_inactive === 'true';
    const lenders = await lenderService.listLenders({ includeInactive });
    return ok(res, { lenders });
  } catch (err) { next(err); }
}

/** POST /admin/lenders */
async function createLender(req, res, next) {
  try {
    const parsed = lenderSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 'VALIDATION_ERROR', parsed.error.issues[0].message, 422);
    const lender = await lenderService.createLender(parsed.data);
    return ok(res, { lender }, 201);
  } catch (err) { next(err); }
}

/** PATCH /admin/lenders/:id */
async function updateLender(req, res, next) {
  try {
    const lender = await lenderService.updateLender(req.params.id, req.body);
    return ok(res, { lender });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return fail(res, 'NOT_FOUND', err.message, 404);
    next(err);
  }
}

module.exports = { listLenders, createLender, updateLender };
