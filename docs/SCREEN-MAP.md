# SCREEN-MAP.md — Shreeja Finance Platform
**Version:** v2.0 · **Date:** 02 Aug 2026 · **Companion:** PRD.md v2.0
**Rule:** build only what is listed here. New screens mid-project = change request, priced by blast radius.

Sheets/modals and result/edge screens count as screens. Every data-fetching screen implements loading / empty / error / offline states (DESIGN.md §4) — not listed per-row.

---

## 1. Customer App (React Native)

| # | Screen | Purpose | Entry point | Data in/out |
|---|---|---|---|---|
| C1 | Splash | Logo + session check, route to C2/C4 | App launch | session token → |
| C2 | Onboarding (3 slides) | Explain: check eligibility → apply → track | First launch | — |
| C3 | Login (Phone OTP) | Phone entry → OTP verify | C1/C2 | phone → OTP verify → session |
| C4 | Home | Products (New/Used Car, CV), start eligibility, active application card | Post-login | active loan summary ← |
| C5 | Quick Eligibility Check | Stage-1 pre-check: 6–8 questions (age, amount, CIBIL band, income type, residence, co-applicant availability) | C4 | answers → per-lender pre-verdict ← |
| C6 | Eligibility Result | Per-lender verdict list (eligible / not / incomplete + reasons) | C5 | evaluation ← |
| C7 | Loan Application Form (multi-step) | Applicant details, vehicle details, co-applicant details | C6 "Proceed" | form data → |
| C8 | Document Upload | Checklist-driven uploads per applicant/co-applicant/guarantor (checklist from matched lender policy) | C7 | files → storage; checklist ← |
| C9 | Full Eligibility Result | Stage-2 verdict after data+docs; shows submit-ready lenders | C8 | evaluation ← |
| C10 | Application Submitted | Confirmation + application ID | C9 | — |
| C11 | Application Status / Timeline | Six-stage pipeline view with current stage, dates | C4 card / C10 | stage entries ← |
| C12 | Notifications | In-app notification list | Header bell | notifications ← |
| C13 | Profile & Settings | Personal details, logout | Tab | profile ←→ |

*Locked:* onboarding kept (consumer app, new concept). No payment screens (L6).

## 2. Dealer App (React Native)

| # | Screen | Purpose | Entry point | Data in/out |
|---|---|---|---|---|
| D1 | Splash | Session check | Launch | — |
| D2 | Login (Phone OTP) | Dealer auth | D1 | phone → session |
| D3 | Dashboard | KPIs: active files, disbursed this month, wallet balance | Post-login | aggregates ← |
| D4 | Add Customer / New Lead | Capture customer basics, run quick eligibility (C5 equivalent) | D3 | lead → verdict ← |
| D5 | Lead → Full Application | Same multi-step form + doc upload as C7–C8, filled by dealer on customer's behalf | D4 | form + files → |
| D6 | My Files List | All own loan files, filter by stage/status | Tab | files ← |
| D7 | File Detail / Timeline | Six-stage view + per-lender evaluation results | D6 | stages, evaluations ← |
| D8 | Commissions | Earned list per disbursed file (slab-calculated), lifecycle status | Tab | commission rows ← |
| D9 | Wallet | Balance, full append-only ledger, "Request withdrawal" | Tab | ledger ←; withdrawal request → |
| D10 | Withdrawal Requested | Confirmation state | D9 | — |
| D11 | Notifications | In-app list | Bell | ← |
| D12 | Profile & Settings | KYC/bank details (for payout reference), logout | Tab | profile ←→ |

*Locked:* dealer sees only own leads/files/ledger (RLS). No other dealer's data ever renders (AGENTS.md).

## 3. Staff App (React Native)

| # | Screen | Purpose | Entry point | Data in/out |
|---|---|---|---|---|
| S1 | Splash | Session check | Launch | — |
| S2 | Login (username + password) | Staff auth | S1 | credentials → session |
| S3 | Dashboard | Assigned/own files by stage, performance snapshot | Post-login | aggregates ← |
| S4 | Add Customer / New Lead | Same as D4 | S3 | lead → verdict ← |
| S5 | Lead → Full Application | Same as D5 | S4 | form + files → |
| S6 | Files List | Own/assigned files, filter by stage | Tab | files ← |
| S7 | File Detail / Timeline + Stage Entry | View pipeline **and append stage entries** (CIBIL result, bank response, valuation, FI, approval, disbursement record) with remarks | S6 | stage entry → (append-only) |
| S8 | Performance | Files added, disbursed count, stage conversion, monthly view | Tab | aggregates ← |
| S9 | Notifications | In-app list | Bell | ← |
| S10 | Profile & Settings | Logout, password change | Tab | ←→ |

*Locked:* **no commission, no wallet screens exist** (L8). Onboarding skipped — staff are trained in person before rollout (recorded reason per house checklist).

## 4. Staff Panel (React + Vite web)

Mirror of Staff App on desktop — same account, same permissions, same data.

| # | Screen | Purpose | Entry point | Data in/out |
|---|---|---|---|---|
| SP1 | Login | Username + password | URL | credentials → session |
| SP2 | Dashboard | Same as S3, desktop layout | Post-login | aggregates ← |
| SP3 | New Lead + Application | S4 + S5 as desktop flow | SP2 | → |
| SP4 | Files List | S6 desktop, richer filters/table | Nav | ← |
| SP5 | File Detail + Stage Entry | S7 desktop | SP4 | stage entry → |
| SP6 | Performance | S8 desktop | Nav | ← |
| SP7 | Profile & Settings | S10 desktop | Nav | ←→ |

*Locked:* separate codebase (L14); no wallet/commission (L8). No splash/onboarding (web).

## 5. Admin Panel (React + Vite web)

| # | Screen | Purpose | Entry point | Data in/out |
|---|---|---|---|---|
| A1 | Login | Email + password | URL | credentials → session |
| A2 | Dashboard | Network-wide KPIs: files by stage, disbursals, pending payouts, 90-day-risk files | Post-login | aggregates ← |
| A3 | Loan Files List | All files, filter by stage/status/dealer/staff/lender | Nav | files ← |
| A4 | File Detail | Full file: data, docs, evaluations per lender, stage timeline, append stage entries, mark disbursement | A3 | stage entry →; disbursement → (triggers commission) |
| A5 | Lenders List | All NBFC partners, status, priority rank | Nav | lenders ←→ |
| A6 | Lender Onboarding — Details | Form section A (name, code, type, contact, priority, logo) | A5 "Add" | lender → |
| A7 | Policy Editor — Header & Limits | Form sections B–D (product, effective dates, amounts, LTV, age, CIBIL, customer types) | A6 / A5 lender row | policy → |
| A8 | Policy Editor — Documents | Form sections E–F (applicant/co-applicant doc builder, pick-N-of-M groups, photos) | A7 next | policy docs → |
| A9 | Policy Editor — Ownership & Conditional Rules | Form sections G–H (ownership proof rules, trigger-based guarantor blocks, repeatable) | A8 next | conditional rules → |
| A10 | Policy Preview & Publish | Section I: human-readable summary, publish (versions old policy out) | A9 next | activate → |
| A11 | Dealers List + Detail | All dealers, KYC/bank info, their files & ledger | Nav | ←→ |
| A12 | Staff List + Detail | Staff accounts, performance, create/disable | Nav | ←→ |
| A13 | Commissions | All earned commissions, lifecycle Earned → Payout Pending → Paid | Nav | ← |
| A14 | Payouts | Withdrawal requests queue; record manual payout (amount, UTR, date) → ledger row | A13 / Nav | payout → (append-only) |
| A15 | Settings | Commission slab values, valuation depreciation slabs, document master list, 90-day window | Nav | settings ←→ (audited) |
| A16 | Audit Log | Filterable audit trail (stage entries, payouts, policy publishes, setting changes) | Nav | ← |
| A17 | Notifications | In-app list | Bell | ← |

*Locked:* the 48-field lender onboarding form (A6–A10) is the only write path for lender policies; policies version on publish, never edit-in-place (L11).

---

## Fixed / seeded master data

- Lenders: SK Finance, ITI Finance (active) + 4 inactive placeholders (Bajaj, Mahindra, Tata Capital, IndusInd)
- Lender policies: SK Finance New/Used Car v1, ITI Finance New/Used Car v1 (from client rule sheets)
- Loan products: New Car, Used Car, Commercial Vehicle
- Commission slab: 1.5% ≤ ₹10,00,000 / 2% above (O1 pending on basis)
- Valuation depreciation slabs (client-tuned in A15)
- Document master list (PAN, Aadhaar, Voter ID, Electricity Bill, Khatauni, Property Registry, Bank Statement, Photos)
- 90-day disbursement window

## Implied tables

See SCHEMA.md v2.0 — users/roles, customers, dealers, staff, loan_applications, loan_stage_entries, documents, lenders, lender_policies, policy_documents, eligibility_evaluations, commissions, wallet_ledger, withdrawal_requests, notifications, audit_log, settings, valuation_slabs.

---

### Sign-off — no design or build work before this is signed

| | Client | CKR Technologies |
|---|---|---|
| Name | Prateek | |
| Role | | Delivery Lead |
| Signature | | |
| Date | | |
