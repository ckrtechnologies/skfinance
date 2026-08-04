'use strict';
const { evaluate }  = require('./evaluate');
const { NEW_CAR, USED_CAR } = require('./rules');

const RULES_VERSION = 'sk-v1.0';

/**
 * getRulesSummary — returns a human-readable rules snapshot.
 * Powers Admin Panel Screen A6 (Lender Rules Reference).
 * Must stay in sync with evaluate() — update both in the same change.
 */
function getRulesSummary() {
  return {
    rulesVersion: RULES_VERSION,
    lenderName: 'SK Finance',
    lenderCode: 'sk-finance',
    products: {
      new_car: {
        loanRange:           { min: NEW_CAR.minLoanAmount, max: NEW_CAR.maxLoanAmount },
        ltvRange:            { min: NEW_CAR.ltvMin, max: NEW_CAR.ltvMax },
        ageRange:            { min: NEW_CAR.minAge, max: NEW_CAR.maxAge },
        minCibil:            NEW_CAR.minCibil,
        cibilNegativeAccepted: NEW_CAR.cibilNegativeAccepted,
        customerTypes:       NEW_CAR.customerTypes,
        coApplicantRequired: NEW_CAR.coApplicantRequired,
        coApplicantRelations: NEW_CAR.coApplicantRelations,
      },
      used_car: {
        loanRange:           { min: USED_CAR.minLoanAmount, max: USED_CAR.maxLoanAmount },
        ltvRange:            { min: USED_CAR.ltvMin, max: USED_CAR.ltvMax },
        ageRange:            { min: USED_CAR.minAge, max: USED_CAR.maxAge },
        minCibil:            USED_CAR.minCibil,
        cibilNegativeAccepted: USED_CAR.cibilNegativeAccepted,
        customerTypes:       USED_CAR.customerTypes,
        coApplicantRequired: USED_CAR.coApplicantRequired,
        coApplicantRelations: USED_CAR.coApplicantRelations,
      },
    },
    guarantorConditions: 'Guarantor required when applicant address type is rental. Guarantor must provide PAN, Aadhaar, and electricity bill or Khatauni.',
    conditionalRules: [
      'Rental address: hometown field visit required + hometown ownership docs + local guarantor',
    ],
  };
}

module.exports = { RULES_VERSION, evaluate, getRulesSummary };
