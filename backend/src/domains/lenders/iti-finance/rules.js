'use strict';
/**
 * ITI Finance — hardcoded credit rules (New Car + Used Car).
 * Source: client-provided ITI Finance credit rule sheet (Aug 2026).
 * Change a value here → also update getRulesSummary() in index.js → bump RULES_VERSION.
 */

const NEW_CAR = {
  minLoanAmount:         150_000,
  maxLoanAmount:       1_500_000,
  ltvMin:                 80,       // %
  ltvMax:                100,
  minAge:                 23,
  maxAge:                 62,
  minCibil:              700,
  cibilNegativeAccepted: false,     // ITI does NOT accept NTC or negative CIBIL
  preferredCibil:        725,
  customerTypes:         ['salaried', 'self_employed', 'agriculture'],
  coApplicantRequired:   false,
  coApplicantRelations:  ['spouse', 'parent', 'sibling', 'child'],
  // Agriculture-specific
  minLandAreaHectares:   0.5,
};

const USED_CAR = {
  minLoanAmount:         100_000,
  maxLoanAmount:         800_000,
  ltvMin:                 70,
  ltvMax:                 85,
  minAge:                 23,
  maxAge:                 60,
  minCibil:              700,
  cibilNegativeAccepted: false,
  preferredCibil:        725,
  customerTypes:         ['salaried', 'self_employed'],
  coApplicantRequired:   true,       // co-applicant mandatory for used car at ITI
  coApplicantRelations:  ['spouse', 'parent'],
};

module.exports = { NEW_CAR, USED_CAR };
