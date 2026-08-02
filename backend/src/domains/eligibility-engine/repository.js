'use strict';
const supabase = require('../../config/database');

/** Fetch all active policies for the engine pre-filter */
async function findActivePoliciesPrefilter(input) {
  // Indexed pre-filter: lender must be active; policy must be active
  // Amount and age bounds checked in DB to reduce rows before JS rule evaluation
  let q = supabase
    .from('lender_policies')
    .select(`
      *,
      policy_documents(*),
      lenders!inner(id, name, code, priority, is_active)
    `)
    .eq('status', 'active')
    .eq('lenders.is_active', true)
    .lte('min_loan_amount', input.requested_amount)
    .gte('max_loan_amount', input.requested_amount)
    .lte('min_age', input.age)
    .gte('max_age', input.age);

  if (input.product_type) {
    q = q.eq('product_type', input.product_type);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** Append an eligibility_evaluations row (append-only) */
async function insertEvaluation(row) {
  const { data, error } = await supabase
    .from('eligibility_evaluations')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Get uploaded doc types for a loan application (for 'full' evaluation) */
async function getUploadedDocTypes(loanApplicationId) {
  const { data, error } = await supabase
    .from('documents')
    .select('doc_type, party')
    .eq('loan_application_id', loanApplicationId);
  if (error) throw error;
  return data?.map(d => d.doc_type) ?? [];
}

module.exports = { findActivePoliciesPrefilter, insertEvaluation, getUploadedDocTypes };
