'use strict';
const supabase = require('../../config/database');

/**
 * calculateCommission — SOLE commission calculation point (AGENTS.md §6 rule 5).
 * Slab (L7): 1.5% if disbursed_amount ≤ ₹10,00,000 / 2% if above.
 * Rate is read from settings at call time so changing it is one DB row update.
 *
 * NOTE on O1: docs currently assume 2% applies to the WHOLE amount once above ₹10L.
 * If client confirms marginal calculation, update this function only.
 */
async function calculateCommission(disbursedAmount) {
  const { data: setting } = await supabase
    .from('settings').select('value').eq('key', 'commission_slab').single();

  const threshold   = setting?.value?.threshold  ?? 1000000;
  const rateBelow   = setting?.value?.rate_below  ?? 0.015;
  const rateAbove   = setting?.value?.rate_above  ?? 0.02;

  const rate   = disbursedAmount > threshold ? rateAbove : rateBelow;
  const amount = Math.round(disbursedAmount * rate * 100) / 100;

  return { rate, amount };
}

async function findByLoanApplication(loanApplicationId) {
  const { data, error } = await supabase
    .from('commissions').select('*').eq('loan_application_id', loanApplicationId).maybeSingle();
  if (error) throw error;
  return data;
}

async function findAllForAdmin({ status, dealerId, page = 1, limit = 20 } = {}) {
  let q = supabase.from('commissions').select(`*, dealers(dealer_code, business_name), loan_applications(application_no)`, { count: 'exact' });
  if (status) q = q.eq('status', status);
  if (dealerId) q = q.eq('dealer_id', dealerId);
  const from = (page - 1) * limit;
  q = q.order('created_at', { ascending: false }).range(from, from + limit - 1);
  const { data, count, error } = await q;
  if (error) throw error;
  return { items: data, total: count, page, limit };
}

async function findAllForDealer(dealerId, { page = 1, limit = 20 } = {}) {
  const from = (page - 1) * limit;
  const { data, count, error } = await supabase
    .from('commissions')
    .select('*, loan_applications(application_no)', { count: 'exact' })
    .eq('dealer_id', dealerId)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);
  if (error) throw error;
  return { items: data, total: count, page, limit };
}

module.exports = { calculateCommission, findByLoanApplication, findAllForAdmin, findAllForDealer };
