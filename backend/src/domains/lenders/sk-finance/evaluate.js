'use strict';
const { NEW_CAR, USED_CAR } = require('./rules');
const { getRequiredDocuments } = require('./documents');

/**
 * evaluate — SK Finance eligibility decision logic.
 * PURE FUNCTION — no DB calls, no side effects. Same input → same output.
 *
 * @param {object} input
 *   {
 *     productType:        'new_car' | 'used_car',
 *     age:                number,
 *     cibilScore:         number,       // -1 = NTC
 *     customerType:       'salaried' | 'self_employed',
 *     requestedAmount:    number,
 *     addressType:        'owned' | 'rental',
 *     coApplicantRelation?: string,     // optional
 *     uploadedDocTypes?:  string[],     // for full-check stage only
 *   }
 *
 * @returns {{ result, failed_rules, missing_items, required_documents }}
 */
function evaluate(input) {
  const {
    productType,
    age,
    cibilScore,
    customerType,
    requestedAmount,
    addressType,
    coApplicantRelation,
    uploadedDocTypes = [],
  } = input;

  const rules = productType === 'new_car' ? NEW_CAR : USED_CAR;
  const failed_rules = [];

  // ── Step 1: Product type check ──────────────────────────────────────
  if (!['new_car', 'used_car'].includes(productType)) {
    failed_rules.push(`SK Finance does not offer loans for product type '${productType}'`);
    return { result: 'not_eligible', failed_rules, missing_items: [], required_documents: [] };
  }

  // ── Step 2: Customer type ───────────────────────────────────────────
  if (!rules.customerTypes.includes(customerType)) {
    failed_rules.push(`Customer type '${customerType}' not accepted by SK Finance`);
  }

  // ── Step 3: Age ────────────────────────────────────────────────────
  if (age < rules.minAge) {
    failed_rules.push(`Applicant age ${age} is below SK Finance minimum of ${rules.minAge}`);
  }
  if (age > rules.maxAge) {
    failed_rules.push(`Applicant age ${age} exceeds SK Finance maximum of ${rules.maxAge}`);
  }

  // ── Step 4: CIBIL ──────────────────────────────────────────────────
  if (cibilScore === -1 && !rules.cibilNegativeAccepted) {
    failed_rules.push('SK Finance does not accept NTC / -1 CIBIL score');
  } else if (cibilScore !== -1 && cibilScore < rules.minCibil) {
    failed_rules.push(`CIBIL score ${cibilScore} is below SK Finance minimum of ${rules.minCibil}`);
  }

  // ── Step 5: Loan amount ────────────────────────────────────────────
  if (requestedAmount < rules.minLoanAmount) {
    failed_rules.push(`Requested amount ₹${requestedAmount.toLocaleString('en-IN')} is below SK Finance minimum of ₹${rules.minLoanAmount.toLocaleString('en-IN')}`);
  }
  if (requestedAmount > rules.maxLoanAmount) {
    failed_rules.push(`Requested amount ₹${requestedAmount.toLocaleString('en-IN')} exceeds SK Finance maximum of ₹${rules.maxLoanAmount.toLocaleString('en-IN')}`);
  }

  // ── If hard rules fail, short-circuit ─────────────────────────────
  if (failed_rules.length > 0) {
    return { result: 'not_eligible', failed_rules, missing_items: [], required_documents: [] };
  }

  // ── Step 6: Conditional rule — rental address ──────────────────────
  // Rental applicants require a hometown field visit + guarantor
  const additional_requirements = [];
  if (addressType === 'rental') {
    additional_requirements.push(
      'Hometown field visit required',
      'Hometown ownership documents required',
      'Local guarantor required (PAN + Aadhaar + electricity bill or Khatauni)'
    );
  }

  // ── Step 7: Document completeness check (full stage only) ──────────
  const required_documents = getRequiredDocuments({ productType, customerType, addressType, coApplicantRelation });
  const missing_items = [];

  if (uploadedDocTypes.length > 0) {
    for (const doc of required_documents.applicant) {
      if (!uploadedDocTypes.includes(doc)) {
        missing_items.push(`Applicant: ${doc}`);
      }
    }
    for (const doc of required_documents.guarantor) {
      if (!uploadedDocTypes.includes(doc)) {
        missing_items.push(`Guarantor: ${doc}`);
      }
    }
    if (coApplicantRelation) {
      for (const doc of required_documents.co_applicant) {
        if (!uploadedDocTypes.includes(doc)) {
          missing_items.push(`Co-applicant: ${doc}`);
        }
      }
    }
  }

  // ── Step 8: Determine result ───────────────────────────────────────
  const result = missing_items.length > 0 ? 'incomplete' : 'eligible';

  return {
    result,
    failed_rules,
    missing_items,
    required_documents: [
      ...required_documents.applicant.map(d => ({ party: 'applicant', doc_type: d })),
      ...required_documents.co_applicant.map(d => ({ party: 'co_applicant', doc_type: d })),
      ...required_documents.guarantor.map(d => ({ party: 'guarantor', doc_type: d })),
    ],
    additional_requirements,
  };
}

module.exports = { evaluate };
