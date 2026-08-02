-- =====================================================================
-- 0006_platform.sql — Shreeja Finance Platform
-- Platform tables: notifications, settings (singleton config), audit_log
-- =====================================================================

-- ─── notifications ───────────────────────────────────────────────────
-- In-app only. No push/SMS in v1 (PRD scope exclusion).
-- link_type + link_id: deep-link context (e.g. 'loan_application', <uuid>)
CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  link_type     TEXT,           -- e.g. 'loan_application', 'withdrawal_request'
  link_id       UUID,           -- entity ID the notification links to
  read_at       TIMESTAMPTZ,   -- null = unread
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at: read_at is the only mutable field; use a dedicated endpoint
);

-- Allow efficient "my unread notifications" query
CREATE INDEX idx_notifications_profile_unread
  ON notifications(profile_id, created_at DESC)
  WHERE read_at IS NULL;

-- ─── settings ────────────────────────────────────────────────────────
-- Singleton configuration rows. Admin-editable via /admin/settings.
-- Every change is audited via audit_log (enforced in service layer).
-- Known keys:
--   commission_slab           → { "threshold": 1000000, "rate_below": 0.015, "rate_above": 0.02 }
--   ninety_day_window         → { "days": 90 }
--   stale_draft_window        → { "days": 30 }
--   withdrawal_reminder_hours → { "hours": 48 }
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
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─── audit_log ───────────────────────────────────────────────────────
-- APPEND-ONLY system-wide audit trail. Written only by service layer.
-- No role may update or delete rows (enforced by RLS in 0007_rls.sql).
-- action examples: stage_entry_created, commission_created, payout_processed,
--                  policy_published, setting_changed, job_run, re_approval
CREATE TABLE audit_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_profile_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- null for job runs
  action            TEXT NOT NULL,
  entity            TEXT NOT NULL,   -- table/domain name e.g. 'loan_applications'
  entity_id         UUID,            -- FK to entity row (not enforced — entity may be any table)
  detail            JSONB NOT NULL DEFAULT '{}',
  -- No updated_at — append-only
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
