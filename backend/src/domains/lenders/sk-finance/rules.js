'use strict';
/**
 * SK Finance — hardcoded credit rules (New Car + Used Car).
 * Source: client-provided SK Finance credit rule sheet (Aug 2026).
 * Change a value here → also update getRulesSummary() in index.js → bump RULES_VERSION.
 */

const NEW_CAR = {
  minLoanAmount:       100_000,
  maxLoanAmount:     1_500_000,
  ltvMin:               80,      // %
  ltvMax:              100,      // %
  minAge:               21,
  maxAge:               65,
  minCibil:            650,
  cibilNegativeAccepted: false,  // -1 / NTC not accepted
  preferredCibil:      700,
  customerTypes:       ['salaried', 'self_employed'],
  coApplicantRequired: false,
  coApplicantRelations: ['spouse', 'parent', 'sibling', 'child'],
};

const USED_CAR = {
  minLoanAmount:       100_000,
  maxLoanAmount:     1_000_000,
  ltvMin:               70,
  ltvMax:               90,
  minAge:               21,
  maxAge:               60,
  minCibil:            675,
  cibilNegativeAccepted: false,
  preferredCibil:      700,
  customerTypes:       ['salaried', 'self_employed'],
  coApplicantRequired: false,
  coApplicantRelations: ['spouse', 'parent', 'sibling'],
};

module.exports = { NEW_CAR, USED_CAR };
