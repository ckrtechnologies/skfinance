'use strict';
const itiFinance = require('../iti-finance/index');

describe('ITI Finance — evaluate()', () => {
  const baseInput = {
    productType:     'new_car',
    age:             30,
    cibilScore:      720,
    customerType:    'salaried',
    requestedAmount: 600_000,
    addressType:     'owned',
  };

  test('eligible: new car, salaried, valid CIBIL', () => {
    const result = itiFinance.evaluate(baseInput);
    expect(result.result).toBe('eligible');
  });

  test('not_eligible: NTC / -1 CIBIL (ITI never accepts NTC)', () => {
    const result = itiFinance.evaluate({ ...baseInput, cibilScore: -1 });
    expect(result.result).toBe('not_eligible');
    expect(result.failed_rules.some(r => r.includes('NTC'))).toBe(true);
  });

  test('not_eligible: CIBIL below 700 (ITI min = 700)', () => {
    const result = itiFinance.evaluate({ ...baseInput, cibilScore: 675 });
    expect(result.result).toBe('not_eligible');
  });

  test('not_eligible: age below 23', () => {
    const result = itiFinance.evaluate({ ...baseInput, age: 22 });
    expect(result.result).toBe('not_eligible');
  });

  test('not_eligible: used car with no co-applicant', () => {
    const result = itiFinance.evaluate({ ...baseInput, productType: 'used_car', requestedAmount: 400_000 });
    expect(result.result).toBe('not_eligible');
    expect(result.failed_rules.some(r => r.includes('co-applicant'))).toBe(true);
  });

  test('eligible: used car WITH co-applicant (spouse)', () => {
    const result = itiFinance.evaluate({ ...baseInput, productType: 'used_car', requestedAmount: 400_000, coApplicantRelation: 'spouse' });
    expect(result.result).toBe('eligible');
  });

  test('eligible: agriculture customer with 0.5 hectares', () => {
    const result = itiFinance.evaluate({ ...baseInput, customerType: 'agriculture', landAreaHectares: 0.5 });
    expect(result.result).toBe('eligible');
  });

  test('not_eligible: agriculture customer with 0.3 hectares (below min)', () => {
    const result = itiFinance.evaluate({ ...baseInput, customerType: 'agriculture', landAreaHectares: 0.3 });
    expect(result.result).toBe('not_eligible');
    expect(result.failed_rules.some(r => r.includes('hectares'))).toBe(true);
  });

  test('eligible with additional_requirements: rental address', () => {
    const result = itiFinance.evaluate({ ...baseInput, addressType: 'rental' });
    expect(result.result).toBe('eligible');
    expect(result.additional_requirements.some(r => r.includes('guarantor'))).toBe(true);
  });

  test('getRulesSummary returns valid structure', () => {
    const summary = itiFinance.getRulesSummary();
    expect(summary.rulesVersion).toBe(itiFinance.RULES_VERSION);
    expect(summary.products.new_car.customerTypes).toContain('agriculture');
    expect(summary.products.used_car.coApplicantRequired).toBe(true);
  });
});
