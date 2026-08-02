'use strict';
const walletService = require('../../../domains/wallet/service');
const { ok, fail } = require('../../../shared/utils/response');
const supabase = require('../../../config/database');

async function _dealerId(profile) {
  const { data } = await supabase.from('dealers').select('id').eq('profile_id', profile.id).single();
  return data?.id;
}

async function getWallet(req, res, next) {
  try {
    const dealerId = await _dealerId(req.user.profile);
    const [balance, ledger] = await Promise.all([
      walletService.getBalance(dealerId),
      walletService.getLedger(dealerId, { page: parseInt(req.query.page ?? 1), limit: parseInt(req.query.limit ?? 30) }),
    ]);
    return ok(res, { balance, ...ledger });
  } catch (err) { next(err); }
}

async function createWithdrawal(req, res, next) {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return fail(res, 'VALIDATION_ERROR', 'amount must be positive', 422);
    const dealerId = await _dealerId(req.user.profile);
    const request = await walletService.requestWithdrawal(dealerId, req.user.profile.id, amount);
    return ok(res, { withdrawal_request: request }, 201);
  } catch (err) {
    if (err.code === 'VALIDATION_ERROR') return fail(res, 'VALIDATION_ERROR', err.message, 422);
    next(err);
  }
}

async function listWithdrawals(req, res, next) {
  try {
    const dealerId = await _dealerId(req.user.profile);
    const result = await walletService.listWithdrawalRequests(dealerId, { page: parseInt(req.query.page ?? 1) });
    return ok(res, result);
  } catch (err) { next(err); }
}

module.exports = { getWallet, createWithdrawal, listWithdrawals };
