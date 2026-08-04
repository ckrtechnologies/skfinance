# JOBS.md — Shreeja Finance Platform
**Version:** v3.0 · **Date:** 02 Aug 2026 · **Companions:** SCHEMA.md v3.0, ARCHITECTURE.md v2.0
**Change from v2.0:** J4 (policy-effective-sweep) **removed** — no versioned/draft policy rows exist to activate or retire; lender rules are code, deployed directly.

All jobs live in `src/jobs/`, PM2 cron-scheduled, call domain services only, idempotent, never crash the process.

| # | Job | Schedule | What it does |
|---|---|---|---|
| J1 | `j1-auto-block-90days.js` | Daily 00:30 IST | Unchanged from v2.0 — scans approved files past the 90-day window, blocks, notifies. |
| J2 | `j2-stale-draft-cleanup.js` | Daily 01:00 IST | Unchanged from v2.0. |
| J3 | `j3-withdrawal-reminder.js` | Daily 09:00 IST | Unchanged from v2.0. |
| ~~J4~~ | ~~`j4-policy-effective-sweep.js`~~ | — | **Removed.** No longer applicable — see ARCHITECTURE.md v2.0 §4. |

**Rule-version tracking note (replaces J4's role):** since rules are now code, "what changed and when" is tracked via each lender module's `RULES_VERSION` string (bumped in the commit that changes the rule) plus normal deploy history — not a scheduled job. If Prateek needs a formal changelog of rule changes over time, that's better served by a lightweight `CHANGELOG.md` per lender module (updated in the same PR as the rule change) than by a job — worth adding if audit requests become frequent (ties to Open Item O6, the rule-change process).
