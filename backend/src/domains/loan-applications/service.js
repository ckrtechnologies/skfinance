'use strict';
const supabase = require('../../config/database');
const repo = require('./repository');
const { generateApplicationNo } = require('../../shared/utils/appNo');
const notifService = require('../notifications/service');
const auditRepo = require('../notifications/auditRepository');

/** Stage order for the pipeline (cibil → bank → valuation → fi → approval → disbursement) */
const STAGE_ORDER = ['cibil', 'bank', 'valuation', 'fi', 'approval', 'disbursement'];

/** Terminal statuses — no further stage entries allowed */
const TERMINAL_STATUSES = ['disbursed', 'rejected', 'cancelled'];

function _assertNotTerminal(app) {
  if (TERMINAL_STATUSES.includes(app.status)) {
    const err = new Error(`Application is in terminal status: ${app.status}`);
    err.code = 'APPLICATION_TERMINAL'; err.status = 409; throw err;
  }
  if (app.status === 'blocked_90d') {
    const err = new Error('Application is blocked due to 90-day window expiry. Re-approval required.');
    err.code = 'LIMIT_BLOCKED_90D'; err.status = 409; throw err;
  }
}

// ─── Create ──────────────────────────────────────────────────────────
async function createApplication({ customerId, createdByProfileId, dealerId, staffId, productType, vehicleDetails, requestedAmount }) {
  const applicationNo = await generateApplicationNo();
  return repo.create({
    application_no: applicationNo,
    customer_id: customerId,
    created_by_profile_id: createdByProfileId,
    dealer_id: dealerId ?? null,
    staff_id: staffId ?? null,
    product_type: productType,
    vehicle_details: vehicleDetails ?? {},
    requested_amount: requestedAmount,
    status: 'draft',
    current_stage: 'cibil',
  });
}

// ─── Update draft ─────────────────────────────────────────────────────
async function updateDraft(id, payload) {
  const app = await repo.findById(id);
  if (!app) { const e = new Error('Application not found'); e.code = 'NOT_FOUND'; e.status = 404; throw e; }
  if (app.status !== 'draft') {
    const e = new Error('Only draft applications can be edited'); e.code = 'VALIDATION_ERROR'; e.status = 409; throw e;
  }
  const allowed = ['vehicle_details', 'requested_amount', 'product_type'];
  const updates = {};
  for (const k of allowed) if (payload[k] !== undefined) updates[k] = payload[k];
  return repo.update(id, updates);
}

// ─── Submit (draft → in_progress) ────────────────────────────────────
async function submitApplication(id, submittedLenderId) {
  const app = await repo.findById(id);
  if (!app) { const e = new Error('Application not found'); e.code = 'NOT_FOUND'; e.status = 404; throw e; }
  if (app.status !== 'draft') {
    const e = new Error('Only draft applications can be submitted'); e.code = 'VALIDATION_ERROR'; e.status = 409; throw e;
  }
  return repo.update(id, {
    status: 'in_progress',
    submitted_lender_id: submittedLenderId ?? null,
  });
}

// ─── Get application(s) ──────────────────────────────────────────────
async function getApplication(id, { withDetails = false } = {}) {
  const data = withDetails ? await repo.findByIdWithDetails(id) : await repo.findById(id);
  if (!data) { const e = new Error('Application not found'); e.code = 'NOT_FOUND'; e.status = 404; throw e; }
  return data;
}

async function listApplications(filters, pagination) {
  return repo.findMany({ filters, ...pagination });
}

// ─── Append stage entry ───────────────────────────────────────────────
async function appendStageEntry({ loanApplicationId, stage, enteredByProfileId, outcome, remarks, data: stageData, role }) {
  const app = await repo.findById(loanApplicationId);
  if (!app) { const e = new Error('Application not found'); e.code = 'NOT_FOUND'; e.status = 404; throw e; }

  _assertNotTerminal(app);

  // Validate stage order
  const currentIdx = STAGE_ORDER.indexOf(app.current_stage);
  const targetIdx  = STAGE_ORDER.indexOf(stage);

  if (targetIdx < 0) {
    const e = new Error(`Invalid stage: ${stage}`); e.code = 'VALIDATION_ERROR'; e.status = 422; throw e;
  }

  // Disbursement is admin-only — enforced here as a double check (route guard is primary)
  if (stage === 'disbursement' && role !== 'admin') {
    const e = new Error('Disbursement entries can only be created by admin'); e.code = 'FORBIDDEN'; e.status = 403; throw e;
  }

  // Must be current stage or next stage (can't skip)
  if (targetIdx !== currentIdx && targetIdx !== currentIdx + 1) {
    const e = new Error(
      `Cannot append stage "${stage}" when current stage is "${app.current_stage}". Expected "${STAGE_ORDER[currentIdx]}" or "${STAGE_ORDER[currentIdx + 1] ?? 'n/a'}".`
    );
    e.code = 'WRONG_STAGE'; e.status = 409; throw e;
  }

  const entry = await repo.insertStageEntry({
    loan_application_id: loanApplicationId,
    stage,
    entered_by_profile_id: enteredByProfileId,
    outcome,
    remarks,
    data: stageData ?? {},
  });

  // Advance pipeline state
  const updates = { current_stage: stage };
  if (stage === 'approval' && outcome === 'pass') {
    updates.status = 'approved';
    updates.approved_at = new Date().toISOString();
    updates.approved_amount = stageData?.approved_amount ?? null;
  } else if (outcome === 'fail') {
    updates.status = 'in_progress'; // stays in progress — staff will correct and re-enter
  }
  await repo.update(loanApplicationId, updates);

  // Audit
  await auditRepo.insert({
    actor_profile_id: enteredByProfileId,
    action: 'stage_entry_created',
    entity: 'loan_stage_entries',
    entity_id: entry.id,
    detail: { loan_application_id: loanApplicationId, stage, outcome },
  });

  return entry;
}

// ─── Disburse (admin only — via DB function) ─────────────────────────
async function disburseApplication({ loanApplicationId, adminProfileId, disbursedAmount, remarks, stageData }) {
  // Read 90-day window from settings
  const { data: setting } = await supabase
    .from('settings').select('value').eq('key', 'ninety_day_window').single();
  const ninetyDays = setting?.value?.days ?? 90;

  // Call the atomic DB function
  const { data: result, error } = await supabase.rpc('fn_disburse_loan', {
    p_admin_profile_id: adminProfileId,
    p_loan_id: loanApplicationId,
    p_disbursed_amount: disbursedAmount,
    p_remarks: remarks ?? '',
    p_stage_data: stageData ?? {},
    p_ninety_day_days: ninetyDays,
  });

  if (error) {
    // Map DB exception messages to API error codes
    const msg = error.message ?? '';
    if (msg.includes('NOT_FOUND')) { const e = new Error(msg); e.code = 'NOT_FOUND'; e.status = 404; throw e; }
    if (msg.includes('APPLICATION_TERMINAL')) { const e = new Error(msg); e.code = 'APPLICATION_TERMINAL'; e.status = 409; throw e; }
    if (msg.includes('LIMIT_BLOCKED_90D')) { const e = new Error(msg); e.code = 'LIMIT_BLOCKED_90D'; e.status = 409; throw e; }
    if (msg.includes('WRONG_STAGE')) { const e = new Error(msg); e.code = 'WRONG_STAGE'; e.status = 409; throw e; }
    throw error;
  }

  // Create notifications (after atomic commit)
  const promises = [];
  if (result.dealer_id) {
    promises.push(notifService.createForDealer(result.dealer_id, {
      title: 'Loan Disbursed',
      body: `Loan has been disbursed. Commission of ₹${result.commission_amount} has been credited to your wallet.`,
      link_type: 'loan_application', link_id: loanApplicationId,
    }));
  }
  if (result.staff_id) {
    promises.push(notifService.createForStaff(result.staff_id, {
      title: 'Loan Disbursed',
      body: 'A loan file you handled has been disbursed.',
      link_type: 'loan_application', link_id: loanApplicationId,
    }));
  }
  await Promise.allSettled(promises);

  // Audit
  await auditRepo.insert({
    actor_profile_id: adminProfileId,
    action: 'loan_disbursed',
    entity: 'loan_applications',
    entity_id: loanApplicationId,
    detail: { disbursed_amount: disbursedAmount, commission_id: result.commission_id },
  });

  return result;
}

// ─── Re-approve (admin only) ──────────────────────────────────────────
async function reApproveApplication({ loanApplicationId, adminProfileId, remarks }) {
  const { error } = await supabase.rpc('fn_re_approve_loan', {
    p_admin_profile_id: adminProfileId,
    p_loan_id: loanApplicationId,
    p_remarks: remarks ?? '',
  });
  if (error) {
    const msg = error.message ?? '';
    if (msg.includes('NOT_FOUND')) { const e = new Error(msg); e.code = 'NOT_FOUND'; e.status = 404; throw e; }
    if (msg.includes('APPLICATION_TERMINAL')) { const e = new Error(msg); e.code = 'APPLICATION_TERMINAL'; e.status = 409; throw e; }
    throw error;
  }

  await auditRepo.insert({
    actor_profile_id: adminProfileId,
    action: 're_approval',
    entity: 'loan_applications',
    entity_id: loanApplicationId,
    detail: { remarks },
  });

  return repo.findById(loanApplicationId);
}

module.exports = {
  createApplication, updateDraft, submitApplication,
  getApplication, listApplications,
  appendStageEntry, disburseApplication, reApproveApplication,
};
