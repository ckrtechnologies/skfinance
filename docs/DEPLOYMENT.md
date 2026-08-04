# DEPLOYMENT.md — Shreeja Finance Platform
**Version:** v3.0 · **Date:** 02 Aug 2026 · **Companion:** ARCHITECTURE.md v2.0
**Change from v2.0:** none to topology/repos/CI — this rework is entirely inside `shreeja-backend`'s `domains/lenders/`. One addition below on deploying lender rule changes.

## Topology, environments, repos, secrets, ops runbook — unchanged from v2.0

See v2.0 DEPLOYMENT.md content in full — CKR VPS, Nginx, PM2, three subdomains, dev/prod Supabase separation, per-repo table, secrets gateway, health checks, backups. None of it changes as a result of the lender-rules rework.

## New: deploying a lender rule change

Since rule changes now ship as code (ARCHITECTURE.md v2.0 §2–4), the standard deploy flow applies directly — no special process needed:

1. Change the relevant `domains/lenders/<code>/rules.js` / `evaluate.js`, bump `RULES_VERSION`.
2. Add/update a unit test for the changed rule (a fixed applicant input → expected verdict) — this is the safety net that replaces the old admin-form validation.
3. PR review → merge → standard deploy (`git pull` → `npm ci` → `pm2 reload shreeja-api`).
4. Confirm the change is visible on Admin Panel's Lender Rules Reference (A6) — this is also the client-facing proof that the requested change shipped.

Worth formalizing as a short internal runbook once Open Item O6 (rule-change process/SLA) is resolved with Prateek.
