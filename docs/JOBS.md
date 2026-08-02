# JOBS.md — Shreeja Finance Platform
**Version:** v2.0 · **Date:** 02 Aug 2026 · **Companions:** SCHEMA.md v2.0, ARCHITECTURE.md v1.0

All jobs live in `src/jobs/`, are PM2 cron-scheduled, call **domain services only** (never raw SQL), are idempotent, and never crash the process on failure — errors log + write an `audit_log` row and the job exits cleanly.

| # | Job | Schedule | What it does |
|---|---|---|---|
| J1 | `j1-auto-block-90days.js` | Daily 00:30 IST | Scans `loan_applications` where `status='approved'` and `approved_at < now() - ninety_day_window` (window read from `settings`, default 90 days). Sets `status='blocked_90d'`, appends an audit row, creates in-app notifications for the file's dealer/staff and admin. Re-approval only via `/admin/applications/:id/re-approve`. **The disbursement endpoint independently re-verifies the window at write time — J1 is a sweep, not the guard.** |
| J2 | `j2-stale-draft-cleanup.js` | Daily 01:00 IST | Marks customer/dealer draft applications untouched for 30 days as `cancelled` (append audit row + notification). Configurable via `settings`. |
| J3 | `j3-withdrawal-reminder.js` | Daily 09:00 IST | Notifies admin of withdrawal requests older than 48h still in `requested`. |
| J4 | `j4-policy-effective-sweep.js` | Daily 00:15 IST | Activates draft policies whose `effective_from` has arrived when flagged for auto-activate; retires policies whose `effective_to` has passed; audit row per transition. Keeps the engine's "active policy" query trivially correct. |

**Rules**
- Every job run writes a start/finish `audit_log` pair (`action: job_run`) with counts affected — zero-count runs included, so silence is detectable.
- Jobs read config from `settings` at run time — no hardcoded windows.
- A job must be safely re-runnable within the same day (idempotent WHERE clauses; J1 re-run finds nothing new to block).
- No job sends SMS/push — notifications are in-app rows only (PRD scope).
