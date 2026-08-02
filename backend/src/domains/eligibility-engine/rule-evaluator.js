'use strict';
/**
 * rule-evaluator.js
 * The SOLE interpreter of lender_policies.conditional_rules jsonb.
 * No other file in the codebase evaluates lender policy rules.
 * Shape reference: SCHEMA.md §2 (lenders_policies section).
 *
 * conditional_rules array shape:
 * [
 *   {
 *     "trigger": "<expression>",           // e.g. "applicant.address_type == 'rental'"
 *     "requires": ["doc_key", ...],        // additional documents/requirements
 *     "guarantor_docs": ["doc_key", ...],  // docs required from guarantor party
 *     "excluded_docs": ["doc_key", ...],   // docs NOT required when this triggers
 *     "min_land_area_hectares": 0.5        // agriculture-specific rule (optional)
 *   }
 * ]
 *
 * ownership_proof_rules array shape:
 * [
 *   { "if_address_type": "owned", "required_docs": ["doc_key", ...] },
 *   { "if_address_type": "rental", "required_docs": ["doc_key", ...] }
 * ]
 */

/**
 * evaluateTrigger — evaluates a trigger expression string against the profile.
 * Supported expressions (extend as new rule types are added by admin):
 *   "applicant.address_type == 'rental'"
 *   "applicant.customer_type == 'agriculture'"
 *   "applicant.address_type == 'owned'"
 *
 * @param {string} trigger
 * @param {{ applicant: object, co_applicant?: object }} context
 * @returns {boolean}
 */
function evaluateTrigger(trigger, context) {
  // Simple key == value parser — handles "party.field == 'value'"
  const eqMatch = trigger.match(/^(\w+)\.(\w+)\s*==\s*'([^']+)'$/);
  if (eqMatch) {
    const [, party, field, expected] = eqMatch;
    return context[party]?.[field] === expected;
  }

  // Add new trigger patterns here as new lender rules are added
  console.warn(`[rule-evaluator] Unknown trigger expression: "${trigger}" — evaluates to false`);
  return false;
}

/**
 * evaluateConditionalRules — runs all conditional_rules against the profile.
 * Returns extra requirements (additional docs, guarantor docs) triggered by the profile.
 *
 * @param {object[]} conditionalRules
 * @param {object} context  { applicant, co_applicant? }
 * @returns {{ additionalRequires: string[], guarantorDocs: string[], excludedDocs: string[] }}
 */
function evaluateConditionalRules(conditionalRules, context) {
  const additionalRequires = [];
  const guarantorDocs = [];
  const excludedDocs = [];

  for (const rule of conditionalRules ?? []) {
    if (evaluateTrigger(rule.trigger, context)) {
      additionalRequires.push(...(rule.requires ?? []));
      guarantorDocs.push(...(rule.guarantor_docs ?? []));
      excludedDocs.push(...(rule.excluded_docs ?? []));
    }
  }

  return { additionalRequires, guarantorDocs, excludedDocs };
}

/**
 * evaluateOwnershipProofRules — picks required ownership docs based on address type.
 * @param {object[]} ownershipProofRules
 * @param {string} addressType  'owned' | 'rental'
 * @returns {string[]} required doc types
 */
function evaluateOwnershipProofRules(ownershipProofRules, addressType) {
  for (const rule of ownershipProofRules ?? []) {
    if (rule.if_address_type === addressType) {
      return rule.required_docs ?? [];
    }
  }
  return [];
}

/**
 * evaluateHardRules — checks numeric/enum eligibility rules against the profile.
 * Returns a list of failed rule objects. Empty list = all pass.
 *
 * @param {object} policy  lender_policies row
 * @param {object} input   { age, cibil_score, customer_type, requested_amount, address_type }
 * @returns {{ rule: string, detail: string }[]} failedRules
 */
function evaluateHardRules(policy, input) {
  const failed = [];

  // Age
  if (input.age !== undefined) {
    if (input.age < policy.min_age) {
      failed.push({ rule: 'min_age', detail: `Age ${input.age} below minimum ${policy.min_age}` });
    }
    if (input.age > policy.max_age) {
      failed.push({ rule: 'max_age', detail: `Age ${input.age} above maximum ${policy.max_age}` });
    }
  }

  // CIBIL
  if (input.cibil_score !== undefined && policy.min_cibil !== null) {
    if (input.cibil_score === -1 && !policy.cibil_negative_accepted) {
      failed.push({ rule: 'cibil_negative', detail: 'NTC / -1 CIBIL score not accepted by this lender' });
    } else if (input.cibil_score !== -1 && input.cibil_score < policy.min_cibil) {
      failed.push({
        rule: 'min_cibil',
        detail: `CIBIL ${input.cibil_score} below minimum ${policy.min_cibil}`,
      });
    }
  }

  // Loan amount
  if (input.requested_amount !== undefined) {
    if (input.requested_amount < policy.min_loan_amount) {
      failed.push({
        rule: 'min_loan_amount',
        detail: `Requested ₹${input.requested_amount} below minimum ₹${policy.min_loan_amount}`,
      });
    }
    if (input.requested_amount > policy.max_loan_amount) {
      failed.push({
        rule: 'max_loan_amount',
        detail: `Requested ₹${input.requested_amount} above maximum ₹${policy.max_loan_amount}`,
      });
    }
  }

  // Customer type
  if (
    input.customer_type &&
    policy.customer_types?.length &&
    !policy.customer_types.includes(input.customer_type)
  ) {
    failed.push({
      rule: 'customer_type',
      detail: `Customer type "${input.customer_type}" not accepted. Accepted: ${policy.customer_types.join(', ')}`,
    });
  }

  return failed;
}

/**
 * evaluateMissingDocuments — checks which mandatory documents are not yet uploaded.
 * Only runs in 'full' stage evaluation.
 *
 * @param {object[]} policyDocs      policy_documents rows
 * @param {string[]} uploadedDocTypes doc_type values already uploaded
 * @param {string[]} excludedDocs    docs excluded by conditional rules
 * @param {string[]} extraRequired   additional docs required by triggered rules
 * @returns {string[]} missing doc types
 */
function evaluateMissingDocuments(policyDocs, uploadedDocTypes, excludedDocs, extraRequired) {
  const uploaded = new Set(uploadedDocTypes);
  const excluded = new Set(excludedDocs);
  const missing = [];

  // Check mandatory policy docs
  for (const doc of policyDocs ?? []) {
    if (excluded.has(doc.doc_type)) continue;
    if (!doc.is_mandatory) continue;
    // Group logic: at least min_required_in_group from same selection_group
    // Handled separately below — skip individual check for grouped docs
    if (doc.selection_group) continue;
    if (!uploaded.has(doc.doc_type)) {
      missing.push(`${doc.party}:${doc.doc_type}`);
    }
  }

  // Group checks
  const groups = {};
  for (const doc of policyDocs ?? []) {
    if (!doc.selection_group) continue;
    if (excluded.has(doc.doc_type)) continue;
    const key = `${doc.party}:${doc.selection_group}`;
    if (!groups[key]) groups[key] = { required: doc.min_required_in_group ?? 1, uploaded: 0 };
    if (uploaded.has(doc.doc_type)) groups[key].uploaded++;
  }
  for (const [groupKey, { required, uploaded: cnt }] of Object.entries(groups)) {
    if (cnt < required) {
      missing.push(`${groupKey} (need ${required}, have ${cnt})`);
    }
  }

  // Extra required from conditional rules
  for (const docKey of extraRequired) {
    if (!uploaded.has(docKey) && !excluded.has(docKey)) {
      missing.push(`conditional:${docKey}`);
    }
  }

  return missing;
}

module.exports = {
  evaluateHardRules,
  evaluateConditionalRules,
  evaluateOwnershipProofRules,
  evaluateMissingDocuments,
};
