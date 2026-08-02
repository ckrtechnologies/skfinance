# API.md — Shreeja Finance Platform
**Version:** v2.0 · **Date:** 02 Aug 2026 · **Companions:** ARCHITECTURE.md v1.0, SCHEMA.md v2.0, AUTH-MATRIX.md v2.0

Grouped by backend `api/<deliverable>/` folder (ARCHITECTURE.md L-ARCH-1). Frontends must not invent endpoints/fields not listed here — missing something = stop and ask (AGENTS.md).

**Conventions**
- Base: `https://api.<domain>/v1`
- Response shape: `{ success: boolean, data?: T, error?: { code: string, message: string } }`
- Auth: Bearer JWT (Supabase session). Role enforced per AUTH-MATRIX.md + RLS.
- Mutations validated with `zod` in the controller before any domain call.
- Pagination: `?page=&limit=` → `data: { items, total, page, limit }`.
- Error codes include: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `WRONG_STAGE`, `APPLICATION_TERMINAL`, `LIMIT_BLOCKED_90D`, `POLICY_NOT_ACTIVE`, `DUPLICATE_REQUEST`.

---

## 1. Shared auth (`api/*/auth`)

| Method | Path | Used by | Notes |
|---|---|---|---|
| POST | `/auth/otp/request` | Customer, Dealer | `{ phone }` → OTP via provider (O4) |
| POST | `/auth/otp/verify` | Customer, Dealer | `{ phone, otp }` → session |
| POST | `/auth/login` | Staff (app+panel), Admin | `{ username\|email, password }` → session |
| POST | `/auth/logout` | All | — |
| GET | `/auth/me` | All | profile + role |

## 2. `api/customer-app`

| Method | Path | Purpose |
|---|---|---|
| POST | `/customer/eligibility/pre-check` | Stage-1: `{ age, amount, cibil_band, customer_type, address_type, co_applicant_relation? , product_type }` → per-lender pre-verdicts (writes `eligibility_evaluations` stage=pre_check) |
| POST | `/customer/applications` | Create draft application from pre-check |
| PATCH | `/customer/applications/:id` | Multi-step form saves (draft only) |
| POST | `/customer/applications/:id/documents` | Upload doc (multipart) against policy checklist |
| GET | `/customer/applications/:id/checklist` | Required docs, derived from candidate lender policies |
| POST | `/customer/applications/:id/evaluate` | Stage-2 full evaluation → per-lender verdicts (append) |
| POST | `/customer/applications/:id/submit` | Locks draft → in_progress |
| GET | `/customer/applications` | Own applications list |
| GET | `/customer/applications/:id` | Detail + stage timeline (public-safe fields only — no internal remarks/staff names) |
| GET | `/customer/notifications` · POST `/customer/notifications/:id/read` | In-app notifications |
| GET/PATCH | `/customer/profile` | Profile |

## 3. `api/dealer-app`

| Method | Path | Purpose |
|---|---|---|
| GET | `/dealer/dashboard` | KPIs: active files, disbursed MTD, wallet balance |
| POST | `/dealer/leads` | Create customer + lead; runs pre-check; returns verdicts |
| POST | `/dealer/applications` (+ PATCH/:id, documents, evaluate, submit — same shapes as customer §2) | Dealer files on customer's behalf |
| GET | `/dealer/applications` · GET `/dealer/applications/:id` | Own files only (RLS) + evaluations + timeline |
| GET | `/dealer/commissions` | Own commissions with status |
| GET | `/dealer/wallet` | Balance + ledger (paginated) |
| POST | `/dealer/wallet/withdrawal-requests` | `{ amount }` → requested (validates ≤ balance) |
| GET | `/dealer/wallet/withdrawal-requests` | Own requests + status |
| GET | `/dealer/notifications` · read · GET/PATCH `/dealer/profile` | As above |

## 4. `api/staff-app` and `api/staff-panel` (identical contract, two mounts)

| Method | Path | Purpose |
|---|---|---|
| GET | `/staff/dashboard` | Files by stage, performance snapshot |
| POST | `/staff/leads` · applications CRUD (as §3) | Staff-created files |
| GET | `/staff/applications` · `/:id` | Own + assigned files |
| POST | `/staff/applications/:id/stage-entries` | **Append** stage entry `{ stage, outcome, remarks, data }`. Service enforces stage order, `WRONG_STAGE`, `APPLICATION_TERMINAL`, and (for disbursement attempts) is admin-only → `FORBIDDEN` here |
| GET | `/staff/performance` | Files added, disbursed, conversion, monthly |
| GET | `/staff/notifications` · read · GET/PATCH `/staff/profile` | As above |

**No commission/wallet endpoints exist under these mounts** (L8 — enforced by absence).

## 5. `api/admin-panel`

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/dashboard` | Network KPIs incl. 90-day-risk files |
| GET | `/admin/applications` · `/:id` | All files, full detail (docs, evaluations, timeline, audit) |
| POST | `/admin/applications/:id/stage-entries` | Append any stage entry |
| POST | `/admin/applications/:id/disburse` | `{ disbursed_amount, remarks }` — transaction: re-verify 90-day window at write time (never trust J1 alone) → stage entry + status=disbursed + create `commissions` row (slab: 1.5% ≤ ₹10,00,000 / 2% above) + `wallet_ledger` commission_earned + notifications, atomically |
| POST | `/admin/applications/:id/re-approve` | Clears blocked_90d after review (audited) |
| GET/POST | `/admin/lenders` · PATCH `/admin/lenders/:id` | Lender master, priority, active toggle |
| GET/POST | `/admin/lenders/:id/policies` | Create **draft** policy (form B–H payload incl. `policy_documents`, `ownership_proof_rules`, `conditional_rules`) |
| PATCH | `/admin/policies/:id` | Edit draft only — `POLICY_NOT_ACTIVE` guard |
| POST | `/admin/policies/:id/publish` | Activate: sets previous version `effective_to`+retired, this one active. Never edit-in-place (L11) |
| GET | `/admin/policies/:id/preview` | Human-readable summary (A10) |
| GET | `/admin/dealers` · `/:id` (+ files, ledger) · PATCH | Dealer management |
| GET/POST | `/admin/staff` · PATCH `/admin/staff/:id` | Staff accounts (create/disable) |
| GET | `/admin/commissions` | All, filter by status/dealer |
| GET | `/admin/withdrawal-requests` | Queue |
| POST | `/admin/withdrawal-requests/:id/process` | `{ payout_utr, payout_date, amount }` → transaction: `wallet_ledger` payout row (negative) + request processed + commission → paid + audit |
| POST | `/admin/wallet-adjustments` | `{ dealer_id, amount, remarks }` → adjustment ledger row (audited) |
| GET/PATCH | `/admin/settings` | Slabs, 90-day window, valuation slabs, doc master (every change audited) |
| GET | `/admin/audit-log` | Filterable |
| GET | `/admin/notifications` · read | As above |

## 6. Engine contract (internal, `domains/eligibility-engine`)

`evaluate(profileInput, { stage }) → [{ lender_id, lender_policy_id, result, failed_rules[], missing_items[], rank }]`
- Pre-filters lenders via indexed SQL (amount/age/CIBIL bounds), then runs jsonb `conditional_rules` through `rule-evaluator.js`.
- Every call appends `eligibility_evaluations` rows pinning `lender_policy_id`.
- Ranking: lender `priority` asc among eligible.

## 7. Jobs surface

No public endpoints. J1 (90-day auto-block) runs via PM2 cron calling `domains/loan-applications` service — see JOBS.md.
