-- =====================================================================
-- 0005_money.sql — Shreeja Finance Platform
-- Commission, wallet ledger, withdrawal requests
-- =====================================================================

-- ─── commissions ─────────────────────────────────────────────────────
-- One row per disbursed file that has a dealer.
-- APPEND-ONLY: status transitions via security-definer function only (no direct UPDATE allowed by any role).
-- Created atomically inside the disbursement transaction.
-- Slab (L7): 1.5% if disbursed_amount ≤ ₹10,00,000 / 2% if above
CREATE TABLE commissions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_application_id   UUID NOT NULL UNIQUE REFERENCES loan_applications(id) ON DELETE RESTRICT,
  dealer_id             UUID NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
  disbursed_amount      NUMERIC(14,2) NOT NULL,
  rate_applied          NUMERIC(6,4) NOT NULL,  -- 0.0150 or 0.0200
  amount                NUMERIC(14,2) NOT NULL, -- disbursed_amount * rate_applied
  status                commission_status NOT NULL DEFAULT 'earned',
  -- Populated when payout is processed
  paid_at               TIMESTAMPTZ,
  -- No updated_at — status transitions are service-layer only via security-definer
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Security-definer function to transition commission status (bypasses RLS for status update only)
-- Called exclusively by the admin payout service — no role has direct UPDATE on commissions.
CREATE OR REPLACE FUNCTION fn_transition_commission_status(
  p_commission_id UUID,
  p_new_status commission_status
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE commissions
  SET status = p_new_status,
      paid_at = CASE WHEN p_new_status = 'paid' THEN NOW() ELSE paid_at END
  WHERE id = p_commission_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commission % not found', p_commission_id;
  END IF;
END;
$$;

-- ─── wallet_ledger ───────────────────────────────────────────────────
-- APPEND-ONLY dealer ledger. Balance = SUM(amount).
-- Positive entries: commission_earned.
-- Negative entries: payout (admin records manual bank transfer).
-- Zero or signed entries: adjustment (corrections, audited).
CREATE TABLE wallet_ledger (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id             UUID NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
  entry_type            ledger_entry_type NOT NULL,
  amount                NUMERIC(14,2) NOT NULL,  -- positive = credit, negative = debit
  -- Linked source
  commission_id         UUID REFERENCES commissions(id) ON DELETE RESTRICT,  -- set for commission_earned
  -- Payout details (set for payout entries)
  payout_utr            TEXT,
  payout_date           DATE,
  -- Remarks & audit
  remarks               TEXT,
  created_by_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  -- No updated_at — append-only, never mutated
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── withdrawal_requests ─────────────────────────────────────────────
-- Dealer requests a withdrawal; admin processes it off-platform.
-- On processing: a payout ledger entry is created and ledger_entry_id is set.
CREATE TABLE withdrawal_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id             UUID NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
  amount_requested      NUMERIC(14,2) NOT NULL,
  status                withdrawal_status NOT NULL DEFAULT 'requested',
  -- Set when admin processes
  processed_by          UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  processed_at          TIMESTAMPTZ,
  rejection_reason      TEXT,
  -- FK to the payout wallet_ledger row created on approval
  ledger_entry_id       UUID REFERENCES wallet_ledger(id) ON DELETE RESTRICT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_withdrawal_requests
  BEFORE UPDATE ON withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
