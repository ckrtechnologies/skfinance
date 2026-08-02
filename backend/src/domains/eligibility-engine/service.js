'use strict';
const repo = require('./repository');
const evaluator = require('./rule-evaluator');

/**
 * evaluate — core eligibility engine.
 * Called for both 'pre_check' and 'full' stages.
 *
 * @param {object} input
 *   Pre-check fields: age, cibil_score, customer_type, address_type, requested_amount,
 *                     product_type, co_applicant_relation?
 *   Full-check adds:  loan_application_id (to look up uploaded docs)
 * @param {{ stage: 'pre_check'|'full', loanApplicationId?: string }} options
 * @returns {Promise<Array>} per-lender verdict array, sorted by lender priority
 */
async function evaluate(input, { stage, loanApplicationId } = {}) {
  // 1. DB pre-filter (amount + age bounds, active policies only)
  const policies = await repo.findActivePoliciesPrefilter(input);

  // 2. Fetch uploaded docs for full evaluation
  let uploadedDocTypes = [];
  if (stage === 'full' && loanApplicationId) {
    uploadedDocTypes = await repo.getUploadedDocTypes(loanApplicationId);
  }

  // 3. Build context for trigger evaluation
  const context = {
    applicant: {
      address_type: input.address_type,
      customer_type: input.customer_type,
    },
    co_applicant: input.co_applicant_relation ? { relation: input.co_applicant_relation } : undefined,
  };

  const results = [];

  for (const policy of policies) {
    // 4. Evaluate hard numeric rules
    const failedRules = evaluator.evaluateHardRules(policy, input);

    // 5. Evaluate conditional rules (always, even in pre_check, to surface requirements early)
    const { additionalRequires, guarantorDocs, excludedDocs } =
      evaluator.evaluateConditionalRules(policy.conditional_rules, context);

    // 6. Document completeness (full stage only)
    let missingItems = [];
    if (stage === 'full') {
      missingItems = evaluator.evaluateMissingDocuments(
        policy.policy_documents,
        uploadedDocTypes,
        excludedDocs,
        additionalRequires
      );
    }

    // 7. Determine result
    let result;
    if (failedRules.length > 0) {
      result = 'not_eligible';
    } else if (missingItems.length > 0) {
      result = 'incomplete';
    } else {
      result = 'eligible';
    }

    // 8. Append evaluation row
    let evalRow = null;
    if (loanApplicationId) {
      evalRow = await repo.insertEvaluation({
        loan_application_id: loanApplicationId,
        lender_policy_id: policy.id,
        stage,
        result,
        failed_rules: failedRules,
        missing_items: missingItems,
      });
    }

    results.push({
      lender_id: policy.lender_id,
      lender_name: policy.lenders?.name,
      lender_code: policy.lenders?.code,
      lender_policy_id: policy.id,
      product_type: policy.product_type,
      version: policy.version,
      result,
      failed_rules: failedRules,
      missing_items: missingItems,
      additional_requirements: additionalRequires,
      guarantor_docs_required: guarantorDocs,
      loan_range: { min: policy.min_loan_amount, max: policy.max_loan_amount },
      rank: policy.lenders?.priority ?? 99,
      evaluation_id: evalRow?.id,
    });
  }

  // 9. Sort: eligible first (by priority), then incomplete, then not_eligible
  const order = { eligible: 0, incomplete: 1, not_eligible: 2 };
  results.sort((a, b) => {
    if (order[a.result] !== order[b.result]) return order[a.result] - order[b.result];
    return a.rank - b.rank;
  });

  return results;
}

module.exports = { evaluate };
