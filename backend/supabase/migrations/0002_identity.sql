-- =====================================================================
-- 0002_identity.sql — Shreeja Finance Platform
-- Identity & party tables: profiles, customers, dealers, staff
-- =====================================================================

-- Helper: auto-updated updated_at trigger function
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── profiles ────────────────────────────────────────────────────────
-- One row per Supabase Auth user. Role is set at account creation time.
CREATE TABLE profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role            user_role NOT NULL,
  full_name       TEXT NOT NULL,
  phone           TEXT,                         -- nullable for admin (email login)
  email           TEXT,                         -- nullable for customer/dealer (OTP login)
  avatar_url      TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─── customers ───────────────────────────────────────────────────────
CREATE TABLE customers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  dob               DATE,
  customer_type     customer_type,
  cibil_score       INT,                        -- -1 = no CIBIL / NTC; null = unknown yet
  -- Address
  address_line1     TEXT,
  address_line2     TEXT,
  city              TEXT,
  state             TEXT,
  pincode           TEXT,
  address_type      TEXT CHECK (address_type IN ('owned', 'rental')),
  -- Home-town (for conditional rules)
  hometown_city     TEXT,
  hometown_state    TEXT,
  hometown_pincode  TEXT,
  -- Co-applicant info (nullable — added during application flow)
  co_applicant_name       TEXT,
  co_applicant_relation   TEXT,
  co_applicant_dob        DATE,
  co_applicant_income     NUMERIC(14,2),
  -- PAN (stored for lender submission; not validated via API in v1)
  pan_number        TEXT,
  -- Metadata
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_customers
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─── dealers ─────────────────────────────────────────────────────────
CREATE TABLE dealers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  dealer_code       TEXT NOT NULL UNIQUE,       -- e.g. DLR-001
  -- KYC
  pan_number        TEXT,
  gst_number        TEXT,
  -- Business info
  business_name     TEXT,
  business_address  TEXT,
  city              TEXT,
  state             TEXT,
  pincode           TEXT,
  -- Bank details (for manual payout reference)
  bank_account_name     TEXT,
  bank_account_number   TEXT,
  bank_ifsc             TEXT,
  bank_name             TEXT,
  -- Status
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at         DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_dealers
  BEFORE UPDATE ON dealers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─── staff ───────────────────────────────────────────────────────────
-- Staff App + Staff Panel share the same account (same profile row)
CREATE TABLE staff (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  staff_code        TEXT NOT NULL UNIQUE,       -- e.g. STF-001
  designation       TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at         DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_staff
  BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
