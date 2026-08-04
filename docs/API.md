# API.md — Shreeja Finance Platform
**Version:** v3.0 · **Date:** 02 Aug 2026 · **Companions:** ARCHITECTURE.md v2.0, SCHEMA.md v3.0, AUTH-MATRIX.md v3.0
**Change from v2.0:** Admin lender-policy CRUD/publish endpoints **removed**. Replaced with a read-only rules-reference endpoint and a narrowed lender-settings endpoint. Customer/Dealer/Staff-facing endpoints unchanged — same request/response shapes, since the eligibility check contract didn't change, only its backend implementation.

Conventions (base URL, response shape, auth, pagination, error codes) — unchanged from v2.0 §"Conventions".

---

## 1. Shared auth — unchanged from v2.0 §1

## 2. `api/customer-app` — unchanged from v2.0 §2
All endpoints (`pre-check`, `applications`, `documents`, `checklist`, `evaluate`, `submit`, list/detail, notifications, profile) keep identical request/response shapes. `pre-check` and `evaluate` now internally call the orchestrator over hardcoded lender modules instead of policy data — invisible to the caller.

## 3. `api/dealer-app` — unchanged from v2.0 §3

## 4. `api/staff-app` and `api/staff-panel` — unchanged from v2.0 §4

## 5. `api/admin-panel` — revised lender section

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/dashboard`, `/admin/applications`, `/:id`, stage-entries, `/disburse`, `/re-approve` | Unchanged from v2.0 |
| GET | `/admin/lenders` | Lender list — identity, `is_active`, `priority` only |
| PATCH | `/admin/lenders/:id` | **Narrowed**: accepts only `{ is_active?, priority? }`. Any other field → `VALIDATION_ERROR`. |
| **GET `/admin/lenders/:code/rules`** (new) | Returns the read-only rules summary exported by that lender's module (`domains/lenders/:code/rules.js` → `getRulesSummary()`) — min/max age, CIBIL, LTV, document lists, guarantor conditions, `rules_version`. Powers Screen A6. |
| ~~POST/PATCH `/admin/lenders/:id/policies`~~ | **Removed.** No endpoint creates, edits, or publishes a policy. |
| ~~POST `/admin/policies/:id/publish`~~ | **Removed.** |
| ~~GET `/admin/policies/:id/preview`~~ | **Removed** — superseded by the rules-reference endpoint above, which is always "current," not draft/preview. |
| GET | `/admin/dealers`, `/staff`, `/commissions`, `/withdrawal-requests`, `/settings`, `/audit-log`, `/notifications` | Unchanged from v2.0 |
| POST | `/admin/withdrawal-requests/:id/process`, `/admin/wallet-adjustments` | Unchanged from v2.0 |

## 6. Engine contract (internal, revised)

`domains/eligibility-engine/orchestrator.js`:
```
evaluate(applicantInput, { stage }) →
  for each active lender (from `lenders` table, is_active=true, ordered by priority):
    result = require(`domains/lenders/${lender.code}/evaluate.js`).evaluate(applicantInput)
    append eligibility_evaluations row { lender_code, rules_version: result.rules_version, ...result }
  return ranked list
```
Each lender module's `evaluate(applicantInput)` is a pure function: same shape in, same shape out, no shared generic interpreter. See ARCHITECTURE.md v2.0 §2 for the fixed interface every module must implement.

## 7. Jobs surface — revised
No public endpoints. J1 (90-day auto-block), J2 (stale draft cleanup), J3 (withdrawal reminder) unchanged from v2.0. **J4 (policy-effective-sweep) removed** — no versioned/draft policy rows exist anymore to activate or retire.
