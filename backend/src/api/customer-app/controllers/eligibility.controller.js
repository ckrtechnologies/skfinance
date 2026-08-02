'use strict';
const eligEngine = require('../../../domains/eligibility-engine/service');
const { ok, fail } = require('../../../shared/utils/response');
const { z } = require('zod');

const preCheckSchema = z.object({
  age: z.number().int().min(18).max(100),
  cibil_score: z.number().int().min(-1),
  customer_type: z.enum(['salaried', 'self_employed', 'agriculture']),
  address_type: z.enum(['owned', 'rental']),
  requested_amount: z.number().positive(),
  product_type: z.enum(['new_car', 'used_car', 'commercial_vehicle']),
  co_applicant_relation: z.string().optional(),
});

async function preCheck(req, res, next) {
  try {
    const parsed = preCheckSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 'VALIDATION_ERROR', parsed.error.issues[0].message, 422);
    const verdicts = await eligEngine.evaluate(parsed.data, { stage: 'pre_check' });
    return ok(res, { verdicts });
  } catch (err) { next(err); }
}

async function fullEvaluate(req, res, next) {
  try {
    const loanApplicationId = req.params.id;
    // Input comes from the stored application data — merge with any overrides in body
    const verdicts = await eligEngine.evaluate(req.body, { stage: 'full', loanApplicationId });
    return ok(res, { verdicts });
  } catch (err) { next(err); }
}

module.exports = { preCheck, fullEvaluate };
