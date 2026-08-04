'use strict';
const skFinance = require('../sk-finance/index');

describe('SK Finance — evaluate()', () => {
  const baseInput = {
    productType:     'new_car',
    age:             30,
    cibilScore:      700,
    customerType:    'salaried',
    requestedAmount: 500_000,
    addressType:     'owned',
  };

  // ── Eligible cases ────────────────────────────────────────────────
  test('eligible: new car, owned address, salaried, valid CIBIL', () => {
    const result = skFinance.evaluate(baseInput);
    expect(result.result).toBe('eligible');
    expect(result.failed_rules).toHaveLength(0);
  });

  test('eligible: used car, minimum valid CIBIL 675', () => {
    const result = skFinance.evaluate({ ...baseInput, productType: 'used_car', cibilScore: 675, requestedAmount: 400_000 });
    expect(result.result).toBe('eligible');
  });

  // ── Not eligible — hard rule failures ────────────────────────────
  test('not_eligible: CIBIL below 650', () => {
    const result = skFinance.evaluate({ ...baseInput, cibilScore: 600 });
    expect(result.result).toBe('not_eligible');
    expect(result.failed_rules.some(r => r.includes('CIBIL'))).toBe(true);
  });

  test('not_eligible: NTC / -1 CIBIL', () => {
    const result = skFinance.evaluate({ ...baseInput, cibilScore: -1 });
    expect(result.result).toBe('not_eligible');
    expect(result.failed_rules.some(r => r.includes('NTC'))).toBe(true);
  });

  test('not_eligible: age below 21', () => {
    const result = skFinance.evaluate({ ...baseInput, age: 19 });
    expect(result.result).toBe('not_eligible');
    expect(result.failed_rules.some(r => r.includes('below'))).toBe(true);
  });

  test('not_eligible: age above 65 (new car)', () => {
    const result = skFinance.evaluate({ ...baseInput, age: 66 });
    expect(result.result).toBe('not_eligible');
  });

  test('not_eligible: age above 60 (used car)', () => {
    const result = skFinance.evaluate({ ...baseInput, productType: 'used_car', age: 61, requestedAmount: 400_000 });
    expect(result.result).toBe('not_eligible');
  });

  test('not_eligible: amount below minimum (new car: 1 lakh)', () => {
    const result = skFinance.evaluate({ ...baseInput, requestedAmount: 50_000 });
    expect(result.result).toBe('not_eligible');
    expect(result.failed_rules.some(r => r.includes('below'))).toBe(true);
  });

  test('not_eligible: amount above maximum (new car: 15 lakh)', () => {
    const result = skFinance.evaluate({ ...baseInput, requestedAmount: 2_000_000 });
    expect(result.result).toBe('not_eligible');
  });

  test('not_eligible: agriculture customer type (not accepted by SK Finance)', () => {
    const result = skFinance.evaluate({ ...baseInput, customerType: 'agriculture' });
    expect(result.result).toBe('not_eligible');
    expect(result.failed_rules.some(r => r.includes('agriculture'))).toBe(true);
  });

  test('not_eligible: unknown product type', () => {
    const result = skFinance.evaluate({ ...baseInput, productType: 'commercial_vehicle' });
    expect(result.result).toBe('not_eligible');
  });

  // ── Conditional rules ─────────────────────────────────────────────
  test('eligible with additional_requirements: rental address', () => {
    const result = skFinance.evaluate({ ...baseInput, addressType: 'rental' });
    expect(result.result).toBe('eligible');
    expect(result.additional_requirements.some(r => r.includes('guarantor'))).toBe(true);
  });

  // ── Incomplete (document check) ───────────────────────────────────
  test('incomplete: full check, no documents uploaded', () => {
    const result = skFinance.evaluate({ ...baseInput, uploadedDocTypes: ['aadhaar'] });
    expect(result.result).toBe('incomplete');
    expect(result.missing_items.length).toBeGreaterThan(0);
  });

  test('eligible with full doc set uploaded', () => {
    const result = skFinance.evaluate({ ...baseInput, uploadedDocTypes: ['aadhaar', 'pan', 'passport_photo', 'bank_statement', 'salary_slip_3m', 'electricity_bill_or_property_tax', 'registry_or_title', 'vehicle_quotation'] });
    expect(result.result).toBe('eligible');
    expect(result.missing_items).toHaveLength(0);
  });

  // ── getRulesSummary ────────────────────────────────────────────────
  test('getRulesSummary returns valid structure', () => {
    const summary = skFinance.getRulesSummary();
    expect(summary.rulesVersion).toBe(skFinance.RULES_VERSION);
    expect(summary.products.new_car).toBeDefined();
    expect(summary.products.used_car).toBeDefined();
    expect(summary.products.new_car.minCibil).toBe(650);
  });
});
