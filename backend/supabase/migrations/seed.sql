-- =====================================================================
-- seed.sql — Shreeja Finance Platform
-- Reference / launch data:
--   • 6 lenders (2 active: SK Finance + ITI Finance)
--   • SK Finance policies v1: New Car + Used Car
--   • ITI Finance policies v1: New Car + Used Car
--   • policy_documents per policy
--   • Platform settings (commission slab, 90-day window, etc.)
--   • Valuation slabs (in-house depreciation)
--   • One admin account (update password via Supabase Dashboard after seeding)
-- =====================================================================

-- ─── Lenders ─────────────────────────────────────────────────────────
INSERT INTO lenders (id, name, code, lender_type, priority, is_active, notes) VALUES
  ('11111111-0000-0000-0000-000000000001', 'SK Finance',         'SK_FINANCE',       'nbfc', 1,  TRUE,  'Active launch partner. New + Used Car.'),
  ('11111111-0000-0000-0000-000000000002', 'ITI Finance',        'ITI_FINANCE',      'nbfc', 2,  TRUE,  'Active launch partner. New + Used Car.'),
  ('11111111-0000-0000-0000-000000000003', 'Bajaj Finserv',      'BAJAJ_FINSERV',    'nbfc', 3,  FALSE, 'Pending rule sheet (O2). Inactive until rules received.'),
  ('11111111-0000-0000-0000-000000000004', 'Mahindra Finance',   'MAHINDRA_FINANCE', 'nbfc', 4,  FALSE, 'Pending rule sheet (O2). Inactive until rules received.'),
  ('11111111-0000-0000-0000-000000000005', 'Tata Capital',       'TATA_CAPITAL',     'nbfc', 5,  FALSE, 'Pending rule sheet (O2). Inactive until rules received.'),
  ('11111111-0000-0000-0000-000000000006', 'IndusInd Bank',      'INDUSIND_BANK',    'bank', 6,  FALSE, 'Pending rule sheet (O2). Inactive until rules received.');


-- ─── SK Finance — New Car Policy v1 ──────────────────────────────────
-- Based on client-provided credit rule sheet. Policy-as-data; changing a rule = new version.
INSERT INTO lender_policies (
  id, lender_id, product_type, version, effective_from, status,
  min_loan_amount, max_loan_amount, ltv_min, ltv_max,
  min_age, max_age, min_cibil, cibil_negative_accepted, preferred_cibil,
  customer_types, co_applicant_required, co_applicant_relations,
  ownership_proof_rules, conditional_rules,
  notes
) VALUES (
  '22222222-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000001',  -- SK Finance
  'new_car', 1, '2026-01-01', 'active',
  100000, 1500000, 80.00, 100.00,
  21, 65,
  650, FALSE, 700,
  ARRAY['salaried', 'self_employed']::customer_type[],
  FALSE, ARRAY['spouse', 'parent', 'sibling', 'child'],
  -- ownership_proof_rules: applicant must provide either owned property docs or rental docs
  '[
    {
      "if_address_type": "owned",
      "required_docs": ["electricity_bill_or_property_tax", "registry_or_title"]
    },
    {
      "if_address_type": "rental",
      "required_docs": ["rent_agreement", "electricity_bill"]
    }
  ]'::jsonb,
  -- conditional_rules: rental address triggers additional field visit + guarantor
  '[
    {
      "trigger": "applicant.address_type == ''rental''",
      "requires": ["home_town_field_visit", "home_town_ownership_docs", "local_guarantor"],
      "guarantor_docs": ["pan", "aadhaar", "electricity_bill_or_khatauni"],
      "excluded_docs": ["property_registry"]
    }
  ]'::jsonb,
  'SK Finance New Car credit rule sheet v1 (received from client, Aug 2026).'
);

-- SK Finance — Used Car Policy v1
INSERT INTO lender_policies (
  id, lender_id, product_type, version, effective_from, status,
  min_loan_amount, max_loan_amount, ltv_min, ltv_max,
  min_age, max_age, min_cibil, cibil_negative_accepted, preferred_cibil,
  customer_types, co_applicant_required, co_applicant_relations,
  ownership_proof_rules, conditional_rules,
  notes
) VALUES (
  '22222222-0000-0000-0000-000000000002',
  '11111111-0000-0000-0000-000000000001',  -- SK Finance
  'used_car', 1, '2026-01-01', 'active',
  100000, 1000000, 70.00, 90.00,
  21, 60,
  675, FALSE, 700,
  ARRAY['salaried', 'self_employed']::customer_type[],
  FALSE, ARRAY['spouse', 'parent', 'sibling'],
  '[
    {
      "if_address_type": "owned",
      "required_docs": ["electricity_bill_or_property_tax", "registry_or_title"]
    },
    {
      "if_address_type": "rental",
      "required_docs": ["rent_agreement", "electricity_bill"]
    }
  ]'::jsonb,
  '[
    {
      "trigger": "applicant.address_type == ''rental''",
      "requires": ["home_town_field_visit", "home_town_ownership_docs", "local_guarantor"],
      "guarantor_docs": ["pan", "aadhaar", "electricity_bill_or_khatauni"],
      "excluded_docs": []
    }
  ]'::jsonb,
  'SK Finance Used Car credit rule sheet v1 (received from client, Aug 2026). LTV capped at 90%. Max age 60.'
);


-- ─── ITI Finance — New Car Policy v1 ─────────────────────────────────
INSERT INTO lender_policies (
  id, lender_id, product_type, version, effective_from, status,
  min_loan_amount, max_loan_amount, ltv_min, ltv_max,
  min_age, max_age, min_cibil, cibil_negative_accepted, preferred_cibil,
  customer_types, co_applicant_required, co_applicant_relations,
  ownership_proof_rules, conditional_rules,
  notes
) VALUES (
  '22222222-0000-0000-0000-000000000003',
  '11111111-0000-0000-0000-000000000002',  -- ITI Finance
  'new_car', 1, '2026-01-01', 'active',
  150000, 1500000, 80.00, 100.00,
  23, 62,
  -- ITI does not accept NTC (-1) or negative CIBIL
  700, FALSE, 725,
  ARRAY['salaried', 'self_employed', 'agriculture']::customer_type[],
  FALSE, ARRAY['spouse', 'parent', 'sibling', 'child'],
  '[
    {
      "if_address_type": "owned",
      "required_docs": ["electricity_bill_or_property_tax", "registry_or_title"]
    },
    {
      "if_address_type": "rental",
      "required_docs": ["rent_agreement", "electricity_bill", "landlord_noc"]
    }
  ]'::jsonb,
  '[
    {
      "trigger": "applicant.address_type == ''rental''",
      "requires": ["home_town_field_visit", "home_town_ownership_docs", "landlord_electricity_bill", "local_guarantor"],
      "guarantor_docs": ["pan", "aadhaar", "electricity_bill_or_khatauni"],
      "excluded_docs": ["property_registry"]
    },
    {
      "trigger": "applicant.customer_type == ''agriculture''",
      "requires": ["khatauni", "khasra"],
      "min_land_area_hectares": 0.5
    }
  ]'::jsonb,
  'ITI Finance New Car credit rule sheet v1 (received from client, Aug 2026). Min CIBIL 700; max age 62; accepts agriculture.'
);

-- ITI Finance — Used Car Policy v1
INSERT INTO lender_policies (
  id, lender_id, product_type, version, effective_from, status,
  min_loan_amount, max_loan_amount, ltv_min, ltv_max,
  min_age, max_age, min_cibil, cibil_negative_accepted, preferred_cibil,
  customer_types, co_applicant_required, co_applicant_relations,
  ownership_proof_rules, conditional_rules,
  notes
) VALUES (
  '22222222-0000-0000-0000-000000000004',
  '11111111-0000-0000-0000-000000000002',  -- ITI Finance
  'used_car', 1, '2026-01-01', 'active',
  100000, 800000, 70.00, 85.00,
  23, 60,
  700, FALSE, 725,
  ARRAY['salaried', 'self_employed']::customer_type[],
  -- Co-applicant required for used car at ITI
  TRUE, ARRAY['spouse', 'parent'],
  '[
    {
      "if_address_type": "owned",
      "required_docs": ["electricity_bill_or_property_tax", "registry_or_title"]
    },
    {
      "if_address_type": "rental",
      "required_docs": ["rent_agreement", "electricity_bill", "landlord_noc"]
    }
  ]'::jsonb,
  '[
    {
      "trigger": "applicant.address_type == ''rental''",
      "requires": ["home_town_field_visit", "home_town_ownership_docs", "local_guarantor"],
      "guarantor_docs": ["pan", "aadhaar", "electricity_bill_or_khatauni"],
      "excluded_docs": []
    }
  ]'::jsonb,
  'ITI Finance Used Car credit rule sheet v1. Co-applicant required. Max loan ₹8L. Max age 60.'
);


-- ─── policy_documents ─────────────────────────────────────────────────
-- SK Finance New Car (policy 22222222-...-0001)
INSERT INTO policy_documents (policy_id, party, doc_type, is_mandatory, selection_group, min_required_in_group, bank_statement_months) VALUES
  ('22222222-0000-0000-0000-000000000001', 'applicant', 'aadhaar',               TRUE,  NULL, NULL, NULL),
  ('22222222-0000-0000-0000-000000000001', 'applicant', 'pan',                   TRUE,  NULL, NULL, NULL),
  ('22222222-0000-0000-0000-000000000001', 'applicant', 'bank_statement',        TRUE,  NULL, NULL, 6),
  ('22222222-0000-0000-0000-000000000001', 'applicant', 'salary_slip_3m',        FALSE, 'income_proof', 1, NULL),  -- salaried: salary slips OR form 16
  ('22222222-0000-0000-0000-000000000001', 'applicant', 'form_16',               FALSE, 'income_proof', 1, NULL),
  ('22222222-0000-0000-0000-000000000001', 'applicant', 'itr_2y',                FALSE, 'income_proof', 1, NULL),  -- self-employed
  ('22222222-0000-0000-0000-000000000001', 'applicant', 'electricity_bill',      FALSE, 'address_proof', 1, NULL),
  ('22222222-0000-0000-0000-000000000001', 'applicant', 'rent_agreement',        FALSE, 'address_proof', 1, NULL),
  ('22222222-0000-0000-0000-000000000001', 'applicant', 'passport_photo',        TRUE,  NULL, NULL, NULL),
  ('22222222-0000-0000-0000-000000000001', 'applicant', 'vehicle_quotation',     TRUE,  NULL, NULL, NULL);   -- new car dealer quotation

-- SK Finance Used Car (policy 22222222-...-0002)
INSERT INTO policy_documents (policy_id, party, doc_type, is_mandatory, selection_group, min_required_in_group, bank_statement_months) VALUES
  ('22222222-0000-0000-0000-000000000002', 'applicant', 'aadhaar',               TRUE,  NULL, NULL, NULL),
  ('22222222-0000-0000-0000-000000000002', 'applicant', 'pan',                   TRUE,  NULL, NULL, NULL),
  ('22222222-0000-0000-0000-000000000002', 'applicant', 'bank_statement',        TRUE,  NULL, NULL, 6),
  ('22222222-0000-0000-0000-000000000002', 'applicant', 'salary_slip_3m',        FALSE, 'income_proof', 1, NULL),
  ('22222222-0000-0000-0000-000000000002', 'applicant', 'form_16',               FALSE, 'income_proof', 1, NULL),
  ('22222222-0000-0000-0000-000000000002', 'applicant', 'itr_2y',                FALSE, 'income_proof', 1, NULL),
  ('22222222-0000-0000-0000-000000000002', 'applicant', 'electricity_bill',      FALSE, 'address_proof', 1, NULL),
  ('22222222-0000-0000-0000-000000000002', 'applicant', 'rent_agreement',        FALSE, 'address_proof', 1, NULL),
  ('22222222-0000-0000-0000-000000000002', 'applicant', 'passport_photo',        TRUE,  NULL, NULL, NULL),
  ('22222222-0000-0000-0000-000000000002', 'applicant', 'rc_book',               TRUE,  NULL, NULL, NULL),   -- used car RC
  ('22222222-0000-0000-0000-000000000002', 'applicant', 'insurance_copy',        TRUE,  NULL, NULL, NULL),   -- used car insurance
  ('22222222-0000-0000-0000-000000000002', 'applicant', 'vehicle_valuation_report', TRUE, NULL, NULL, NULL); -- in-house valuation

-- ITI Finance New Car (policy 22222222-...-0003)
INSERT INTO policy_documents (policy_id, party, doc_type, is_mandatory, selection_group, min_required_in_group, bank_statement_months) VALUES
  ('22222222-0000-0000-0000-000000000003', 'applicant', 'aadhaar',               TRUE,  NULL, NULL, NULL),
  ('22222222-0000-0000-0000-000000000003', 'applicant', 'pan',                   TRUE,  NULL, NULL, NULL),
  ('22222222-0000-0000-0000-000000000003', 'applicant', 'bank_statement',        TRUE,  NULL, NULL, 6),
  ('22222222-0000-0000-0000-000000000003', 'applicant', 'salary_slip_3m',        FALSE, 'income_proof', 1, NULL),
  ('22222222-0000-0000-0000-000000000003', 'applicant', 'form_16',               FALSE, 'income_proof', 1, NULL),
  ('22222222-0000-0000-0000-000000000003', 'applicant', 'itr_2y',                FALSE, 'income_proof', 1, NULL),
  ('22222222-0000-0000-0000-000000000003', 'applicant', 'khatauni',              FALSE, 'income_proof', 1, NULL), -- agriculture
  ('22222222-0000-0000-0000-000000000003', 'applicant', 'electricity_bill',      FALSE, 'address_proof', 1, NULL),
  ('22222222-0000-0000-0000-000000000003', 'applicant', 'rent_agreement',        FALSE, 'address_proof', 1, NULL),
  ('22222222-0000-0000-0000-000000000003', 'applicant', 'passport_photo',        TRUE,  NULL, NULL, NULL),
  ('22222222-0000-0000-0000-000000000003', 'applicant', 'vehicle_quotation',     TRUE,  NULL, NULL, NULL),
  ('22222222-0000-0000-0000-000000000003', 'applicant', 'cibil_report',          FALSE, NULL, NULL, NULL);   -- ITI requires CIBIL report copy

-- ITI Finance Used Car (policy 22222222-...-0004)
INSERT INTO policy_documents (policy_id, party, doc_type, is_mandatory, selection_group, min_required_in_group, bank_statement_months) VALUES
  ('22222222-0000-0000-0000-000000000004', 'applicant', 'aadhaar',               TRUE,  NULL, NULL, NULL),
  ('22222222-0000-0000-0000-000000000004', 'applicant', 'pan',                   TRUE,  NULL, NULL, NULL),
  ('22222222-0000-0000-0000-000000000004', 'applicant', 'bank_statement',        TRUE,  NULL, NULL, 6),
  ('22222222-0000-0000-0000-000000000004', 'applicant', 'salary_slip_3m',        FALSE, 'income_proof', 1, NULL),
  ('22222222-0000-0000-0000-000000000004', 'applicant', 'form_16',               FALSE, 'income_proof', 1, NULL),
  ('22222222-0000-0000-0000-000000000004', 'applicant', 'itr_2y',                FALSE, 'income_proof', 1, NULL),
  ('22222222-0000-0000-0000-000000000004', 'applicant', 'electricity_bill',      FALSE, 'address_proof', 1, NULL),
  ('22222222-0000-0000-0000-000000000004', 'applicant', 'rent_agreement',        FALSE, 'address_proof', 1, NULL),
  ('22222222-0000-0000-0000-000000000004', 'applicant', 'passport_photo',        TRUE,  NULL, NULL, NULL),
  ('22222222-0000-0000-0000-000000000004', 'applicant', 'rc_book',               TRUE,  NULL, NULL, NULL),
  ('22222222-0000-0000-0000-000000000004', 'applicant', 'insurance_copy',        TRUE,  NULL, NULL, NULL),
  ('22222222-0000-0000-0000-000000000004', 'applicant', 'vehicle_valuation_report', TRUE, NULL, NULL, NULL),
  ('22222222-0000-0000-0000-000000000004', 'applicant', 'cibil_report',          FALSE, NULL, NULL, NULL),
  -- Co-applicant docs (co_applicant_required = TRUE for ITI Used Car)
  ('22222222-0000-0000-0000-000000000004', 'co_applicant', 'aadhaar',            TRUE,  NULL, NULL, NULL),
  ('22222222-0000-0000-0000-000000000004', 'co_applicant', 'pan',                TRUE,  NULL, NULL, NULL),
  ('22222222-0000-0000-0000-000000000004', 'co_applicant', 'passport_photo',     TRUE,  NULL, NULL, NULL);


-- ─── Platform settings ────────────────────────────────────────────────
-- NOTE: updated_by is NULL for seed rows (no admin profile yet at this point).
-- After seeding, admin can update via /admin/settings which will set updated_by.
INSERT INTO settings (key, value, description) VALUES
  (
    'commission_slab',
    '{"threshold": 1000000, "rate_below": 0.015, "rate_above": 0.02}'::jsonb,
    'Dealer commission: 1.5% on disbursed amount ≤ ₹10,00,000; 2% above. Open item O1: confirm if 2% applies to whole amount or only the portion above threshold.'
  ),
  (
    'ninety_day_window',
    '{"days": 90}'::jsonb,
    'J1: Loan applications approved more than this many days ago without disbursement are auto-blocked. Re-approval required.'
  ),
  (
    'stale_draft_window',
    '{"days": 30}'::jsonb,
    'J2: Draft applications untouched for this many days are auto-cancelled.'
  ),
  (
    'withdrawal_reminder_hours',
    '{"hours": 48}'::jsonb,
    'J3: Admin is notified of withdrawal requests older than this threshold still in ''requested'' status.'
  );


-- ─── Valuation slabs (in-house depreciation) ─────────────────────────
-- Formula: assessed_value = market_price × (1 − depreciation_pct / 100)
-- These are starting values; admin can tune via /admin/settings → valuation_slabs CRUD.

-- New car depreciation
INSERT INTO valuation_slabs (vehicle_category, age_band, depreciation_pct) VALUES
  ('new_car', '0-1',  5.00),
  ('new_car', '1-3',  15.00),
  ('new_car', '3-5',  25.00),
  ('new_car', '5-7',  35.00),
  ('new_car', '7-10', 50.00),
  ('new_car', '10+',  65.00);

-- Used car depreciation (slightly higher)
INSERT INTO valuation_slabs (vehicle_category, age_band, depreciation_pct) VALUES
  ('used_car', '0-1',  8.00),
  ('used_car', '1-3',  18.00),
  ('used_car', '3-5',  28.00),
  ('used_car', '5-7',  40.00),
  ('used_car', '7-10', 55.00),
  ('used_car', '10+',  70.00);

-- Commercial vehicle depreciation
INSERT INTO valuation_slabs (vehicle_category, age_band, depreciation_pct) VALUES
  ('commercial_vehicle', '0-1',  10.00),
  ('commercial_vehicle', '1-3',  20.00),
  ('commercial_vehicle', '3-5',  33.00),
  ('commercial_vehicle', '5-7',  45.00),
  ('commercial_vehicle', '7-10', 60.00),
  ('commercial_vehicle', '10+',  75.00);


-- ─── Admin user ───────────────────────────────────────────────────────
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard → Authentication → Users → Create user
--    Email: admin@shreeja.finance   Password: (set a strong one; change after first login)
-- 2. Copy the UUID of the created user.
-- 3. Replace the placeholder UUID '00000000-0000-0000-0000-000000000001' with the real UUID below.
-- 4. Run this INSERT (or run it after setting ADMIN_AUTH_USER_ID in your migration script).
--
-- Alternatively, uncomment and use the Supabase admin API in your setup script.

-- PLACEHOLDER — update auth_user_id before running in production:
/*
INSERT INTO profiles (id, auth_user_id, role, full_name, email, is_active)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',   -- ← REPLACE with real auth.users.id
  'admin',
  'Shreeja Admin',
  'admin@shreeja.finance',
  TRUE
);
*/

-- ─── Seed summary ────────────────────────────────────────────────────
-- ✓ 6 lenders (SK Finance + ITI Finance = active; 4 others = inactive pending O2)
-- ✓ 4 lender_policies (SK New/Used Car v1 + ITI New/Used Car v1) — all status=active
-- ✓ policy_documents for all 4 policies (applicant + co_applicant for ITI Used Car)
-- ✓ 4 platform settings (commission_slab, ninety_day_window, stale_draft_window, withdrawal_reminder_hours)
-- ✓ 18 valuation_slabs across 3 vehicle categories
-- ✗ Admin profile: manual step above (requires Supabase Auth user ID)
