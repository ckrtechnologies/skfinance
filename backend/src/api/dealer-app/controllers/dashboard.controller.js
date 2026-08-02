'use strict';
const supabase = require('../../../config/database');
const walletService = require('../../../domains/wallet/service');
const loanService = require('../../../domains/loan-applications/service');
const { ok } = require('../../../shared/utils/response');

async function dashboard(req, res, next) {
  try {
    const { data: dealer } = await supabase.from('dealers').select('id').eq('profile_id', req.user.profile.id).single();
    const dealerId = dealer?.id;

    const [{ count: activeFiles }, { count: disbursedMTD }, balance] = await Promise.all([
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('dealer_id', dealerId).in('status', ['in_progress', 'approved']),
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('dealer_id', dealerId).eq('status', 'disbursed').gte('disbursed_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      walletService.getBalance(dealerId),
    ]);

    return ok(res, { active_files: activeFiles ?? 0, disbursed_mtd: disbursedMTD ?? 0, wallet_balance: balance });
  } catch (err) { next(err); }
}

module.exports = { dashboard };
