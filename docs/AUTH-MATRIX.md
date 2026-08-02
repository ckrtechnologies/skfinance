# AUTH-MATRIX.md — Shreeja Finance Platform
**Version:** v2.0 · **Date:** 02 Aug 2026 · **Companions:** SCHEMA.md v2.0, API.md v2.0

Roles: **customer**, **dealer**, **staff** (one account serves Staff App *and* Staff Panel), **admin**.
Auth models (PRD L9): customer/dealer = phone OTP · staff = username+password · admin = email+password.
Every table has RLS; the matrix below is enforced twice — route guards in `shared/middleware` + RLS policies.

## Permission matrix

| Resource | Customer | Dealer | Staff | Admin |
|---|---|---|---|---|
| Own profile | R/W | R/W | R/W | R/W |
| Customers | own row R | create + R own-created | create + R own/assigned | R/W all |
| Loan applications | R own, W own drafts | C/R/W own-created (drafts) | C/R/W own+assigned | all |
| Stage entries | R own (public-safe fields) | R own files | **Append** (all stages except disbursement) + R | Append all incl. disbursement + re-approve |
| Documents | upload/R own | upload/R own files | upload/verify own+assigned | all |
| Eligibility evaluations | R own (triggered via own flows) | R own files | R own+assigned | R all |
| Lenders | — | R active | R active | R/W |
| Lender policies + policy_documents | engine-mediated only | R active | R active | R/W drafts, publish; **active = read-only for everyone** |
| Commissions | — | R own | **no grants** (L8) | R all + status transitions via payout flow |
| Wallet ledger | — | R own; no U/D | **no grants** (L8) | insert (payout/adjustment); no U/D |
| Withdrawal requests | — | C/R own | **no grants** (L8) | R all + process |
| Valuation slabs / settings | — | — | R | R/W (audited) |
| Notifications | R/mark-read own | same | same | same |
| Audit log | — | — | — | R (insert is service-layer only) |
| Staff accounts | — | — | R own | C/R/W |
| Dealer accounts | — | R own | R (for file context) | C/R/W |

## Hard rules

1. **Append-only enforcement is in the database, not just code:** no UPDATE/DELETE policies exist for any role on `loan_stage_entries`, `eligibility_evaluations`, `wallet_ledger`, `commissions` (status changes go through defined service transitions using a security-definer function), `audit_log`.
2. **Staff exclusion (L8):** staff role has zero grants on commissions/wallet/withdrawals — not "hidden in UI", absent at RLS level and absent from `api/staff-*` route surface.
3. **Dealer isolation:** every dealer-scoped policy filters `dealer_id = auth dealer`. The Dealer App must never render another dealer's data; if a response seems to include it, that's a backend bug — stop and flag.
4. **Customer-facing reads are field-filtered:** internal remarks, staff names, lender evaluation internals are stripped in the customer controllers (public-safe projection), independent of RLS.
5. **Disbursement is admin-only** — staff can append every other stage; the disbursement stage entry + commission creation happen only via `/admin/applications/:id/disburse`.
6. **Policy writes:** only admin, only on `status='draft'`; publishing is the single activation path; active/retired policies immutable.
7. Route guard order: authenticate → resolve role → role gate per this matrix → zod validate → domain service (which still runs under RLS).
