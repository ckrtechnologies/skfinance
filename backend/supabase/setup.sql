-- =====================================================================
-- setup.sql — Shreeja Finance Platform (v3.0)
-- Run this ONCE in Supabase SQL Editor (Project → SQL Editor → New Query).
--
-- Order of execution:
--   1. Enums
--   2. Utility trigger function
--   3. Identity & party tables (profiles, customers, dealers, staff)
--   4. Lenders & eligibility_evaluations
--   5. Loan pipeline (loan_applications, loan_stage_entries, documents, valuation_slabs)
--   6. Money (commissions, wallet_ledger, withdrawal_requests)
--   7. Platform (notifications, settings, audit_log)
--   8. Indexes
--   9. Database functions (fn_disburse_loan, fn_re_approve_loan, fn_transition_commission_status)
--  10. Seed data
--
-- NOTE (Admin user): After running this script, go to:
--   Supabase Dashboard → Authentication → Users → Add user
--   Email: admin@shreeja.finance — set a strong password.
--   Then copy the generated auth.users UUID and run the INSERT
--   at the bottom of this file (under "Admin profile — MANUAL STEP").
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 1 — ENUMS
-- ─────────────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('customer', 'dealer', 'staff', 'admin');
CREATE TYPE product_type AS ENUM ('new_car', 'used_car', 'commercial_vehicle');
CREATE TYPE loan_stage AS ENUM ('cibil', 'bank', 'valuation', 'fi', 'approval', 'disbursement');
CREATE TYPE application_status AS ENUM (
  'draft', 'in_progress', 'approved', 'blocked_90d', 'disbursed', 'rejected', 'cancelled'
);
CREATE TYPE evaluation_result AS ENUM ('eligible', 'not_eligible', 'incomplete');
CREATE TYPE commission_status AS ENUM ('earned', 'payout_pending', 'paid');
CREATE TYPE ledger_entry_type AS ENUM ('commission_earned', 'payout', 'adjustment');
CREATE TYPE withdrawal_status AS ENUM ('requested', 'processed', 'rejected');
CREATE TYPE customer_type AS ENUM ('salaried', 'self_employed', 'agriculture');


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 2 — UTILITY TRIGGER FUNCTION
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 3 — IDENTITY & PARTIES
-- ─────────────────────────────────────────────────────────────────────

-- profiles — one row per Supabase Auth user
CREATE TABLE profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role            user_role NOT NULL,
  full_name       TEXT NOT NULL,
  phone           TEXT,          -- nullable for admin (email login)
  email           TEXT,          -- nullable for customer/dealer (OTP login)
  avatar_url      TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- customers
CREATE TABLE customers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id              UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  dob                     DATE,
  customer_type           customer_type,
  cibil_score             INT,       -- -1 = NTC; null = unknown yet
  address_line1           TEXT,
  address_line2           TEXT,
  city                    TEXT,
  state                   TEXT,
  pincode                 TEXT,
  address_type            TEXT CHECK (address_type IN ('owned', 'rental')),
  hometown_city           TEXT,
  hometown_state          TEXT,
  hometown_pincode        TEXT,
  co_applicant_name       TEXT,
  co_applicant_relation   TEXT,
  co_applicant_dob        DATE,
  co_applicant_income     NUMERIC(14,2),
  pan_number              TEXT,
  custom_fields           JSONB NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_updated_at_customers
  BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- dealers
CREATE TABLE dealers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  dealer_code         TEXT NOT NULL UNIQUE,   -- e.g. DLR-001
  pan_number          TEXT,
  gst_number          TEXT,
  business_name       TEXT,
  business_address    TEXT,
  city                TEXT,
  state               TEXT,
  pincode             TEXT,
  bank_account_name   TEXT,
  bank_account_number TEXT,
  bank_ifsc           TEXT,
  bank_name           TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at           DATE,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_updated_at_dealers
  BEFORE UPDATE ON dealers FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- staff — Staff App + Staff Panel share the same profile row
CREATE TABLE staff (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  staff_code  TEXT NOT NULL UNIQUE,   -- e.g. STF-001
  designation TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at   DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_updated_at_staff
  BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 4 — LENDERS & ELIGIBILITY EVALUATIONS
-- v3.0: lender rules are HARDCODED in domains/lenders/<code>/ — not in DB.
-- Only identity + operational settings (is_active, priority) stored here.
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE lenders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  code          TEXT NOT NULL UNIQUE,  -- matches backend folder name e.g. 'sk-finance'
  lender_type   TEXT NOT NULL DEFAULT 'nbfc',  -- nbfc | bank
  contact_name  TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  logo_url      TEXT,
  priority      INT NOT NULL DEFAULT 10,    -- lower = preferred when multiple eligible
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_updated_at_lenders
  BEFORE UPDATE ON lenders FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- eligibility_evaluations — APPEND-ONLY.
-- lender_code + rules_version replace the old lender_policy_id FK.
-- rules_version is the RULES_VERSION string exported by the lender module (bumped on every rule change).
CREATE TABLE eligibility_evaluations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_application_id UUID NOT NULL,  -- FK wired after loan_applications is created (below)
  lender_code         TEXT NOT NULL,  -- e.g. 'sk-finance' — matches lenders.code
  rules_version       TEXT NOT NULL,  -- e.g. 'sk-v1.0' — audit trail for "which rules ran"
  stage               TEXT NOT NULL CHECK (stage IN ('pre_check', 'full')),
  result              evaluation_result NOT NULL,
  failed_rules        JSONB NOT NULL DEFAULT '[]',
  missing_items       JSONB NOT NULL DEFAULT '[]',
  evaluated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at — append-only, never mutated
);


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 5 — LOAN PIPELINE
-- ─────────────────────────────────────────────────────────────────────

-- loan_applications — one row per loan file
-- Stage order: cibil → bank → valuation → fi → approval → disbursement
CREATE TABLE loan_applications (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_no        TEXT NOT NULL UNIQUE,   -- e.g. SF-2026-00001
  customer_id           UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  created_by_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  dealer_id             UUID REFERENCES dealers(id) ON DELETE RESTRICT,  -- null if staff-created
  staff_id              UUID REFERENCES staff(id) ON DELETE RESTRICT,    -- null if dealer-created
  product_type          product_type NOT NULL,
  vehicle_details       JSONB NOT NULL DEFAULT '{}',
  requested_amount      NUMERIC(14,2) NOT NULL,
  approved_amount       NUMERIC(14,2),
  disbursed_amount      NUMERIC(14,2),
  submitted_lender_id   UUID REFERENCES lenders(id) ON DELETE RESTRICT,
  current_stage         loan_stage NOT NULL DEFAULT 'cibil',
  status                application_status NOT NULL DEFAULT 'draft',
  approved_at           TIMESTAMPTZ,
  disbursed_at          TIMESTAMPTZ,
  rejected_at           TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  blocked_90d_at        TIMESTAMPTZ,   -- set by J1 job
  internal_notes        TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_updated_at_loan_applications
  BEFORE UPDATE ON loan_applications FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Wire deferred FK from eligibility_evaluations → loan_applications
ALTER TABLE eligibility_evaluations
  ADD CONSTRAINT fk_eligibility_loan_application
  FOREIGN KEY (loan_application_id) REFERENCES loan_applications(id) ON DELETE RESTRICT;

-- loan_stage_entries — APPEND-ONLY stage ledger per loan file
CREATE TABLE loan_stage_entries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_application_id   UUID NOT NULL REFERENCES loan_applications(id) ON DELETE RESTRICT,
  stage                 loan_stage NOT NULL,
  entered_by_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  outcome               TEXT NOT NULL CHECK (outcome IN ('pass', 'fail', 'pending', 'rework')),
  remarks               TEXT,
  data                  JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at — append-only
);

-- documents — uploaded files (stored on VPS CDN, not Supabase Storage)
CREATE TABLE documents (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_application_id    UUID NOT NULL REFERENCES loan_applications(id) ON DELETE RESTRICT,
  party                  TEXT NOT NULL CHECK (party IN ('applicant', 'co_applicant', 'guarantor')),
  doc_type               TEXT NOT NULL,     -- e.g. 'aadhaar', 'pan', 'salary_slip_3m'
  cdn_path               TEXT NOT NULL,     -- CDN-relative path, e.g. loans/SF-2026-00001/applicant/aadhaar/uuid.pdf
  original_filename      TEXT,
  mime_type              TEXT,
  file_size_bytes        INT,
  uploaded_by_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  verified               BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by            UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  verified_at            TIMESTAMPTZ,
  rejection_reason       TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_updated_at_documents
  BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- valuation_slabs — in-house depreciation table, admin-tunable
CREATE TABLE valuation_slabs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_category product_type NOT NULL,
  age_band         TEXT NOT NULL,           -- e.g. '0-1', '1-3', '3-5', '5-7', '7-10', '10+'
  depreciation_pct NUMERIC(5,2) NOT NULL,   -- e.g. 15.00 = 15%
  CONSTRAINT uq_valuation_slab UNIQUE (vehicle_category, age_band),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_updated_at_valuation_slabs
  BEFORE UPDATE ON valuation_slabs FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 6 — COMMISSIONS & WALLET
-- ─────────────────────────────────────────────────────────────────────

-- commissions — one row per disbursed file with a dealer; APPEND-ONLY
-- Slab: 1.5% if disbursed_amount ≤ ₹10,00,000 / 2% if above (PRD §5)
CREATE TABLE commissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_application_id UUID NOT NULL UNIQUE REFERENCES loan_applications(id) ON DELETE RESTRICT,
  dealer_id           UUID NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
  disbursed_amount    NUMERIC(14,2) NOT NULL,
  rate_applied        NUMERIC(6,4) NOT NULL,   -- 0.0150 or 0.0200
  amount              NUMERIC(14,2) NOT NULL,  -- disbursed_amount × rate_applied
  status              commission_status NOT NULL DEFAULT 'earned',
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at — transitions via security-definer fn only
);

-- Security-definer function to transition commission status
CREATE OR REPLACE FUNCTION fn_transition_commission_status(
  p_commission_id UUID,
  p_new_status    commission_status
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE commissions
  SET status  = p_new_status,
      paid_at = CASE WHEN p_new_status = 'paid' THEN NOW() ELSE paid_at END
  WHERE id = p_commission_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commission % not found', p_commission_id;
  END IF;
END;
$$;

-- wallet_ledger — APPEND-ONLY dealer ledger; balance = SUM(amount)
CREATE TABLE wallet_ledger (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id             UUID NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
  entry_type            ledger_entry_type NOT NULL,
  amount                NUMERIC(14,2) NOT NULL,   -- positive = credit, negative = debit
  commission_id         UUID REFERENCES commissions(id) ON DELETE RESTRICT,
  application_id        UUID REFERENCES loan_applications(id) ON DELETE SET NULL,
  payout_utr            TEXT,
  payout_date           DATE,
  receipt_pdf_url       TEXT,
  receipt_pdf_name      TEXT,
  remarks               TEXT,
  created_by_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at — append-only
);

-- withdrawal_requests
CREATE TABLE withdrawal_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id        UUID NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
  amount_requested NUMERIC(14,2) NOT NULL,
  status           withdrawal_status NOT NULL DEFAULT 'requested',
  processed_by     UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  processed_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  payout_utr       TEXT,
  payout_date      DATE,
  receipt_pdf_url  TEXT,
  receipt_pdf_name TEXT,
  ledger_entry_id  UUID REFERENCES wallet_ledger(id) ON DELETE RESTRICT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_updated_at_withdrawal_requests
  BEFORE UPDATE ON withdrawal_requests FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 7 — PLATFORM TABLES
-- ─────────────────────────────────────────────────────────────────────

-- notifications — in-app only; no push/SMS in v1
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  link_type  TEXT,   -- e.g. 'loan_application'
  link_id    UUID,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- settings — singleton key/value config, admin-editable via /admin/settings
CREATE TABLE settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  value       JSONB NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_updated_at_settings
  BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 8 — INDEXES
-- ─────────────────────────────────────────────────────────────────────

-- loan_applications
CREATE INDEX idx_loan_apps_approved_at    ON loan_applications(approved_at) WHERE status = 'approved';
CREATE INDEX idx_loan_apps_status_stage   ON loan_applications(status, current_stage);
CREATE INDEX idx_loan_apps_dealer_id      ON loan_applications(dealer_id);
CREATE INDEX idx_loan_apps_staff_id       ON loan_applications(staff_id);
CREATE INDEX idx_loan_apps_customer_id    ON loan_applications(customer_id);
CREATE INDEX idx_loan_apps_application_no ON loan_applications(application_no);

-- lenders
CREATE INDEX idx_lenders_active_priority  ON lenders(is_active, priority);

-- eligibility_evaluations
CREATE INDEX idx_eligibility_evals_loan_app     ON eligibility_evaluations(loan_application_id);
CREATE INDEX idx_eligibility_evals_lender_rules ON eligibility_evaluations(lender_code, rules_version);

-- loan_stage_entries
CREATE INDEX idx_stage_entries_loan_app ON loan_stage_entries(loan_application_id, created_at ASC);

-- documents
CREATE INDEX idx_documents_loan_app ON documents(loan_application_id);

-- commissions
CREATE INDEX idx_commissions_dealer_id ON commissions(dealer_id);
CREATE INDEX idx_commissions_status    ON commissions(status);

-- wallet_ledger
CREATE INDEX idx_wallet_ledger_dealer_created ON wallet_ledger(dealer_id, created_at DESC);

-- withdrawal_requests
CREATE INDEX idx_withdrawal_requests_pending ON withdrawal_requests(created_at) WHERE status = 'requested';

-- notifications
CREATE INDEX idx_notifications_profile_unread ON notifications(profile_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_profile_all    ON notifications(profile_id, created_at DESC);



-- ─────────────────────────────────────────────────────────────────────
-- SECTION 9 — DATABASE FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────

-- fn_disburse_loan — atomic disbursement + commission + ledger entry
-- Called exclusively from domains/loan-applications/service.js disburse().
-- Validates 90-day window, inserts stage entry, updates loan, inserts commission + ledger.
-- Returns JSONB with IDs for the service layer to create notifications.
CREATE OR REPLACE FUNCTION fn_disburse_loan(
  p_admin_profile_id  UUID,
  p_loan_id           UUID,
  p_disbursed_amount  NUMERIC,
  p_remarks           TEXT,
  p_stage_data        JSONB,
  p_ninety_day_days   INT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_loan            loan_applications%ROWTYPE;
  v_commission_rate NUMERIC(6,4);
  v_commission_amt  NUMERIC(14,2);
  v_commission_id   UUID;
  v_ledger_id       UUID;
  v_stage_entry_id  UUID;
  v_result          JSONB;
BEGIN
  -- 1. Lock + fetch
  SELECT * INTO v_loan FROM loan_applications WHERE id = p_loan_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Loan application not found';
  END IF;

  -- 2. Must be approved
  IF v_loan.status != 'approved' THEN
    RAISE EXCEPTION 'APPLICATION_TERMINAL: Loan is not in approved status (current: %)', v_loan.status;
  END IF;

  -- 3. Re-verify 90-day window
  IF v_loan.approved_at IS NOT NULL AND
     v_loan.approved_at < (NOW() - (p_ninety_day_days || ' days')::INTERVAL) THEN
    UPDATE loan_applications
      SET status = 'blocked_90d', blocked_90d_at = NOW(), updated_at = NOW()
      WHERE id = p_loan_id;
    RAISE EXCEPTION 'LIMIT_BLOCKED_90D: Approval window expired. Loan has been blocked. Re-approval required.';
  END IF;

  -- 4. Stage check
  IF v_loan.current_stage != 'approval' THEN
    RAISE EXCEPTION 'WRONG_STAGE: Expected stage approval before disbursement (current: %)', v_loan.current_stage;
  END IF;

  -- 5. Commission (dealer-linked files only)
  IF v_loan.dealer_id IS NOT NULL THEN
    v_commission_rate := CASE WHEN p_disbursed_amount > 1000000 THEN 0.0200 ELSE 0.0150 END;
    v_commission_amt  := ROUND(p_disbursed_amount * v_commission_rate, 2);

    INSERT INTO commissions
      (id, loan_application_id, dealer_id, disbursed_amount, rate_applied, amount, status)
    VALUES
      (gen_random_uuid(), p_loan_id, v_loan.dealer_id, p_disbursed_amount, v_commission_rate, v_commission_amt, 'earned')
    RETURNING id INTO v_commission_id;

    INSERT INTO wallet_ledger
      (id, dealer_id, entry_type, amount, commission_id, remarks, created_by_profile_id)
    VALUES
      (gen_random_uuid(), v_loan.dealer_id, 'commission_earned', v_commission_amt, v_commission_id,
       'Commission on disbursement of ' || p_loan_id, p_admin_profile_id)
    RETURNING id INTO v_ledger_id;
  END IF;

  -- 6. Stage entry
  INSERT INTO loan_stage_entries
    (id, loan_application_id, stage, entered_by_profile_id, outcome, remarks, data)
  VALUES
    (gen_random_uuid(), p_loan_id, 'disbursement', p_admin_profile_id, 'pass', p_remarks, p_stage_data)
  RETURNING id INTO v_stage_entry_id;

  -- 7. Update loan
  UPDATE loan_applications SET
    status           = 'disbursed',
    current_stage    = 'disbursement',
    disbursed_amount = p_disbursed_amount,
    approved_amount  = COALESCE(approved_amount, p_disbursed_amount),
    disbursed_at     = NOW(),
    updated_at       = NOW()
  WHERE id = p_loan_id;

  -- 8. Return for service layer (notifications + audit_log)
  v_result := jsonb_build_object(
    'stage_entry_id',    v_stage_entry_id,
    'commission_id',     v_commission_id,
    'commission_rate',   v_commission_rate,
    'commission_amount', v_commission_amt,
    'ledger_id',         v_ledger_id,
    'dealer_id',         v_loan.dealer_id,
    'staff_id',          v_loan.staff_id,
    'customer_id',       v_loan.customer_id
  );
  RETURN v_result;
END;
$$;


-- fn_re_approve_loan — clear blocked_90d back to approved (admin only)
CREATE OR REPLACE FUNCTION fn_re_approve_loan(
  p_admin_profile_id UUID,
  p_loan_id          UUID,
  p_remarks          TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_loan loan_applications%ROWTYPE;
BEGIN
  SELECT * INTO v_loan FROM loan_applications WHERE id = p_loan_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Loan application not found';
  END IF;

  IF v_loan.status != 'blocked_90d' THEN
    RAISE EXCEPTION 'APPLICATION_TERMINAL: Loan is not in blocked_90d status (current: %)', v_loan.status;
  END IF;

  UPDATE loan_applications SET
    status         = 'approved',
    approved_at    = NOW(),   -- reset window from today
    blocked_90d_at = NULL,
    updated_at     = NOW()
  WHERE id = p_loan_id;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 10 — SEED DATA
-- ─────────────────────────────────────────────────────────────────────

-- Lenders (identity + status only — rules live in domains/lenders/<code>/)
INSERT INTO lenders (id, name, code, lender_type, priority, is_active, notes) VALUES
  ('11111111-0000-0000-0000-000000000001', 'SK Finance',       'sk-finance',       'nbfc', 1, TRUE,  'Active launch partner. New + Used Car.'),
  ('11111111-0000-0000-0000-000000000002', 'ITI Finance',      'iti-finance',      'nbfc', 2, TRUE,  'Active launch partner. New + Used Car.'),
  ('11111111-0000-0000-0000-000000000003', 'Bajaj Finserv',    'bajaj-finserv',    'nbfc', 3, FALSE, 'Pending rule sheet (O2). Inactive until rules received.'),
  ('11111111-0000-0000-0000-000000000004', 'Mahindra Finance', 'mahindra-finance', 'nbfc', 4, FALSE, 'Pending rule sheet (O2). Inactive until rules received.'),
  ('11111111-0000-0000-0000-000000000005', 'Tata Capital',     'tata-capital',     'nbfc', 5, FALSE, 'Pending rule sheet (O2). Inactive until rules received.'),
  ('11111111-0000-0000-0000-000000000006', 'IndusInd Bank',    'indusind-bank',    'bank', 6, FALSE, 'Pending rule sheet (O2). Inactive until rules received.');

-- Platform settings
INSERT INTO settings (key, value, description) VALUES
  ('commission_slab',
   '{"threshold": 1000000, "rate_below": 0.015, "rate_above": 0.02}'::jsonb,
   'Dealer commission: 1.5% on disbursed ≤ ₹10,00,000; 2% above. Open item O1: confirm whole-amount vs marginal basis.'),
  ('ninety_day_window',
   '{"days": 90}'::jsonb,
   'J1: Files approved more than N days ago without disbursement are auto-blocked. Re-approval required.'),
  ('stale_draft_window',
   '{"days": 30}'::jsonb,
   'J2: Draft applications untouched for N days are auto-cancelled.'),
  ('withdrawal_reminder_hours',
   '{"hours": 48}'::jsonb,
   'J3: Admin is notified of withdrawal requests older than N hours still in ''requested'' status.');

-- Valuation slabs (in-house depreciation)
-- Formula: assessed_value = market_price × (1 − depreciation_pct / 100)
INSERT INTO valuation_slabs (vehicle_category, age_band, depreciation_pct) VALUES
  ('new_car', '0-1',  5.00),
  ('new_car', '1-3',  15.00),
  ('new_car', '3-5',  25.00),
  ('new_car', '5-7',  35.00),
  ('new_car', '7-10', 50.00),
  ('new_car', '10+',  65.00),
  ('used_car', '0-1',  8.00),
  ('used_car', '1-3',  18.00),
  ('used_car', '3-5',  28.00),
  ('used_car', '5-7',  40.00),
  ('used_car', '7-10', 55.00),
  ('used_car', '10+',  70.00),
  ('commercial_vehicle', '0-1',  10.00),
  ('commercial_vehicle', '1-3',  20.00),
  ('commercial_vehicle', '3-5',  33.00),
  ('commercial_vehicle', '5-7',  45.00),
  ('commercial_vehicle', '7-10', 60.00),
  ('commercial_vehicle', '10+',  75.00);


-- ─────────────────────────────────────────────────────────────────────
-- ADMIN PROFILE — MANUAL STEP (run AFTER creating the auth user)
-- ─────────────────────────────────────────────────────────────────────
-- 1. Go to Supabase Dashboard → Authentication → Users → Add user
--    Email: admin@shreeja.finance   Password: (set strong; change after first login)
-- 2. Copy the UUID of the created user.
-- 3. Replace '00000000-0000-0000-0000-000000000099' below with the real UUID.
-- 4. Uncomment the block and run just this INSERT.

/*
INSERT INTO profiles (auth_user_id, role, full_name, email, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000099',  -- ← REPLACE with real auth.users.id
  'admin',
  'Shreeja Admin',
  'admin@shreeja.finance',
  TRUE
);
*/


-- ─────────────────────────────────────────────────────────────────────
-- SETUP COMPLETE
-- Tables:  profiles, customers, dealers, staff, lenders,
--          eligibility_evaluations, loan_applications, loan_stage_entries,
--          documents, valuation_slabs, commissions, wallet_ledger,
--          withdrawal_requests, notifications, settings, audit_log
-- Functions: fn_disburse_loan, fn_re_approve_loan, fn_transition_commission_status
-- Seed:    6 lenders (2 active), 4 settings, 18 valuation_slabs
-- ─────────────────────────────────────────────────────────────────────
