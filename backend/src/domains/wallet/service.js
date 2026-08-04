'use strict';
const { supabase } = require('../../config/database');

async function getDealerCommissions(dealerId) {
  const { data, error } = await supabase.from('commissions').select('*').eq('dealer_id', dealerId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function getDealerWallet(dealerId) {
  const { data: ledger, error } = await supabase.from('wallet_ledger').select('*').eq('dealer_id', dealerId).order('created_at', { ascending: false });
  if (error) throw error;
  const balance = ledger.reduce((sum, e) => sum + Number(e.amount), 0);
  return { balance, ledger };
}

async function createWithdrawalRequest(dealerId, amountRequested) {
  const { data, error } = await supabase.from('withdrawal_requests').insert({ dealer_id: dealerId, amount_requested: amountRequested }).select().single();
  if (error) throw error;
  return data;
}

async function getWithdrawalRequests(dealerId) {
  const { data, error } = await supabase.from('withdrawal_requests').select('*').eq('dealer_id', dealerId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function processWithdrawal({ requestId, adminProfileId, approved, rejectionReason, payoutUtr, payoutDate }) {
  const req = await supabase.from('withdrawal_requests').select('*').eq('id', requestId).single();
  if (!req.data) throw Object.assign(new Error('NOT_FOUND: Withdrawal request not found'), { statusCode: 404 });

  if (!approved) {
    const { data, error } = await supabase.from('withdrawal_requests').update({ status: 'rejected', processed_by: adminProfileId, processed_at: new Date().toISOString(), rejection_reason: rejectionReason }).eq('id', requestId).select().single();
    if (error) throw error;
    return data;
  }

  // Create a payout ledger entry, then mark request processed
  const { data: ledgerEntry, error: ledgerError } = await supabase.from('wallet_ledger').insert({ dealer_id: req.data.dealer_id, entry_type: 'payout', amount: -req.data.amount_requested, payout_utr: payoutUtr, payout_date: payoutDate, remarks: `Payout for withdrawal request ${requestId}`, created_by_profile_id: adminProfileId }).select().single();
  if (ledgerError) throw ledgerError;

  const { data, error } = await supabase.from('withdrawal_requests').update({ status: 'processed', processed_by: adminProfileId, processed_at: new Date().toISOString(), ledger_entry_id: ledgerEntry.id }).eq('id', requestId).select().single();
  if (error) throw error;
  return data;
}

async function listAllCommissions() {
  const { data, error } = await supabase.from('commissions').select('*, dealers(business_name, profile_id), loan_applications(application_no)').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function listAllWithdrawals() {
  const { data, error } = await supabase.from('withdrawal_requests').select('*, dealers(business_name)').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

module.exports = { getDealerCommissions, getDealerWallet, createWithdrawalRequest, getWithdrawalRequests, processWithdrawal, listAllCommissions, listAllWithdrawals };
