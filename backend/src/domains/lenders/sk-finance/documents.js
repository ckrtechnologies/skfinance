'use strict';
/**
 * SK Finance — required document lists per product and party.
 * Keys mirror the doc_type values stored in the documents table.
 *
 * Shape returned by getRequiredDocuments(input):
 *   { applicant: string[], co_applicant: string[], guarantor: string[] }
 */

/**
 * getRequiredDocuments — derives the document checklist for this specific applicant.
 * Pure function: same input = same output. No DB calls.
 *
 * @param {{ productType, customerType, addressType, coApplicantRelation }} input
 * @returns {{ applicant: string[], co_applicant: string[], guarantor: string[] }}
 */
function getRequiredDocuments({ productType, customerType, addressType, coApplicantRelation }) {
  const applicant = [
    'aadhaar',
    'pan',
    'passport_photo',
    'bank_statement',  // 6 months
  ];

  // Income proof — salaried vs self_employed
  if (customerType === 'salaried') {
    applicant.push('salary_slip_3m');
  } else {
    applicant.push('itr_2y');
  }

  // Address proof
  if (addressType === 'owned') {
    applicant.push('electricity_bill_or_property_tax', 'registry_or_title');
  } else if (addressType === 'rental') {
    applicant.push('rent_agreement', 'electricity_bill');
  }

  // Product-specific docs
  if (productType === 'new_car') {
    applicant.push('vehicle_quotation');
  } else if (productType === 'used_car') {
    applicant.push('rc_book', 'insurance_copy', 'vehicle_valuation_report');
  }

  // Guarantor required only for rental address (conditional rule — see evaluate.js)
  const guarantor = addressType === 'rental'
    ? ['pan', 'aadhaar', 'electricity_bill_or_khatauni']
    : [];

  // Co-applicant docs (optional for SK Finance)
  const co_applicant = coApplicantRelation
    ? ['aadhaar', 'pan', 'passport_photo']
    : [];

  return { applicant, co_applicant, guarantor };
}

module.exports = { getRequiredDocuments };
