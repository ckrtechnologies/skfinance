'use strict';
const supabase = require('../../config/database');
const auditRepo = require('../notifications/auditRepository');

/** Get dealer wallet balance = SUM of ledger */
async function getBalance(dealerId) {
  const { data, error } = await supabase
    .from('wallet_ledger')
    .select('amount')
    .eq('dealer_id', dealerId);
  if (error) throw error;
  const balance = (data ?? []).reduce((sum, row) => sum + parseFloat(row.amount), 0);
  return Math.round(balance * 100) / 100;
}

async function getLedger(dealerId, { page = 1, limit = 30 } = {}) {
  const from = (page - 1) * limit;
  const { data, count, error } = await supabase
    .from('wallet_ledger')
    .select('*', { count: 'exact' })
    .eq('dealer_id', dealerId)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);
  if (error) throw error;
  return { items: data, total: count, page, limit };
}

async function requestWithdrawal(dealerId, profileId, amountRequested) {
  const balance = await getBalance(dealerId);
  if (amountRequested > balance) {
    const e = new Error(`Requested amount ₹${amountRequested} exceeds available balance ₹${balance}`);
    e.code = 'VALIDATION_ERROR'; e.status = 422; throw e;
  }
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .insert({ dealer_id: dealerId, amount_requested: amountRequested, status: 'requested' })
    .select().single();
  if (error) throw error;
  return data;
}

async function listWithdrawalRequests(dealerId, { page = 1, limit = 20 } = {}) {
  const from = (page - 1) * limit;
  const { data, count, error } = await supabase
    .from('withdrawal_requests')
    .select('*', { count: 'exact' })
    .eq('dealer_id', dealerId)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);
  if (error) throw error;
  return { items: data, total: count, page, limit };
}

async function processWithdrawal({ requestId, adminProfileId, payoutUtr, payoutDate, amount }) {
  // Get request
  const { data: req, error: fetchErr } = await supabase
    .from('withdrawal_requests').select('*').eq('id', requestId).single();
  if (fetchErr || !req) { const e = new Error('Withdrawal request not found'); e.code = 'NOT_FOUND'; e.status = 404; throw e; }
  if (req.status !== 'requested') {
    const e = new Error(`Request is already ${req.status}`); e.code = 'VALIDATION_ERROR'; e.status = 409; throw e;
  }

  // Insert payout ledger entry (negative = debit)
  const { data: ledgerRow, error: ledgerErr } = await supabase
    .from('wallet_ledger')
    .insert({
      dealer_id: req.dealer_id,
      entry_type: 'payout',
      amount: -Math.abs(amount),
      payout_utr: payoutUtr,
      payout_date: payoutDate,
      remarks: `Payout for withdrawal request ${requestId}`,
      created_by_profile_id: adminProfileId,
    })
    .select().single();
  if (ledgerErr) throw ledgerErr;

  // Update request status
  await supabase.from('withdrawal_requests').update({
    status: 'processed',
    processed_by: adminProfileId,
    processed_at: new Date().toISOString(),
    ledger_entry_id: ledgerRow.id,
  }).eq('id', requestId);

  await auditRepo.insert({
    actor_profile_id: adminProfileId,
    action: 'payout_processed',
    entity: 'withdrawal_requests',
    entity_id: requestId,
    detail: { amount, payout_utr: payoutUtr, ledger_entry_id: ledgerRow.id },
  });

  return ledgerRow;
}

async function addAdjustment({ dealerId, adminProfileId, amount, remarks }) {
  const { data, error } = await supabase
    .from('wallet_ledger')
    .insert({
      dealer_id: dealerId,
      entry_type: 'adjustment',
      amount,
      remarks,
      created_by_profile_id: adminProfileId,
    })
    .select().single();
  if (error) throw error;

  await auditRepo.insert({
    actor_profile_id: adminProfileId,
    action: 'wallet_adjustment',
    entity: 'wallet_ledger',
    entity_id: data.id,
    detail: { dealer_id: dealerId, amount, remarks },
  });

  return data;
}

async function listAllWithdrawalRequestsAdmin({ status, page = 1, limit = 20 } = {}) {
  let q = supabase
    .from('withdrawal_requests')
    .select('*, dealers(dealer_code, business_name)', { count: 'exact' });
  if (status) q = q.eq('status', status);
  const from = (page - 1) * limit;
  q = q.order('created_at', { ascending: false }).range(from, from + limit - 1);
  const { data, count, error } = await q;
  if (error) throw error;
  return { items: data, total: count, page, limit };
}

module.exports = {
  getBalance, getLedger, requestWithdrawal, listWithdrawalRequests,
  processWithdrawal, addAdjustment, listAllWithdrawalRequestsAdmin,
};
