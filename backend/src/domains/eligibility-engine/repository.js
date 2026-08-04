'use strict';
const { supabase } = require('../../config/database');

/**
 * getActiveLenders — fetches all active lenders ordered by priority.
 */
async function getActiveLenders() {
  const { data, error } = await supabase
    .from('lenders')
    .select('id, code, name, priority')
    .eq('is_active', true)
    .order('priority', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * getUploadedDocTypes — returns list of doc_type strings uploaded for a loan application.
 */
async function getUploadedDocTypes(loanApplicationId) {
  const { data, error } = await supabase
    .from('documents')
    .select('doc_type, party')
    .eq('loan_application_id', loanApplicationId);

  if (error) throw error;
  return data.map(d => d.doc_type);
}

/**
 * insertEvaluation — appends a row to eligibility_evaluations (append-only).
 * Always includes lender_code and rules_version (the audit trail).
 */
async function insertEvaluation({ loan_application_id, lender_code, rules_version, stage, result, failed_rules, missing_items }) {
  const { data, error } = await supabase
    .from('eligibility_evaluations')
    .insert({
      loan_application_id,
      lender_code,
      rules_version,
      stage,
      result,
      failed_rules,
      missing_items,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data;
}

module.exports = { getActiveLenders, getUploadedDocTypes, insertEvaluation };
