'use strict';
const { supabase } = require('../../config/database');

async function getDealerCommissions(dealerId, { startDate, endDate } = {}) {
  let query = supabase
    .from('commissions')
    .select('*, loan_applications(id, application_no, customers(id, profiles!profile_id(full_name)))')
    .eq('dealer_id', dealerId)
    .order('created_at', { ascending: false });

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function getDealerWallet(dealerId, { startDate, endDate } = {}) {
  let query = supabase
    .from('wallet_ledger')
    .select('*, loan_applications(id, application_no, product_type, customers(id, profiles!profile_id(full_name)))')
    .eq('dealer_id', dealerId)
    .order('created_at', { ascending: false });

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data: ledger, error } = await query;
  if (error) throw error;
  const balance = ledger.reduce((sum, e) => sum + Number(e.amount), 0);
  return { balance, ledger };
}

async function createWithdrawalRequest(dealerId, amountRequested) {
  const { data, error } = await supabase.from('withdrawal_requests').insert({ dealer_id: dealerId, amount_requested: amountRequested }).select().single();
  if (error) throw error;
  return data;
}

async function getWithdrawalRequests(dealerId, { startDate, endDate } = {}) {
  let query = supabase.from('withdrawal_requests').select('*').eq('dealer_id', dealerId).order('created_at', { ascending: false });

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function processWithdrawal({ requestId, adminProfileId, approved, rejectionReason, payoutUtr, payoutDate, receiptPdfUrl, receiptPdfName }) {
  const req = await supabase.from('withdrawal_requests').select('*').eq('id', requestId).single();
  if (!req.data) throw Object.assign(new Error('NOT_FOUND: Withdrawal request not found'), { statusCode: 404 });

  if (!approved) {
    const { data, error } = await supabase.from('withdrawal_requests').update({ 
      status: 'rejected', 
      processed_by: adminProfileId, 
      processed_at: new Date().toISOString(), 
      rejection_reason: rejectionReason 
    }).eq('id', requestId).select().single();
    if (error) throw error;
    return data;
  }

  // Create a payout ledger entry, then mark request processed
  const { data: ledgerEntry, error: ledgerError } = await supabase.from('wallet_ledger').insert({ 
    dealer_id: req.data.dealer_id, 
    entry_type: 'payout', 
    amount: -req.data.amount_requested, 
    payout_utr: payoutUtr || null, 
    payout_date: payoutDate || new Date().toISOString().slice(0,10), 
    receipt_pdf_url: receiptPdfUrl || null,
    receipt_pdf_name: receiptPdfName || null,
    remarks: `Manual Bank Transfer Payout (UTR: ${payoutUtr || 'N/A'})`, 
    created_by_profile_id: adminProfileId 
  }).select().single();
  if (ledgerError) throw ledgerError;

  const { data, error } = await supabase.from('withdrawal_requests').update({ 
    status: 'processed', 
    processed_by: adminProfileId, 
    processed_at: new Date().toISOString(), 
    receipt_pdf_url: receiptPdfUrl || null,
    receipt_pdf_name: receiptPdfName || null,
    ledger_entry_id: ledgerEntry.id 
  }).eq('id', requestId).select().single();
  if (error) throw error;
  return data;
}

async function listAllCommissions({ startDate, endDate } = {}) {
  let query = supabase.from('commissions').select('*, dealers(business_name, profile_id), loan_applications(application_no)').order('created_at', { ascending: false });
  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function listAllWithdrawals({ status, startDate, endDate } = {}) {
  let query = supabase.from('withdrawal_requests').select('*, dealers(business_name)').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

module.exports = { getDealerCommissions, getDealerWallet, createWithdrawalRequest, getWithdrawalRequests, processWithdrawal, listAllCommissions, listAllWithdrawals };
