-- =====================================================================
-- 0008_indexes.sql — Shreeja Finance Platform
-- Performance indexes (minimum set per SCHEMA.md §4)
-- =====================================================================

-- ─── loan_applications ───────────────────────────────────────────────
-- J1 job scan: approved files past the 90-day window
CREATE INDEX idx_loan_apps_approved_at
  ON loan_applications(approved_at)
  WHERE status = 'approved';

-- Status + stage filtering (dashboard, admin filters)
CREATE INDEX idx_loan_apps_status_stage
  ON loan_applications(status, current_stage);

-- Dealer isolation (every dealer query filters on this)
CREATE INDEX idx_loan_apps_dealer_id
  ON loan_applications(dealer_id);

-- Staff assigned files
CREATE INDEX idx_loan_apps_staff_id
  ON loan_applications(staff_id);

-- Customer's own files
CREATE INDEX idx_loan_apps_customer_id
  ON loan_applications(customer_id);

-- Human-readable number lookups
CREATE INDEX idx_loan_apps_application_no
  ON loan_applications(application_no);

-- ─── lender_policies ─────────────────────────────────────────────────
-- Engine pre-filter: amount/age/CIBIL numeric bounds
CREATE INDEX idx_lender_policies_engine_prefilter
  ON lender_policies(lender_id, product_type, status, min_loan_amount, max_loan_amount, min_age, max_age, min_cibil);

-- Active-policy lookup per lender × product (partial index, tiny)
CREATE INDEX idx_lender_policies_active
  ON lender_policies(lender_id, product_type)
  WHERE status = 'active';

-- ─── eligibility_evaluations ─────────────────────────────────────────
CREATE INDEX idx_eligibility_evals_loan_app
  ON eligibility_evaluations(loan_application_id);

CREATE INDEX idx_eligibility_evals_policy
  ON eligibility_evaluations(lender_policy_id);

-- ─── wallet_ledger ───────────────────────────────────────────────────
-- Dealer's ledger, newest first (common query pattern)
CREATE INDEX idx_wallet_ledger_dealer_created
  ON wallet_ledger(dealer_id, created_at DESC);

-- ─── audit_log ───────────────────────────────────────────────────────
-- Filterable by entity + entity_id (admin audit trail)
CREATE INDEX idx_audit_log_entity
  ON audit_log(entity, entity_id);

-- Recent actions by actor
CREATE INDEX idx_audit_log_actor
  ON audit_log(actor_profile_id, created_at DESC);

-- ─── loan_stage_entries ──────────────────────────────────────────────
CREATE INDEX idx_stage_entries_loan_app
  ON loan_stage_entries(loan_application_id, created_at ASC);

-- ─── notifications ───────────────────────────────────────────────────
-- Already covered by partial index in 0006_platform.sql:
--   idx_notifications_profile_unread ON notifications(profile_id, created_at DESC) WHERE read_at IS NULL
-- Additional: all notifications per profile (for history)
CREATE INDEX idx_notifications_profile_all
  ON notifications(profile_id, created_at DESC);

-- ─── commissions ─────────────────────────────────────────────────────
CREATE INDEX idx_commissions_dealer_id
  ON commissions(dealer_id);

CREATE INDEX idx_commissions_status
  ON commissions(status);

-- ─── withdrawal_requests ─────────────────────────────────────────────
-- J3 job scans requests older than 48h in 'requested' status
CREATE INDEX idx_withdrawal_requests_pending
  ON withdrawal_requests(created_at)
  WHERE status = 'requested';

-- ─── documents ───────────────────────────────────────────────────────
CREATE INDEX idx_documents_loan_app
  ON documents(loan_application_id);

-- ─── policy_documents ────────────────────────────────────────────────
CREATE INDEX idx_policy_documents_policy
  ON policy_documents(policy_id);
