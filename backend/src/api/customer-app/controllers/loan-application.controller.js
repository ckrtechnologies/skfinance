'use strict';
const loanService = require('../../../domains/loan-applications/service');
const { ok, fail } = require('../../../shared/utils/response');
const supabase = require('../../../config/database');

// Public-safe projection — strips internal fields from customer view
function stripInternal(app) {
  const { internal_notes, ...safe } = app;
  return safe;
}

async function create(req, res, next) {
  try {
    const { product_type, vehicle_details, requested_amount } = req.body;
    if (!product_type || !requested_amount) return fail(res, 'VALIDATION_ERROR', 'product_type and requested_amount are required', 422);

    // Find or create customer row for this profile
    const { data: customer } = await supabase.from('customers').select('id').eq('profile_id', req.user.profile.id).maybeSingle();
    if (!customer) return fail(res, 'VALIDATION_ERROR', 'Customer profile incomplete. Please complete your profile first.', 422);

    const app = await loanService.createApplication({
      customerId: customer.id,
      createdByProfileId: req.user.profile.id,
      productType: product_type,
      vehicleDetails: vehicle_details,
      requestedAmount: requested_amount,
    });
    return ok(res, { application: stripInternal(app) }, 201);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const app = await loanService.updateDraft(req.params.id, req.body);
    return ok(res, { application: stripInternal(app) });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return fail(res, 'NOT_FOUND', err.message, 404);
    if (err.code === 'VALIDATION_ERROR') return fail(res, 'VALIDATION_ERROR', err.message, 409);
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const { data: customer } = await supabase.from('customers').select('id').eq('profile_id', req.user.profile.id).maybeSingle();
    if (!customer) return ok(res, { items: [], total: 0, page: 1, limit: 20 });

    const result = await loanService.listApplications(
      { customer_id: customer.id },
      { page: parseInt(req.query.page ?? 1), limit: parseInt(req.query.limit ?? 20) }
    );
    return ok(res, { ...result, items: result.items.map(stripInternal) });
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const app = await loanService.getApplication(req.params.id, { withDetails: true });
    return ok(res, { application: stripInternal(app) });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return fail(res, 'NOT_FOUND', err.message, 404);
    next(err);
  }
}

async function submit(req, res, next) {
  try {
    const app = await loanService.submitApplication(req.params.id, req.body.submitted_lender_id);
    return ok(res, { application: stripInternal(app) });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return fail(res, 'NOT_FOUND', err.message, 404);
    if (err.code === 'VALIDATION_ERROR') return fail(res, 'VALIDATION_ERROR', err.message, 409);
    next(err);
  }
}

module.exports = { create, update, list, getOne, submit };
