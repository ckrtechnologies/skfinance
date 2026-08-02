'use strict';
const supabase = require('../../config/database');

const APPLICATION_FIELDS = `
  id, application_no, customer_id, created_by_profile_id, dealer_id, staff_id,
  product_type, vehicle_details, requested_amount, approved_amount, disbursed_amount,
  submitted_lender_id, current_stage, status, approved_at, disbursed_at,
  rejected_at, cancelled_at, blocked_90d_at, internal_notes, created_at, updated_at
`;

async function create(payload) {
  const { data, error } = await supabase.from('loan_applications').insert(payload).select(APPLICATION_FIELDS).single();
  if (error) throw error;
  return data;
}

async function findById(id) {
  const { data, error } = await supabase.from('loan_applications').select(APPLICATION_FIELDS).eq('id', id).single();
  if (error) throw error;
  return data;
}

async function findByIdWithDetails(id) {
  const { data, error } = await supabase
    .from('loan_applications')
    .select(`
      ${APPLICATION_FIELDS},
      customers(*, profiles(full_name, phone)),
      dealers(dealer_code, business_name, profiles(full_name, phone)),
      staff(staff_code, profiles(full_name)),
      lenders(name, code),
      loan_stage_entries(* order created_at asc),
      eligibility_evaluations(* order evaluated_at desc),
      documents(*)
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

async function findMany({ filters = {}, page = 1, limit = 20 } = {}) {
  let q = supabase.from('loan_applications').select(APPLICATION_FIELDS, { count: 'exact' });

  if (filters.status) q = q.eq('status', filters.status);
  if (filters.current_stage) q = q.eq('current_stage', filters.current_stage);
  if (filters.dealer_id) q = q.eq('dealer_id', filters.dealer_id);
  if (filters.staff_id) q = q.eq('staff_id', filters.staff_id);
  if (filters.customer_id) q = q.eq('customer_id', filters.customer_id);
  if (filters.product_type) q = q.eq('product_type', filters.product_type);

  const from = (page - 1) * limit;
  q = q.order('created_at', { ascending: false }).range(from, from + limit - 1);

  const { data, count, error } = await q;
  if (error) throw error;
  return { items: data, total: count, page, limit };
}

async function update(id, payload) {
  const { data, error } = await supabase.from('loan_applications').update(payload).eq('id', id).select(APPLICATION_FIELDS).single();
  if (error) throw error;
  return data;
}

async function insertStageEntry(entry) {
  const { data, error } = await supabase.from('loan_stage_entries').insert(entry).select().single();
  if (error) throw error;
  return data;
}

async function findStageEntries(loanApplicationId) {
  const { data, error } = await supabase
    .from('loan_stage_entries')
    .select('*, profiles(full_name, role)')
    .eq('loan_application_id', loanApplicationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

module.exports = { create, findById, findByIdWithDetails, findMany, update, insertStageEntry, findStageEntries };
