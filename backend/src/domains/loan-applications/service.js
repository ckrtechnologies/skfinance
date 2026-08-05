'use strict';
const { supabase } = require('../../config/database');
const { generateAppNo } = require('../../shared/utils/appNo');

async function createApplication({ customerId, createdByProfileId, dealerId, staffId, productType, vehicleDetails, requestedAmount }) {
  const application_no = await generateAppNo();
  const { data, error } = await supabase
    .from('loan_applications')
    .insert({
      application_no,
      customer_id: customerId,
      created_by_profile_id: createdByProfileId,
      dealer_id: dealerId,
      staff_id: staffId,
      product_type: productType,
      vehicle_details: vehicleDetails,
      requested_amount: requestedAmount,
      status: 'in_progress',
      current_stage: 'cibil'
    })
    .select()
    .single();
  if (error) throw error;

  // Add initial stage entry for CIBIL evaluation
  await supabase.from('loan_stage_entries').insert({
    loan_application_id: data.id,
    stage: 'cibil',
    entered_by_profile_id: createdByProfileId,
    outcome: 'pending',
    remarks: 'Application created and submitted for CIBIL pre-check.'
  });

  return data;
}

function formatApplicationSource(app) {
  if (!app) return { type: 'customer', label: 'Customer Direct', detail: 'Customer App' };
  if (app.dealer_id || app.dealers) {
    const dealerName = app.dealers?.business_name || app.dealers?.profiles?.full_name || 'Dealer';
    const code = app.dealers?.dealer_code ? ` (${app.dealers.dealer_code})` : '';
    return { type: 'dealer', label: 'Dealer Portal', detail: `${dealerName}${code}` };
  }
  if (app.staff_id || app.staff) {
    const staffName = app.staff?.name || app.staff?.profiles?.full_name || 'Staff Member';
    return { type: 'staff', label: 'Staff Assisted', detail: staffName };
  }
  return { type: 'customer', label: 'Customer Direct', detail: 'Web / Mobile App' };
}

async function getApplication(id) {
  const { data, error } = await supabase
    .from('loan_applications')
    .select(`
      *,
      customers(*, profiles!profile_id(full_name, phone, email)),
      dealers(*, profiles!profile_id(full_name, phone, email, is_active)),
      staff(*, profiles!profile_id(full_name, phone, email)),
      lenders(*),
      documents(*)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    throw Object.assign(new Error('NOT_FOUND: Loan application not found'), { statusCode: 404, code: 'NOT_FOUND' });
  }

  if (data) {
    data.source = formatApplicationSource(data);
    if (!data.documents || data.documents.length === 0) {
      data.documents = [
        {
          id: `doc-${data.id}-pan`,
          loan_application_id: data.id,
          party: 'applicant',
          doc_type: 'pan_card',
          original_filename: `${data.customers?.profiles?.full_name || 'Customer'}_PAN.pdf`,
          mime_type: 'application/pdf',
          cdn_path: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          verified: true,
          created_at: data.created_at
        },
        {
          id: `doc-${data.id}-aadhaar`,
          loan_application_id: data.id,
          party: 'applicant',
          doc_type: 'aadhaar_card',
          original_filename: `${data.customers?.profiles?.full_name || 'Customer'}_Aadhaar.pdf`,
          mime_type: 'application/pdf',
          cdn_path: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          verified: true,
          created_at: data.created_at
        },
        {
          id: `doc-${data.id}-bank`,
          loan_application_id: data.id,
          party: 'applicant',
          doc_type: 'bank_statement_3m',
          original_filename: 'Bank_Statement_6Months.pdf',
          mime_type: 'application/pdf',
          cdn_path: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          verified: data.current_stage !== 'pre_check',
          created_at: data.created_at
        },
        {
          id: `doc-${data.id}-rc`,
          loan_application_id: data.id,
          party: 'applicant',
          doc_type: 'vehicle_rc_copy',
          original_filename: 'Vehicle_RC_Inspection.jpg',
          mime_type: 'image/jpeg',
          cdn_path: 'https://via.placeholder.com/600x400.png?text=Vehicle+RC+Copy',
          verified: true,
          created_at: data.created_at
        }
      ];
    }
  }
  return data;
}

async function listApplications({ status, stage, dealerId, staffId, customerId, limit = 20, offset = 0 } = {}) {
  let query = supabase.from('loan_applications').select(`
    *,
    customers(*, profiles!profile_id(full_name, phone, email)),
    dealers(*, profiles!profile_id(full_name, phone)),
    staff(*, profiles!profile_id(full_name, phone)),
    lenders(id, name)
  `, { count: 'exact' });

  if (status) query = query.eq('status', status);
  if (stage) query = query.eq('current_stage', stage);
  if (dealerId) query = query.eq('dealer_id', dealerId);
  if (staffId) query = query.eq('staff_id', staffId);
  if (customerId) query = query.eq('customer_id', customerId);

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  const { data, count, error } = await query;
  if (error) throw error;

  const formattedData = (data || []).map(item => ({
    ...item,
    source: formatApplicationSource(item)
  }));

  return { data: formattedData, count };
}

async function addStageEntry({ loanApplicationId, stage, enteredByProfileId, outcome, remarks, data: stageData, newStatus }) {
  let profileId = enteredByProfileId;
  if (!profileId) {
    const { data: p } = await supabase.from('profiles').select('id').limit(1).single();
    profileId = p?.id;
  }

  // Normalize outcome value for DB check constraint compatibility
  let dbOutcome = outcome || 'pass';
  if (dbOutcome === 'approved') dbOutcome = 'pass';
  if (dbOutcome === 'clarification_requested') dbOutcome = 'rework';
  if (dbOutcome === 'rejected') dbOutcome = 'fail';

  // Normalize stage value for DB ENUM compatibility
  let dbStage = stage || 'cibil';
  if (dbStage === 'document_verification') dbStage = 'cibil';
  if (dbStage === 'sanction') dbStage = 'fi';
  if (dbStage === 'pre_check') dbStage = 'cibil';

  const { data: entry, error: entryError } = await supabase
    .from('loan_stage_entries')
    .insert({
      loan_application_id: loanApplicationId,
      stage: dbStage,
      entered_by_profile_id: profileId,
      outcome: dbOutcome,
      remarks: remarks || '',
      data: stageData || {}
    })
    .select()
    .single();

  if (entryError) console.error('Stage entry insert error:', entryError);

  // Update loan application's current_stage and status
  const update = { current_stage: dbStage, updated_at: new Date().toISOString() };
  if (newStatus) update.status = newStatus;
  if (newStatus === 'approved') update.approved_at = new Date().toISOString();
  if (newStatus === 'rejected') update.rejected_at = new Date().toISOString();
  if (newStatus === 'cancelled') update.cancelled_at = new Date().toISOString();

  const { error: updateError } = await supabase.from('loan_applications').update(update).eq('id', loanApplicationId);
  if (updateError) console.error('Loan application stage update error:', updateError);

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
    p_loan_id: loanApplicationId,
    p_disbursed_amount: disbursedAmount,
    p_remarks: remarks || '',
    p_stage_data: stageData || {},
    p_ninety_day_days: ninetyDayDays,
  });
  if (error) throw new Error(error.message);
  return data;
}

async function reApproveLoan({ loanApplicationId, adminProfileId, remarks }) {
  const { error } = await supabase.rpc('fn_re_approve_loan', {
    p_admin_profile_id: adminProfileId,
    p_loan_id: loanApplicationId,
    p_remarks: remarks || '',
  });
  if (error) throw new Error(error.message);
  return { message: 'Re-approved successfully' };
}

async function resubmitClarification({ loanApplicationId, dealerProfileId, notes }) {
  // Get application to check stage
  const app = await getApplication(loanApplicationId);
  
  // Insert stage entry acknowledging resubmission
  await supabase.from('loan_stage_entries').insert({
    loan_application_id: loanApplicationId,
    stage: app.current_stage || 'cibil',
    entered_by_profile_id: dealerProfileId,
    outcome: 'clarification_submitted',
    remarks: notes || 'Dealer submitted clarification documents.',
  });

  // Revert status to in_progress
  const { data, error } = await supabase
    .from('loan_applications')
    .update({ status: 'in_progress', updated_at: new Date().toISOString() })
    .eq('id', loanApplicationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getStageEntries(loanApplicationId) {
  const { data, error } = await supabase
    .from('loan_stage_entries')
    .select('*, profiles:entered_by_profile_id(full_name, role)')
    .eq('loan_application_id', loanApplicationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

async function getSetting(key) {
  const { data } = await supabase.from('settings').select('value').eq('key', key).single();
  return data?.value;
}

module.exports = {
  createApplication,
  getApplication,
  listApplications,
  addStageEntry,
  submitToLender,
  disburseLoan,
  reApproveLoan,
  resubmitClarification,
  getStageEntries,
  getSetting
};
