'use strict';

/**
 * Generic Eligibility Evaluator with Lender-Specific Hardcoded Overrides
 */

const BLOOD_RELATIONS = ['father', 'mother', 'brother', 'sister', 'son', 'daughter', 'husband', 'wife'];

function evaluateRules(rulesJson, input) {
  const {
    productType, age, cibilScore, customerType, requestedAmount, addressType, coApplicantRelation, uploadedDocTypes = []
  } = input;

  const failed_rules = [];
  const additional_requirements = [];
  const missing_items = [];
  const required_stages = [];

  const lenderName = rulesJson.lenderName || 'Unknown Lender';
  const lenderCode = rulesJson.lenderCode || 'unknown';
  const products = rulesJson.products || {};
  const rules = products[productType];

  if (!rules) {
    failed_rules.push(`${lenderName} does not offer loans for product type '${productType}'`);
    return { result: 'not_eligible', failed_rules, missing_items, required_documents: [], additional_requirements, required_stages };
  }

  // 1. Core Parameters (Editable in UI)
  if (rules.customerTypes && !rules.customerTypes.includes(customerType)) {
    failed_rules.push(`Customer type '${customerType}' not accepted by ${lenderName}`);
  }

  if (rules.ageRange) {
    if (age < rules.ageRange.min) failed_rules.push(`Applicant age ${age} is below ${lenderName} minimum of ${rules.ageRange.min}`);
    if (age > rules.ageRange.max) failed_rules.push(`Applicant age ${age} exceeds ${lenderName} maximum of ${rules.ageRange.max}`);
  }

  if (cibilScore === -1 && !rules.cibilNegativeAccepted) {
    failed_rules.push(`${lenderName} does not accept NTC / -1 CIBIL score`);
  } else if (cibilScore !== -1 && rules.minCibil && cibilScore < rules.minCibil) {
    failed_rules.push(`CIBIL score ${cibilScore} is below ${lenderName} minimum of ${rules.minCibil}`);
  }

  if (rules.loanRange) {
    if (requestedAmount < rules.loanRange.min) failed_rules.push(`Requested amount is below ${lenderName} minimum of ₹${rules.loanRange.min}`);
    if (requestedAmount > rules.loanRange.max) failed_rules.push(`Requested amount exceeds ${lenderName} maximum of ₹${rules.loanRange.max}`);
  }

  if (failed_rules.length > 0) {
    return { result: 'not_eligible', failed_rules, missing_items: [], required_documents: [], additional_requirements, required_stages };
  }

  // 2. Base KYC Requirements
  const required_documents = { applicant: ['kyc_pan', 'kyc_aadhaar_or_voter_id'], guarantor: [], co_applicant: [] };

  if (customerType === 'salaried') {
    required_documents.applicant.push('income_bank_statement', 'income_salary_slip');
  } else {
    required_documents.applicant.push('income_bank_statement', 'income_itr');
  }

  // 3. Dynamic JSON-Driven Logic
  // --- Applicant Documents ---
  if (rules.applicantDocs && Array.isArray(rules.applicantDocs)) {
    required_documents.applicant.push(...rules.applicantDocs);
  }

  // --- Co-Applicant Logic ---
  const coAppRules = rules.coApplicant || {};
  if (coAppRules.required && !coApplicantRelation) {
    failed_rules.push(`Co-Applicant is mandatory for ${lenderName}.`);
  }
  if (coApplicantRelation && coAppRules.bloodRelationOnly && !BLOOD_RELATIONS.includes(coApplicantRelation)) {
    failed_rules.push(`Co-Applicant must be a blood relation. '${coApplicantRelation}' is not accepted.`);
  }
  
  // SK Finance specific override: if sister, must be unmarried
  if (lenderCode === 'sk-finance' && coApplicantRelation === 'sister') {
    if (input.coApplicantMaritalStatus !== 'unmarried') {
      failed_rules.push(`For ${lenderName}, if the co-applicant is a sister, she must be unmarried.`);
    }
  }

  if (coApplicantRelation && coAppRules.docs && Array.isArray(coAppRules.docs)) {
    required_documents.co_applicant.push(...coAppRules.docs);
  }

  // --- Guarantor & Rental Profile Logic ---
  const guarantorPolicy = rules.guarantorPolicy || 'none';
  const guarantorDocs = rules.guarantorDocs || [];
  const rentalRules = rules.rentalProfile || {};

  // Track if a guarantor is required based on policy
  let isGuarantorRequired = false;

  // Rental specific logic
  if (addressType === 'rental') {
    if (rentalRules.requireHometownStage) {
      required_stages.push('hometown_verification');
    }
    if (rentalRules.extraDocs && Array.isArray(rentalRules.extraDocs)) {
      required_documents.applicant.push(...rentalRules.extraDocs);
    }
    if (guarantorPolicy === 'rental_only') {
      isGuarantorRequired = true;
      additional_requirements.push('Local Guarantor is mandatory for rental profiles.');
    }
  } else if (addressType === 'owned') {
    // If address is owned, require standard ownership proof for applicant if not already handled
    const ownershipProvider = input.ownershipProvidedBy || 'applicant';
    if (!required_documents.applicant.includes('address_ownership_proof') && !required_documents.applicant.includes('address_electricity_or_khatauni')) {
      if (ownershipProvider === 'co_applicant') {
        required_documents.co_applicant.push('address_ownership_proof');
      } else if (ownershipProvider === 'guarantor') {
        required_documents.guarantor.push('address_ownership_proof');
      } else {
        required_documents.applicant.push('address_ownership_proof');
      }
    }
  }

  // Ownership proof based guarantor fallback logic (e.g. ITI Finance)
  if (guarantorPolicy === 'if_no_ownership_proof') {
    const applicantHasOwnership = uploadedDocTypes.includes('address_electricity_or_khatauni') || uploadedDocTypes.includes('address_ownership_proof');
    const coAppHasOwnership = uploadedDocTypes.includes('co_app_electricity_or_khatauni') || uploadedDocTypes.includes('co_app_ownership_proof');
    
    if (!applicantHasOwnership && !coAppHasOwnership) {
      isGuarantorRequired = true;
      additional_requirements.push('Guarantor is mandatory because no ownership proof was provided by Applicant or Co-Applicant');
    }
  } else if (guarantorPolicy === 'always') {
    isGuarantorRequired = true;
    additional_requirements.push('Guarantor is mandatory.');
  }

  // If a guarantor is required, assign their mandatory docs
  if (isGuarantorRequired) {
    required_documents.guarantor.push(...guarantorDocs);
  }

  if (failed_rules.length > 0) {
    return { result: 'not_eligible', failed_rules, missing_items: [], required_documents: [], additional_requirements, required_stages };
  }

  // 4. Check for Missing Documents
  if (uploadedDocTypes.length > 0) {
    required_documents.applicant.forEach(d => { if (!uploadedDocTypes.includes(d)) missing_items.push(`Applicant: ${d}`); });
    required_documents.guarantor.forEach(d => { if (!uploadedDocTypes.includes(d)) missing_items.push(`Guarantor: ${d}`); });
    required_documents.co_applicant.forEach(d => { if (!uploadedDocTypes.includes(d)) missing_items.push(`Co-applicant: ${d}`); });
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
    required_stages
  };
}

module.exports = { evaluateRules };
