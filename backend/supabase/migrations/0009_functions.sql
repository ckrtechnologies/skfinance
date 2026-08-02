-- =====================================================================
-- 0009_functions.sql — Shreeja Finance Platform
-- Postgres functions called via supabase.rpc() from the service layer.
-- These wrap multi-step operations that must be atomic.
-- =====================================================================

-- ─── fn_disburse_loan ────────────────────────────────────────────────
-- Called ONLY from domains/loan-applications/service.js disburse().
-- Atomically:
--   1. Validates 90-day window (re-check, never trust J1 alone)
--   2. Inserts loan_stage_entries (disbursement)
--   3. Sets loan_applications status=disbursed, disbursed_amount, disbursed_at
--   4. Inserts commissions row (slab: 1.5% ≤ 1,000,000 / 2% above)
--   5. Inserts wallet_ledger commission_earned row
--   6. Returns inserted commission details for notification creation
--
-- Notification rows are created by the service layer AFTER this function
-- returns (not inside the function — keeps DB logic focused).
--
-- p_admin_profile_id: the admin performing disbursement
-- p_loan_id:          loan_applications.id
-- p_disbursed_amount: numeric (must be > 0)
-- p_remarks:          stage entry remarks
-- p_stage_data:       jsonb { disbursed_to, utr, bank_name }
-- p_ninety_day_days:  value read from settings at service layer
CREATE OR REPLACE FUNCTION fn_disburse_loan(
  p_admin_profile_id    UUID,
  p_loan_id             UUID,
  p_disbursed_amount    NUMERIC,
  p_remarks             TEXT,
  p_stage_data          JSONB,
  p_ninety_day_days     INT
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
  -- 1. Lock + fetch the loan row
  SELECT * INTO v_loan
    FROM loan_applications
    WHERE id = p_loan_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Loan application not found';
  END IF;

  -- 2. Must be in 'approved' status
  IF v_loan.status != 'approved' THEN
    RAISE EXCEPTION 'APPLICATION_TERMINAL: Loan is not in approved status (current: %)', v_loan.status;
  END IF;

  -- 3. Re-verify 90-day window
  IF v_loan.approved_at IS NOT NULL AND
     v_loan.approved_at < (NOW() - (p_ninety_day_days || ' days')::INTERVAL) THEN
    -- Auto-block it now (J1 may have missed it)
    UPDATE loan_applications
      SET status = 'blocked_90d', blocked_90d_at = NOW(), updated_at = NOW()
      WHERE id = p_loan_id;

    RAISE EXCEPTION 'LIMIT_BLOCKED_90D: Approval window expired. Loan has been blocked. Re-approval required.';
  END IF;

  -- 4. Stage must be at 'approval' (preceding disbursement)
  IF v_loan.current_stage != 'approval' THEN
    RAISE EXCEPTION 'WRONG_STAGE: Expected stage approval before disbursement (current: %)', v_loan.current_stage;
  END IF;

  -- 5. Calculate commission (only if a dealer is linked)
  IF v_loan.dealer_id IS NOT NULL THEN
    v_commission_rate := CASE WHEN p_disbursed_amount > 1000000 THEN 0.0200 ELSE 0.0150 END;
    v_commission_amt  := ROUND(p_disbursed_amount * v_commission_rate, 2);

    -- Insert commission
    INSERT INTO commissions (id, loan_application_id, dealer_id, disbursed_amount, rate_applied, amount, status)
    VALUES (gen_random_uuid(), p_loan_id, v_loan.dealer_id, p_disbursed_amount, v_commission_rate, v_commission_amt, 'earned')
    RETURNING id INTO v_commission_id;

    -- Insert wallet_ledger commission_earned
    INSERT INTO wallet_ledger (id, dealer_id, entry_type, amount, commission_id, remarks, created_by_profile_id)
    VALUES (gen_random_uuid(), v_loan.dealer_id, 'commission_earned', v_commission_amt, v_commission_id,
            'Commission on disbursement of ' || p_loan_id, p_admin_profile_id)
    RETURNING id INTO v_ledger_id;
  END IF;

  -- 6. Insert stage entry (disbursement)
  INSERT INTO loan_stage_entries (id, loan_application_id, stage, entered_by_profile_id, outcome, remarks, data)
  VALUES (gen_random_uuid(), p_loan_id, 'disbursement', p_admin_profile_id, 'pass', p_remarks, p_stage_data)
  RETURNING id INTO v_stage_entry_id;

  -- 7. Update loan_applications
  UPDATE loan_applications SET
    status            = 'disbursed',
    current_stage     = 'disbursement',
    disbursed_amount  = p_disbursed_amount,
    disbursed_at      = NOW(),
    updated_at        = NOW()
  WHERE id = p_loan_id;

  -- 8. Return result for service layer (notifications + audit_log)
  v_result := jsonb_build_object(
    'stage_entry_id',   v_stage_entry_id,
    'commission_id',    v_commission_id,
    'commission_rate',  v_commission_rate,
    'commission_amount',v_commission_amt,
    'ledger_id',        v_ledger_id,
    'dealer_id',        v_loan.dealer_id,
    'staff_id',         v_loan.staff_id,
    'customer_id',      v_loan.customer_id
  );

  RETURN v_result;
END;
$$;


-- ─── fn_re_approve_loan ───────────────────────────────────────────────
-- Clears blocked_90d status back to approved. Admin-only.
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
    status        = 'approved',
    approved_at   = NOW(),    -- reset window from today
    blocked_90d_at = NULL,
    updated_at    = NOW()
  WHERE id = p_loan_id;
END;
$$;
