'use strict';
const { NEW_CAR, USED_CAR } = require('./rules');
const { getRequiredDocuments } = require('./documents');

/**
 * evaluate — ITI Finance eligibility decision logic.
 * PURE FUNCTION — no DB calls, no side effects.
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
    landAreaHectares,     // agriculture-specific field
    uploadedDocTypes = [],
  } = input;

  const rules = productType === 'new_car' ? NEW_CAR : USED_CAR;
  const failed_rules = [];

  // ── Step 1: Product type ────────────────────────────────────────────
  if (!['new_car', 'used_car'].includes(productType)) {
    failed_rules.push(`ITI Finance does not offer loans for product type '${productType}'`);
    return { result: 'not_eligible', failed_rules, missing_items: [], required_documents: [] };
  }

  // ── Step 2: Customer type ───────────────────────────────────────────
  if (!rules.customerTypes.includes(customerType)) {
    failed_rules.push(`Customer type '${customerType}' not accepted by ITI Finance for ${productType}`);
  }

  // ── Step 3: Age ─────────────────────────────────────────────────────
  if (age < rules.minAge) {
    failed_rules.push(`Applicant age ${age} is below ITI Finance minimum of ${rules.minAge}`);
  }
  if (age > rules.maxAge) {
    failed_rules.push(`Applicant age ${age} exceeds ITI Finance maximum of ${rules.maxAge}`);
  }

  // ── Step 4: CIBIL ───────────────────────────────────────────────────
  if (cibilScore === -1) {
    // ITI does not accept NTC or negative CIBIL at all
    failed_rules.push('ITI Finance does not accept NTC / -1 CIBIL score');
  } else if (cibilScore < rules.minCibil) {
    failed_rules.push(`CIBIL score ${cibilScore} is below ITI Finance minimum of ${rules.minCibil}`);
  }

  // ── Step 5: Loan amount ─────────────────────────────────────────────
  if (requestedAmount < rules.minLoanAmount) {
    failed_rules.push(`Requested amount ₹${requestedAmount.toLocaleString('en-IN')} is below ITI Finance minimum of ₹${rules.minLoanAmount.toLocaleString('en-IN')}`);
  }
  if (requestedAmount > rules.maxLoanAmount) {
    failed_rules.push(`Requested amount ₹${requestedAmount.toLocaleString('en-IN')} exceeds ITI Finance maximum of ₹${rules.maxLoanAmount.toLocaleString('en-IN')}`);
  }

  // ── Step 6: Used Car — co-applicant mandatory ───────────────────────
  if (productType === 'used_car' && rules.coApplicantRequired && !coApplicantRelation) {
    failed_rules.push('ITI Finance requires a co-applicant (spouse or parent) for Used Car loans');
  }

  // ── Step 7: Agriculture — land area constraint ──────────────────────
  if (customerType === 'agriculture') {
    const land = Number(landAreaHectares) || 0;
    if (land < NEW_CAR.minLandAreaHectares) {
      failed_rules.push(`Agriculture applicant must have at least ${NEW_CAR.minLandAreaHectares} hectares of land (provided: ${land})`);
    }
  }

  // ── Short-circuit if hard rules fail ───────────────────────────────
  if (failed_rules.length > 0) {
    return { result: 'not_eligible', failed_rules, missing_items: [], required_documents: [] };
  }

  // ── Step 8: Conditional requirements ───────────────────────────────
  const additional_requirements = [];
  if (addressType === 'rental') {
    additional_requirements.push(
      'Hometown field visit required',
      'Hometown ownership documents required',
      'Landlord electricity bill required',
      'Local guarantor required (PAN + Aadhaar + electricity bill or Khatauni)'
    );
  }

  // ── Step 9: Document completeness (full stage) ──────────────────────
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
    if (coApplicantRelation || productType === 'used_car') {
      for (const doc of required_documents.co_applicant) {
        if (!uploadedDocTypes.includes(doc)) {
          missing_items.push(`Co-applicant: ${doc}`);
        }
      }
    }
  }

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
