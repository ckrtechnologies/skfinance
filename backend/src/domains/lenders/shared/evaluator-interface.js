'use strict';
/**
 * evaluator-interface.js — documents the fixed contract every lender module must implement.
 * This file is documentation only — it is NOT imported by the orchestrator.
 *
 * Every file under domains/lenders/<code>/index.js must export exactly:
 *
 * module.exports = {
 *   RULES_VERSION: string,      // bump on every rule change (e.g. 'sk-v1.0')
 *
 *   evaluate(applicantInput) → {
 *     result:             'eligible' | 'not_eligible' | 'incomplete',
 *     failed_rules:       string[],   // human-readable reasons for not_eligible
 *     missing_items:      string[],   // human-readable items missing for incomplete
 *     required_documents: object[],   // derived doc checklist for this applicant
 *   },
 *
 *   getRulesSummary() → {
 *     minAge, maxAge, minCibil, ltvRange,
 *     customerTypes, coApplicantRule,
 *     documentLists, guarantorConditions,
 *     rulesVersion,
 *   },
 * }
 *
 * Rules:
 * - evaluate() must be a PURE FUNCTION — no DB calls, no side effects.
 * - getRulesSummary() must stay in sync with evaluate() (update both in the same PR).
 * - Never import another lender module's internals. Share logic via domains/lenders/shared/.
 * - orchestrator.js is the ONLY caller of any lender module's evaluate().
 */

// This file intentionally exports nothing.
module.exports = {};
