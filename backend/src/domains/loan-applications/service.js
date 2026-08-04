'use strict';
const { supabase } = require('../../config/database');
const { generateAppNo } = require('../../shared/utils/appNo');

async function createApplication({ customerId, createdByProfileId, dealerId, staffId, productType, vehicleDetails, requestedAmount }) {
  const application_no = await generateAppNo();
  const { data, error } = await supabase
    .from('loan_applications')
    .insert({ application_no, customer_id: customerId, created_by_profile_id: createdByProfileId, dealer_id: dealerId, staff_id: staffId, product_type: productType, vehicle_details: vehicleDetails, requested_amount: requestedAmount })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getApplication(id) {
  const { data, error } = await supabase
    .from('loan_applications')
    .select('*, customers(*), dealers(*), staff(*), lenders(*)')
    .eq('id', id)
    .single();
  if (error || !data) throw Object.assign(new Error('NOT_FOUND: Loan application not found'), { statusCode: 404, code: 'NOT_FOUND' });
  return data;
}

async function listApplications({ status, stage, dealerId, staffId, customerId, limit = 20, offset = 0 } = {}) {
  let query = supabase.from('loan_applications').select('*, customers(id, profile_id)', { count: 'exact' });
  if (status)    query = query.eq('status', status);
  if (stage)     query = query.eq('current_stage', stage);
  if (dealerId)  query = query.eq('dealer_id', dealerId);
  if (staffId)   query = query.eq('staff_id', staffId);
  if (customerId) query = query.eq('customer_id', customerId);
  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  const { data, count, error } = await query;
  if (error) throw error;
  return { data, count };
}

async function addStageEntry({ loanApplicationId, stage, enteredByProfileId, outcome, remarks, data: stageData, newStatus }) {
  const { data: entry, error: entryError } = await supabase
    .from('loan_stage_entries')
    .insert({ loan_application_id: loanApplicationId, stage, entered_by_profile_id: enteredByProfileId, outcome, remarks, data: stageData || {} })
    .select()
    .single();
  if (entryError) throw entryError;

  // Update the loan's current_stage and status
  const update = { current_stage: stage };
  if (newStatus) update.status = newStatus;
  if (newStatus === 'approved') update.approved_at = new Date().toISOString();
  if (newStatus === 'rejected') update.rejected_at = new Date().toISOString();
  if (newStatus === 'cancelled') update.cancelled_at = new Date().toISOString();

  const { error: updateError } = await supabase.from('loan_applications').update(update).eq('id', loanApplicationId);
  if (updateError) throw updateError;

  return entry;
}

async function submitToLender({ loanApplicationId, lenderId, adminProfileId }) {
  const { data, error } = await supabase
    .from('loan_applications')
    .update({ submitted_lender_id: lenderId, status: 'in_progress', updated_at: new Date().toISOString() })
    .eq('id', loanApplicationId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function disburseLoan({ loanApplicationId, adminProfileId, disbursedAmount, remarks, stageData, ninetyDayDays }) {
  const { data, error } = await supabase.rpc('fn_disburse_loan', {
    p_admin_profile_id: adminProfileId,
    p_loan_id:          loanApplicationId,
    p_disbursed_amount: disbursedAmount,
    p_remarks:          remarks || '',
    p_stage_data:       stageData || {},
    p_ninety_day_days:  ninetyDayDays,
  });
  if (error) throw new Error(error.message);
  return data;
}

async function reApproveLoan({ loanApplicationId, adminProfileId, remarks }) {
  const { error } = await supabase.rpc('fn_re_approve_loan', {
    p_admin_profile_id: adminProfileId,
    p_loan_id:          loanApplicationId,
    p_remarks:          remarks || '',
  });
  if (error) throw new Error(error.message);
  return { message: 'Re-approved successfully' };
}

async function getStageEntries(loanApplicationId) {
  const { data, error } = await supabase
    .from('loan_stage_entries')
    .select('*, profiles(full_name, role)')
    .eq('loan_application_id', loanApplicationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

async function getSetting(key) {
  const { data } = await supabase.from('settings').select('value').eq('key', key).single();
  return data?.value;
}

module.exports = { createApplication, getApplication, listApplications, addStageEntry, submitToLender, disburseLoan, reApproveLoan, getStageEntries, getSetting };
