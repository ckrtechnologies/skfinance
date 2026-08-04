'use strict';
/**
 * ITI Finance — required document lists per product and party.
 */

function getRequiredDocuments({ productType, customerType, addressType, coApplicantRelation }) {
  const applicant = [
    'aadhaar',
    'pan',
    'passport_photo',
    'bank_statement',   // 6 months
    'cibil_report',     // ITI requires a copy of the CIBIL report
  ];

  // Income proof
  if (customerType === 'salaried') {
    applicant.push('salary_slip_3m');
  } else if (customerType === 'self_employed') {
    applicant.push('itr_2y');
  } else if (customerType === 'agriculture') {
    applicant.push('khatauni', 'khasra');
  }

  // Address proof
  if (addressType === 'owned') {
    applicant.push('electricity_bill_or_property_tax', 'registry_or_title');
  } else if (addressType === 'rental') {
    applicant.push('rent_agreement', 'electricity_bill', 'landlord_noc');
  }

  // Product-specific
  if (productType === 'new_car') {
    applicant.push('vehicle_quotation');
  } else if (productType === 'used_car') {
    applicant.push('rc_book', 'insurance_copy', 'vehicle_valuation_report');
  }

  // Guarantor — required for rental address at ITI
  const guarantor = addressType === 'rental'
    ? ['pan', 'aadhaar', 'electricity_bill_or_khatauni']
    : [];

  // Co-applicant (mandatory for ITI Used Car)
  const co_applicant = (coApplicantRelation || productType === 'used_car')
    ? ['aadhaar', 'pan', 'passport_photo']
    : [];

  return { applicant, co_applicant, guarantor };
}

module.exports = { getRequiredDocuments };
