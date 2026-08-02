'use strict';
const walletService = require('../../../domains/wallet/service');
const { ok, fail } = require('../../../shared/utils/response');
const { z } = require('zod');

const processSchema = z.object({
  amount: z.number().positive(),
  payout_utr: z.string().min(1),
  payout_date: z.string(), // ISO date string
});

const adjustSchema = z.object({
  dealer_id: z.string().uuid(),
  amount: z.number(),
  remarks: z.string().min(1),
});

async function listWithdrawalRequests(req, res, next) {
  try {
    const result = await walletService.listAllWithdrawalRequestsAdmin({
      status: req.query.status,
      page: parseInt(req.query.page ?? 1),
    });
    return ok(res, result);
  } catch (err) { next(err); }
}

async function processWithdrawal(req, res, next) {
  try {
    const parsed = processSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 'VALIDATION_ERROR', parsed.error.issues[0].message, 422);
    const ledgerRow = await walletService.processWithdrawal({
      requestId: req.params.id,
      adminProfileId: req.user.profile.id,
      ...parsed.data,
    });
    return ok(res, { ledger_entry: ledgerRow });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return fail(res, 'NOT_FOUND', err.message, 404);
    if (err.code === 'VALIDATION_ERROR') return fail(res, 'VALIDATION_ERROR', err.message, 409);
    next(err);
  }
}

async function addAdjustment(req, res, next) {
  try {
    const parsed = adjustSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 'VALIDATION_ERROR', parsed.error.issues[0].message, 422);
    const entry = await walletService.addAdjustment({
      ...parsed.data,
      adminProfileId: req.user.profile.id,
    });
    return ok(res, { ledger_entry: entry }, 201);
  } catch (err) { next(err); }
}

module.exports = { listWithdrawalRequests, processWithdrawal, addAdjustment };
