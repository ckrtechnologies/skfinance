'use strict';
const supabase = require('../../../config/database');
const eligEngine = require('../../../domains/eligibility-engine/service');
const loanService = require('../../../domains/loan-applications/service');
const { ok, fail } = require('../../../shared/utils/response');

/** POST /dealer/leads — create customer + run pre-check */
async function createLead(req, res, next) {
  try {
    const { customer, loan } = req.body;
    if (!customer || !loan) return fail(res, 'VALIDATION_ERROR', 'customer and loan objects are required', 422);

    const { data: dealer } = await supabase.from('dealers').select('id').eq('profile_id', req.user.profile.id).single();

    // Create or find customer profile (phone uniqueness)
    let customerProfile;
    const { data: existingProfile } = await supabase.from('profiles').select('id').eq('phone', customer.phone).eq('role', 'customer').maybeSingle();

    if (existingProfile) {
      const { data: existingCustomer } = await supabase.from('customers').select('*').eq('profile_id', existingProfile.id).single();
      customerProfile = existingCustomer;
    } else {
      // Create Supabase auth user
      const { data: authUser } = await supabase.auth.admin.createUser({ phone: customer.phone, phone_confirm: true });
      const { data: profile } = await supabase.from('profiles').insert({ auth_user_id: authUser.user.id, role: 'customer', full_name: customer.full_name, phone: customer.phone }).select().single();
      const { data: newCustomer } = await supabase.from('customers').insert({
        profile_id: profile.id,
        dob: customer.dob,
        customer_type: customer.customer_type,
        cibil_score: customer.cibil_score,
        address_type: customer.address_type,
      }).select().single();
      customerProfile = newCustomer;
    }

    // Run pre-check
    const verdicts = await eligEngine.evaluate({
      age: loan.age ?? (customer.dob ? Math.floor((Date.now() - new Date(customer.dob)) / 31557600000) : 30),
      cibil_score: customer.cibil_score ?? 0,
      customer_type: customer.customer_type,
      address_type: customer.address_type,
      requested_amount: loan.requested_amount,
      product_type: loan.product_type,
    }, { stage: 'pre_check' });

    return ok(res, { customer: customerProfile, verdicts }, 201);
  } catch (err) { next(err); }
}

module.exports = { createLead };
