# SCHEMA.md — Shreeja Finance Platform
**Version:** v3.0 · **Date:** 02 Aug 2026 · **Companions:** PRD.md v3.0, ARCHITECTURE.md v2.0
**Change from v2.0:** `lender_policies`, `policy_documents` tables **removed**. `lenders` simplified. `eligibility_evaluations` now references `lender_code` + `rules_version` (a string, not a policy FK). All other tables unchanged from v2.0.

---

## 1. Enums — unchanged from v2.0, minus `policy_status` (no longer needed)

`user_role`, `product_type`, `loan_stage`, `application_status`, `evaluation_result`, `commission_status`, `ledger_entry_type`, `withdrawal_status`, `customer_type` — all unchanged.

## 2. Tables

### Identity & parties — unchanged from v2.0
`profiles`, `customers`, `dealers`, `staff` — no changes.

### Lenders (simplified — v3.0)

| Table | Purpose | Key columns |
|---|---|---|
| `lenders` | NBFC/bank partners, identity + operational status only | `name`, `code` (unique, matches the `domains/lenders/<code>/` folder name), `lender_type`, contact fields, `priority` (int, admin-editable), `is_active` (admin-editable), `logo_url`. **No policy/rule columns — rules live in code.** |
| `eligibility_evaluations` | **Append-only.** One row per evaluation attempt per lender | `loan_application_id` FK, `lender_code` (matches the module that ran, not a FK to a policy table), `rules_version` (string exported by that lender's module, e.g. `"sk-v1.2"` — bumped whenever the code changes, so this row is still permanently traceable to exactly which rule set evaluated it), `stage` (pre_check/full), `result evaluation_result`, `failed_rules jsonb`, `missing_items jsonb`, `evaluated_at`. |

**Removed from v2.0:** `lender_policies`, `policy_documents`. Their content now lives as constants/functions inside `domains/lenders/<code>/rules.js` and `documents.js` — see ARCHITECTURE.md v2.0 §2.

**Audit note:** since rules are code, not DB rows, the audit trail for "what rule set was active when" is `rules_version` (bumped per change) plus the deploy history (git log / CI deploy record) rather than a DB row with `effective_from`/`effective_to`. Document this mapping once in JOBS.md/DEPLOYMENT.md so a future audit request has a clear answer.

### Loan pipeline, money, platform tables — unchanged from v2.0
`loan_applications`, `loan_stage_entries`, `documents`, `valuation_slabs`, `commissions`, `wallet_ledger`, `withdrawal_requests`, `notifications`, `settings`, `audit_log` — all unchanged, see v2.0 SCHEMA.md content for full column detail (unaffected by this rework).

## 3. RLS summary (revised)

- `lenders`: read for all authenticated roles (active + priority visible so apps can rank); **write (active/priority only) admin-only**. No role can write rule content because no rule content exists in this table.
- `eligibility_evaluations`: unchanged — insert + select only, no update/delete for any role.
- All other RLS unchanged from v2.0.

## 4. Indexes (revised)

- `lenders(is_active, priority)` — orchestrator's lookup of which lender modules to call
- `eligibility_evaluations(loan_application_id)`, `eligibility_evaluations(lender_code, rules_version)` — for auditing which version evaluated a file
- All other indexes from v2.0 unchanged (loan pipeline, wallet, audit log)

## 5. Migration & seed plan (revised)

1. `0001_enums.sql` → `0002_identity.sql` → `0003_lenders.sql` (simplified) → `0004_pipeline.sql` → `0005_money.sql` → `0006_platform.sql` → `0007_rls.sql` → `0008_indexes.sql`
2. `seed.sql`: 6 lender rows (SK + ITI active, 4 inactive placeholders — identity/status only, no policy data), products, commission slab setting, 90-day setting, valuation slabs, document master, one admin account.
3. **No policy seed step** — SK Finance and ITI Finance rules ship as part of the `domains/lenders/sk-finance/` and `domains/lenders/iti-finance/` code, not as seeded rows.
