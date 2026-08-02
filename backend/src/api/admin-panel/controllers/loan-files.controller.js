'use strict';
const loanService = require('../../../domains/loan-applications/service');
const docService  = require('../../../domains/documents/service');
const { getCdnUrl } = require('../../../shared/utils/cdnStorage');
const { ok, fail } = require('../../../shared/utils/response');
const { z } = require('zod');

const disburseSchema = z.object({
  disbursed_amount: z.number().positive(),
  remarks: z.string().optional(),
  disbursed_to: z.string().optional(),
  utr: z.string().optional(),
  bank_name: z.string().optional(),
});

async function list(req, res, next) {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.dealer_id) filters.dealer_id = req.query.dealer_id;
    if (req.query.staff_id) filters.staff_id = req.query.staff_id;
    const result = await loanService.listApplications(filters, { page: parseInt(req.query.page ?? 1), limit: parseInt(req.query.limit ?? 20) });
    return ok(res, result);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const app = await loanService.getApplication(req.params.id, { withDetails: true });
    return ok(res, { application: app });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return fail(res, 'NOT_FOUND', err.message, 404);
    next(err);
  }
}

async function appendStageEntry(req, res, next) {
  try {
    const { stage, outcome, remarks, data: stageData } = req.body;
    if (!stage || !outcome) return fail(res, 'VALIDATION_ERROR', 'stage and outcome are required', 422);
    const entry = await loanService.appendStageEntry({
      loanApplicationId: req.params.id, stage, outcome, remarks, data: stageData,
      enteredByProfileId: req.user.profile.id,
      role: 'admin',
    });
    return ok(res, { stage_entry: entry }, 201);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return fail(res, 'NOT_FOUND', err.message, 404);
    if (err.code === 'WRONG_STAGE') return fail(res, 'WRONG_STAGE', err.message, 409);
    if (err.code === 'APPLICATION_TERMINAL') return fail(res, 'APPLICATION_TERMINAL', err.message, 409);
    if (err.code === 'LIMIT_BLOCKED_90D') return fail(res, 'LIMIT_BLOCKED_90D', err.message, 409);
    next(err);
  }
}

async function disburse(req, res, next) {
  try {
    const parsed = disburseSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 'VALIDATION_ERROR', parsed.error.issues[0].message, 422);
    const { disbursed_amount, remarks, ...stageDataFields } = parsed.data;
    const result = await loanService.disburseApplication({
      loanApplicationId: req.params.id,
      adminProfileId: req.user.profile.id,
      disbursedAmount: disbursed_amount,
      remarks,
      stageData: stageDataFields,
    });
    return ok(res, result);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return fail(res, 'NOT_FOUND', err.message, 404);
    if (err.code === 'APPLICATION_TERMINAL') return fail(res, 'APPLICATION_TERMINAL', err.message, 409);
    if (err.code === 'LIMIT_BLOCKED_90D') return fail(res, 'LIMIT_BLOCKED_90D', err.message, 409);
    if (err.code === 'WRONG_STAGE') return fail(res, 'WRONG_STAGE', err.message, 409);
    next(err);
  }
}

async function reApprove(req, res, next) {
  try {
    const app = await loanService.reApproveApplication({
      loanApplicationId: req.params.id,
      adminProfileId: req.user.profile.id,
      remarks: req.body.remarks,
    });
    return ok(res, { application: app });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return fail(res, 'NOT_FOUND', err.message, 404);
    if (err.code === 'APPLICATION_TERMINAL') return fail(res, 'APPLICATION_TERMINAL', err.message, 409);
    next(err);
  }
}

module.exports = { list, getOne, appendStageEntry, disburse, reApprove };
