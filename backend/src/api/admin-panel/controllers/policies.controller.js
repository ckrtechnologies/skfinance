'use strict';
const lenderService = require('../../../domains/lenders/service');
const auditRepo = require('../../../domains/notifications/auditRepository');
const { policySchema } = require('../../../domains/lenders/validation');
const { ok, fail } = require('../../../shared/utils/response');

/** GET /admin/lenders/:id/policies */
async function listPolicies(req, res, next) {
  try {
    const { status } = req.query;
    const policies = await lenderService.listPolicies(req.params.id, { status });
    return ok(res, { policies });
  } catch (err) { next(err); }
}

/** POST /admin/lenders/:id/policies */
async function createPolicy(req, res, next) {
  try {
    const body = { ...req.body, lender_id: req.params.id };
    const parsed = policySchema.safeParse(body);
    if (!parsed.success) return fail(res, 'VALIDATION_ERROR', parsed.error.issues[0].message, 422);
    const policy = await lenderService.createPolicy(parsed.data);
    return ok(res, { policy }, 201);
  } catch (err) { next(err); }
}

/** PATCH /admin/policies/:id */
async function updatePolicy(req, res, next) {
  try {
    const policy = await lenderService.updatePolicy(req.params.id, req.body);
    return ok(res, { policy });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return fail(res, 'NOT_FOUND', err.message, 404);
    if (err.code === 'POLICY_NOT_ACTIVE') return fail(res, 'POLICY_NOT_ACTIVE', err.message, 409);
    next(err);
  }
}

/** POST /admin/policies/:id/publish */
async function publishPolicy(req, res, next) {
  try {
    const policy = await lenderService.publishPolicy(req.params.id, req.user.profile.id, auditRepo);
    return ok(res, { policy });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return fail(res, 'NOT_FOUND', err.message, 404);
    if (err.code === 'POLICY_NOT_ACTIVE') return fail(res, 'POLICY_NOT_ACTIVE', err.message, 409);
    next(err);
  }
}

/** GET /admin/policies/:id */
async function getPolicy(req, res, next) {
  try {
    const policy = await lenderService.getPolicy(req.params.id);
    return ok(res, { policy });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return fail(res, 'NOT_FOUND', err.message, 404);
    next(err);
  }
}

/** GET /admin/policies/:id/preview  — human-readable summary */
async function previewPolicy(req, res, next) {
  try {
    const policy = await lenderService.getPolicy(req.params.id);
    // Build a human-readable summary object
    const summary = {
      lender: policy.lenders?.name,
      product: policy.product_type,
      version: policy.version,
      status: policy.status,
      loan_range: `₹${(policy.min_loan_amount / 100000).toFixed(1)}L – ₹${(policy.max_loan_amount / 100000).toFixed(1)}L`,
      age_range: `${policy.min_age}–${policy.max_age} years`,
      cibil: policy.min_cibil
        ? `Min ${policy.min_cibil}${policy.cibil_negative_accepted ? ' (NTC/negative accepted)' : ''}`
        : 'No hard floor',
      customer_types: policy.customer_types,
      co_applicant_required: policy.co_applicant_required,
      documents_required: policy.policy_documents?.filter(d => d.is_mandatory).map(d => `${d.party}: ${d.doc_type}`),
      conditional_rules_count: policy.conditional_rules?.length ?? 0,
    };
    return ok(res, { policy, summary });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return fail(res, 'NOT_FOUND', err.message, 404);
    next(err);
  }
}

module.exports = { listPolicies, createPolicy, updatePolicy, publishPolicy, getPolicy, previewPolicy };
