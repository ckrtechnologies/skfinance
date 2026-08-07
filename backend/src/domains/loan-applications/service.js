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
    
    if (data.documents && data.documents.length > 0) {
      const { CDN_BASE_URL } = require('../../config/secrets');
      data.documents.forEach(doc => {
        if (doc.cdn_path) {
          doc.cdn_url = `${CDN_BASE_URL}/${doc.cdn_path}`;
        }
      });
    }

    // Fetch or run live multi-lender eligibility evaluation for all active NBFCs
    try {
      const { orchestrate } = require('../eligibility-engine/orchestrator');
      const applicantInput = {
        age: data.applicant_details?.personal?.age || 35,
        customerType: data.applicant_details?.employment?.customer_type || 'salaried',
        cibilScore: data.applicant_details?.cibil_score || 750,
        addressType: data.applicant_details?.personal?.address_type || 'owned',
        productType: data.product_type || 'new_car',
        requestedAmount: data.requested_amount || 500000,
        coApplicantRelation: data.applicant_details?.co_applicant?.relation || null,
        coApplicantMaritalStatus: data.applicant_details?.co_applicant?.marital_status || null,
      };
      data.evaluations = await orchestrate(applicantInput, { stage: 'pre_check' });
    } catch (err) {
      console.error('Failed to run orchestrate evaluation in getApplication:', err);
      data.evaluations = [];
    }
  }
  return data;
}

async function listApplications({ status, stage, dealerId, staffId, customerId, startDate, endDate, limit = 20, offset = 0 } = {}) {
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
  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

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

  // Normalize stage value for DB ENUM compatibility ('cibil', 'bank', 'valuation', 'fi', 'approval', 'disbursement')
  let dbStage = stage || 'cibil';
  if (dbStage === 'pre_check') dbStage = 'cibil';
  if (dbStage === 'document_verification') dbStage = 'bank';
  if (dbStage === 'sanction') dbStage = 'approval';

  let mergedData = stageData || {};
  if (dbOutcome === 'rework') {
    const crypto = require('crypto');
    mergedData = { ...mergedData, query_id: crypto.randomUUID(), resolved: false };
  }

  // Block advancement if there are unresolved queries
  if (dbOutcome === 'pass') {
    const { data: unresolvedQueries } = await supabase.from('loan_stage_entries')
      .select('id')
      .eq('loan_application_id', loanApplicationId)
      .eq('outcome', 'rework')
      .eq('data->>resolved', 'false');
    
    if (unresolvedQueries && unresolvedQueries.length > 0) {
      throw new Error('Cannot advance stage: There are unresolved clarification queries.');
    }
  }

  const { data: entry, error: entryError } = await supabase
    .from('loan_stage_entries')
    .insert({
      loan_application_id: loanApplicationId,
      stage: dbStage,
      entered_by_profile_id: profileId,
      outcome: dbOutcome,
      remarks: remarks || '',
      data: mergedData
    })
    .select()
    .single();

  if (entryError) console.error('Stage entry insert error:', entryError);

  // Update loan application's current_stage and status
  let nextStage = dbStage;
  if (dbOutcome === 'pass') {
    const stageFlow = ['cibil', 'bank', 'valuation', 'fi', 'approval', 'disbursement'];
    const idx = stageFlow.indexOf(dbStage);
    if (idx !== -1 && idx < stageFlow.length - 1) {
      nextStage = stageFlow[idx + 1];
    }
  }

  const update = { current_stage: nextStage, updated_at: new Date().toISOString() };
  if (newStatus) update.status = newStatus;
  if (newStatus === 'approved') update.approved_at = new Date().toISOString();
  if (newStatus === 'rejected') update.rejected_at = new Date().toISOString();
  if (newStatus === 'cancelled') update.cancelled_at = new Date().toISOString();
  if (newStatus === 'disbursed') update.disbursed_at = new Date().toISOString();

  if (mergedData.approved_amount) {
    update.approved_amount = parseFloat(mergedData.approved_amount);
  }
  if (mergedData.lender_name) {
    const { data: lenderData } = await supabase.from('lenders').select('id').eq('name', mergedData.lender_name).maybeSingle();
    if (lenderData) update.submitted_lender_id = lenderData.id;
  }

  const { error: updateError } = await supabase.from('loan_applications').update(update).eq('id', loanApplicationId);
  if (updateError) console.error('Loan application stage update error:', updateError);

  if (newStatus === 'approved') {
    const { generateLoanAgreement } = require('./pdfService');
    generateLoanAgreement(loanApplicationId).catch(err => {
      console.error('Failed to generate Loan Agreement PDF:', err);
    });
  }

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

async function resubmitClarification({ loanApplicationId, dealerProfileId, notes, queryId, documentIds }) {
  // Get application to check stage
  const app = await getApplication(loanApplicationId);

  // Insert stage entry acknowledging resubmission
  const entryData = {};
  if (queryId) entryData.response_to_query_id = queryId;
  if (documentIds && documentIds.length > 0) entryData.document_ids = documentIds;

  const { error: insertError } = await supabase.from('loan_stage_entries').insert({
    loan_application_id: loanApplicationId,
    stage: app.current_stage || 'cibil',
    entered_by_profile_id: dealerProfileId,
    outcome: 'pending',
    remarks: notes || 'Dealer submitted clarification documents.',
    data: { ...entryData, is_clarification_response: true }
  });

  if (insertError) {
    console.error('Failed to insert clarification response:', insertError);
    throw new Error('Failed to record clarification response: ' + insertError.message);
  }

  // If a specific query is being answered, we could find the old entry and mark it resolved.
  // But for an append-only log, it's easier to just do it via UI matching. However, let's try to update it if queryId exists.
  if (queryId) {
    const { data: queries } = await supabase.from('loan_stage_entries')
      .select('id, data')
      .eq('loan_application_id', loanApplicationId)
      .eq('outcome', 'rework');
    const targetQuery = queries?.find(q => q.data?.query_id === queryId);
    if (targetQuery) {
      const updatedData = { ...(targetQuery.data || {}), resolved: true };
      await supabase.from('loan_stage_entries').update({ data: updatedData }).eq('id', targetQuery.id);
    }
  }

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
