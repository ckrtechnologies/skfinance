'use strict';
const supabase = require('../../../config/database');
const eligEngine = require('../../../domains/eligibility-engine/service');
const loanService = require('../../../domains/loan-applications/service');
const docService  = require('../../../domains/documents/service');
const { getCdnUrl } = require('../../../shared/utils/cdnStorage');
const { ok, fail } = require('../../../shared/utils/response');

// Shared helpers for dealer/staff loan operations
async function _getDealerOrStaff(profile) {
  if (profile.role === 'dealer') {
    const { data } = await supabase.from('dealers').select('id').eq('profile_id', profile.id).single();
    return { dealerId: data?.id, staffId: null };
  }
  const { data } = await supabase.from('staff').select('id').eq('profile_id', profile.id).single();
  return { dealerId: null, staffId: data?.id };
}

async function create(req, res, next) {
  try {
    const { product_type, vehicle_details, requested_amount, customer_id } = req.body;
    if (!product_type || !requested_amount || !customer_id) {
      return fail(res, 'VALIDATION_ERROR', 'product_type, requested_amount, and customer_id are required', 422);
    }
    const { dealerId, staffId } = await _getDealerOrStaff(req.user.profile);
    const app = await loanService.createApplication({
      customerId: customer_id,
      createdByProfileId: req.user.profile.id,
      dealerId, staffId,
      productType: product_type,
      vehicleDetails: vehicle_details,
      requestedAmount: requested_amount,
    });
    return ok(res, { application: app }, 201);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const app = await loanService.updateDraft(req.params.id, req.body);
    return ok(res, { application: app });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return fail(res, 'NOT_FOUND', err.message, 404);
    next(err);
  }
}

async function evaluate(req, res, next) {
  try {
    const verdicts = await eligEngine.evaluate(req.body, { stage: 'full', loanApplicationId: req.params.id });
    return ok(res, { verdicts });
  } catch (err) { next(err); }
}

async function submit(req, res, next) {
  try {
    const app = await loanService.submitApplication(req.params.id, req.body.submitted_lender_id);
    return ok(res, { application: app });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return fail(res, 'NOT_FOUND', err.message, 404);
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const { dealerId, staffId } = await _getDealerOrStaff(req.user.profile);
    const filters = {};
    if (dealerId) filters.dealer_id = dealerId;
    if (staffId) filters.staff_id = staffId;
    if (req.query.status) filters.status = req.query.status;
    const result = await loanService.listApplications(filters, { page: parseInt(req.query.page ?? 1), limit: parseInt(req.query.limit ?? 20) });
    return ok(res, result);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const app = await loanService.getApplication(req.params.id, { withDetails: true });
    return ok(res, { application: app });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return fail(res, 'NOT_FOUND', err.message, 404);
    next(err);
  }
}

async function uploadDoc(req, res, next) {
  try {
    if (!req.file) return fail(res, 'VALIDATION_ERROR', 'No file uploaded', 422);
    const { party, doc_type } = req.body;
    if (!party || !doc_type) return fail(res, 'VALIDATION_ERROR', 'party and doc_type are required', 422);
    const loanApplicationId = req.params.id;
    const { data: app } = await supabase.from('loan_applications').select('application_no').eq('id', loanApplicationId).single();
    const subDir = `loans/${app?.application_no ?? loanApplicationId}/${party}/${doc_type}`;
    const doc = await docService.saveDocument({
      loanApplicationId, party, docType: doc_type,
      uploadedByProfileId: req.user.profile.id,
      multerFile: req.file, subDir,
    });
    return ok(res, { document: { ...doc, cdn_url: getCdnUrl(doc.cdn_path) } }, 201);
  } catch (err) { next(err); }
}

async function appendStageEntry(req, res, next) {
  try {
    const { stage, outcome, remarks, data: stageData } = req.body;
    if (!stage || !outcome) return fail(res, 'VALIDATION_ERROR', 'stage and outcome are required', 422);
    const entry = await loanService.appendStageEntry({
      loanApplicationId: req.params.id,
      stage, outcome, remarks, data: stageData,
      enteredByProfileId: req.user.profile.id,
      role: req.user.profile.role,
    });
    return ok(res, { stage_entry: entry }, 201);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return fail(res, 'NOT_FOUND', err.message, 404);
    if (err.code === 'WRONG_STAGE') return fail(res, 'WRONG_STAGE', err.message, 409);
    if (err.code === 'APPLICATION_TERMINAL') return fail(res, 'APPLICATION_TERMINAL', err.message, 409);
    if (err.code === 'LIMIT_BLOCKED_90D') return fail(res, 'LIMIT_BLOCKED_90D', err.message, 409);
    if (err.code === 'FORBIDDEN') return fail(res, 'FORBIDDEN', err.message, 403);
    next(err);
  }
}

module.exports = { create, update, evaluate, submit, list, getOne, uploadDoc, appendStageEntry };
