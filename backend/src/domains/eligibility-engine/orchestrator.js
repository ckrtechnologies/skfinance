'use strict';
const repo     = require('./repository');
const registry = require('../lenders/registry');

/**
 * orchestrate — calls every active lender module, collects results, ranks by priority.
 *
 * The orchestrator is the ONLY caller of any lender module's evaluate().
 * No controller, no other domain should call a lender module directly.
 *
 * @param {object} applicantInput  — passed as-is to each lender module's evaluate()
 * @param {{ stage: 'pre_check'|'full', loanApplicationId?: string }} options
 * @returns {Promise<Array>} per-lender verdict list, sorted: eligible → incomplete → not_eligible
 */
async function orchestrate(applicantInput, { stage, loanApplicationId } = {}) {
  // 1. Fetch active lenders from DB (ordered by priority)
  const activeLenders = await repo.getActiveLenders();

  // 2. If full stage, load uploaded document types for this application
  let uploadedDocTypes = [];
  if (stage === 'full' && loanApplicationId) {
    uploadedDocTypes = await repo.getUploadedDocTypes(loanApplicationId);
  }

  const results = [];

  for (const lender of activeLenders) {
    let mod;
    try {
      mod = registry.getModule(lender.code);
    } catch (err) {
      // Log and skip lenders with no module (e.g. inactive placeholders somehow activated)
      console.warn(`[orchestrator] Skipping lender '${lender.code}': ${err.message}`);
      continue;
    }

    // 3. Call pure evaluate() — passes uploaded docs for full-stage document check
    const verdict = mod.evaluate({ ...applicantInput, uploadedDocTypes });

    // 4. Persist evaluation row (append-only) if we have a loan application to tie it to
    let evalId = null;
    if (loanApplicationId) {
      const row = await repo.insertEvaluation({
        loan_application_id: loanApplicationId,
        lender_code:         lender.code,
        rules_version:       mod.RULES_VERSION,
        stage,
        result:              verdict.result,
        failed_rules:        verdict.failed_rules,
        missing_items:       verdict.missing_items,
      });
      evalId = row?.id;
    }

    results.push({
      lender_id:             lender.id,
      lender_name:           lender.name,
      lender_code:           lender.code,
      rules_version:         mod.RULES_VERSION,
      priority:              lender.priority,
      result:                verdict.result,
      failed_rules:          verdict.failed_rules,
      missing_items:         verdict.missing_items,
      required_documents:    verdict.required_documents || [],
      additional_requirements: verdict.additional_requirements || [],
      evaluation_id:         evalId,
    });
  }

  // 5. Sort: eligible first (by priority), then incomplete, then not_eligible
  const order = { eligible: 0, incomplete: 1, not_eligible: 2 };
  results.sort((a, b) => {
    if (order[a.result] !== order[b.result]) return order[a.result] - order[b.result];
    return a.priority - b.priority;
  });

  return results;
}

module.exports = { orchestrate };
