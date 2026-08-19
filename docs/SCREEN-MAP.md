# SCREEN-MAP.md — Shreeja Finance Platform
**Version:** v4.0 · **Companion:** PRD.md v4.0 · **Status:** Draft — needs client sign-off; no design/build before this signs

> Every screen table below is fully self-contained — nothing in this document points back at a superseded version. Sheets/modals and result/edge screens count as screens. Every data screen implements loading / empty / error / offline states (DESIGN.md §4) — not listed per row.

**Changelog (for context only — the tables above are already current):**
- **v2.0 → v3.0:** Admin Panel's 48-field Policy Editor (old A6–A10) removed — lender rules moved from admin-editable data to hardcoded, CKR-maintained code modules. Replaced with a read-only Lender Rules Reference and a simplified Lender Settings screen.
- **v3.0 → v4.0 (current):** Dealer commission payouts automated via a payout provider (RazorpayX or Cashfree — O7). Dealer App gains a bank-account verification screen; Admin's Payouts screen changes from manual data-entry to a monitoring/approval view.

---

## 1. Customer App (React Native)

| # | Screen | Purpose | Entry point | Data in/out |
|---|---|---|---|---|
| C1 | Splash | Logo + session check, route to C2/C4 | App launch | session token → |
| C2 | Onboarding (3 slides) | Explain: check eligibility → apply → track | First launch | — |
| C3 | Login (Phone OTP) | Phone entry → OTP verify | C1/C2 | phone → OTP verify → session |
| C4 | Home | Products (New/Used Car, CV), start eligibility, active application card | Post-login | active loan summary ← |
| C5 | Quick Eligibility Check | Pre-check: 6–8 questions (age, amount, CIBIL band, income type, residence, co-applicant availability) — no documents yet | C4 | answers → per-lender pre-verdict ← |
| C6 | Eligibility Result | Per-lender verdict list (eligible / not eligible / incomplete + reasons) | C5 | evaluation ← |
| C7 | Loan Application Form (multi-step) | Applicant details, vehicle details, co-applicant details | C6 "Proceed" | form data → |
| C8 | Document Upload | Checklist-driven uploads per applicant/co-applicant/guarantor — checklist generated from whichever lender(s) are still eligible | C7 | files → storage; checklist ← |
| C9 | Full Eligibility Result | Final verdict after data + documents; shows submit-ready lenders | C8 | evaluation ← |
| C10 | Application Submitted | Confirmation + application ID | C9 | — |
| C11 | Application Status / Timeline | Six-stage pipeline view with current stage, dates (public-safe fields only — no internal remarks/staff names) | C4 card / C10 | stage entries ← |
| C12 | Notifications | In-app notification list | Header bell | notifications ← |
| C13 | Profile & Settings | Personal details, logout | Tab | profile ←→ |

**Locked:** onboarding kept (new concept for this audience). No payment screens anywhere — no gateway involved for customers in v1.

---

## 2. Dealer App (React Native)

| # | Screen | Purpose | Entry point | Data in/out |
|---|---|---|---|---|
| D1 | Splash | Session check | Launch | — |
| D2 | Login (Phone OTP) | Dealer auth | D1 | phone → session |
| D3 | Dashboard | KPIs: active files, disbursed this month, wallet balance | Post-login | aggregates ← |
| D4 | Add Customer / New Lead | Capture customer basics, run quick eligibility (same as C5) | D3 | lead → verdict ← |
| D5 | Lead → Full Application | Same multi-step form + doc upload as C7–C8, filled by dealer on customer's behalf | D4 | form + files → |
| D6 | My Files List | All own loan files, filter by stage/status | Tab | files ← |
| D7 | File Detail / Timeline | Six-stage view + per-lender evaluation results | D6 | stages, evaluations ← |
| D8 | Commissions | Earned list per disbursed file (slab-calculated), lifecycle status | Tab | commission rows ← |
| **D9a** | **Add / Verify Bank Account** | Bank account number, IFSC, holder name → calls payout provider's beneficiary verification → shows verified/pending/failed status with plain-language failure reason. **Required before D9's withdrawal button is enabled** — a provider requirement, not a CKR-added step. | D9 (if unverified) / Profile | account details → verified status ← |
| D9 | Wallet | Balance, full append-only ledger, "Request Withdrawal" — disabled with a prompt to D9a if no verified bank account exists | Tab | ledger ←; withdrawal request → |
| D10 | Withdrawal Requested | Real status progression (requested → processing → processed/failed), not a static confirmation — payout is typically live within minutes | D9 | status ← |
| D11 | Notifications | In-app list — includes payout success/failure notifications | Bell | ← |
| D12 | Profile & Settings | KYC/bank details, links to D9a for managing the verified payout account, logout | Tab | profile ←→ |

**Locked:** dealer sees only own leads/files/ledger (RLS) — another dealer's data never renders. Withdrawal requests above an admin-configured threshold (O8) route to A14 for approval before the provider is called; below it, the provider call fires automatically.

---

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

**Locked:** no commission, no wallet screens exist — staff are structurally excluded from that domain. Onboarding skipped — staff are trained in person before rollout (recorded reason per house checklist).

---

## 4. Staff Panel (React + Vite, web)

Mirror of Staff App on desktop — same account, same permissions, same data.

| # | Screen | Purpose | Entry point | Data in/out |
|---|---|---|---|---|
| SP1 | Login | Username + password | URL | credentials → session |
| SP2 | Dashboard | Same as S3, desktop layout | Post-login | aggregates ← |
| SP3 | New Lead + Application | S4 + S5 as a desktop flow | SP2 | → |
| SP4 | Files List | S6 desktop, richer filters/table | Nav | ← |
| SP5 | File Detail + Stage Entry | S7 desktop | SP4 | stage entry → |
| SP6 | Performance | S8 desktop | Nav | ← |
| SP7 | Profile & Settings | S10 desktop | Nav | ←→ |

**Locked:** separate codebase from Admin Panel (L-ARCH-3) — not a restricted-role view inside it. No wallet/commission (same exclusion as Staff App). No splash/onboarding (web).

---

## 5. Admin Panel (React + Vite, web)

| # | Screen | Purpose | Entry point | Data in/out |
|---|---|---|---|---|
| A1 | Login | Email + password | URL | credentials → session |
| A2 | Dashboard | Network-wide KPIs: files by stage, disbursals, pending payouts, 90-day-risk files (per DESIGN.md §12.4) | Post-login | aggregates ← |
| A3 | Loan Files List | All files, filter by stage/status/dealer/staff/lender | Nav | files ← |
| A4 | File Detail | Full file: data, docs, evaluations per lender, stage timeline, append stage entries, mark disbursement | A3 | stage entry →; disbursement → (triggers commission) |
| A5 | Lenders List | All partner NBFCs, active/inactive, priority rank | Nav | lenders ←→ (active + priority only) |
| A6 | Lender Rules Reference | Read-only view of each active lender's hardcoded rules — age/CIBIL/LTV bounds, document lists, guarantor conditions — human-readable, pulled live from that lender's code module. **No screen in this app can create, edit, or publish a lender policy** — that capability doesn't exist in the product; a rule change is a CKR code change | A5 row click | rules summary ← (read-only) |
| A7 | Lender Settings | Toggle active/inactive, set priority rank. No rule fields here. | A5 "Settings" | active, priority ←→ |
| *A8–A10* | *— retired —* | *v2.0's 3-step Policy Editor (Documents / Ownership & Conditional Rules / Preview & Publish) occupied these numbers. Removed in v3.0 along with the rest of the Policy Editor; numbers intentionally not reused, kept as a record of what left the product.* | — | — |
| A11 | Dealers List + Detail | All dealers, KYC/bank info, their files & ledger | Nav | ←→ |
| A12 | Staff List + Detail | Staff accounts, performance, create/disable | Nav | ←→ |
| A13 | Commissions | All earned commissions, lifecycle Earned → Payout Pending → Paid | Nav | ← |
| A14 | Payouts | **Monitoring view** — all withdrawal requests with live status (requested / pending_approval / processing / processed / failed). "Approve" action appears only for `pending_approval` (above-threshold, O8) requests, which then trigger the provider call. **No manual "record payment" form exists** — that data-entry flow is gone; the provider webhook writes the ledger row, not an admin | Nav / A13 | approve → (above-threshold only) |
| A15 | Settings | Commission slab values, valuation depreciation slabs, document master list, 90-day window — **lender credit rules explicitly NOT here** (those are in code, view-only at A6) | Nav | settings ←→ (audited) |
| A16 | Audit Log | Filterable audit trail (stage entries, payouts, lender settings changes, business setting changes) | Nav | ← |
| A17 | Notifications | In-app list — includes payout success/failure | Bell | ← |

**Locked:**
- A6/A7 are the only lender-facing screens in this app; policies version only via CKR code deploys, never edit-in-place (L11).
- A14 has no data-entry path for payouts — automation is the only settlement mechanism once a bank account is verified (D9a) and, where applicable, an above-threshold request is approved here.

---

## Fixed / seeded master data

- **Lenders:** SK Finance, ITI Finance (active, code-defined rules) + 4 inactive placeholders (Bajaj Finserv, Mahindra Finance, Tata Capital, IndusInd Bank — activated only once CKR ships their rule module)
- **Loan products:** New Car Loan, Used Car Loan, Commercial Vehicle Loan
- **Business settings (admin-editable via A15):** commission slab (1.5% ≤ ₹10,00,000 / 2% above), valuation depreciation slabs, document master list, 90-day disbursement window
- **Payout provider:** RazorpayX or Cashfree — choice pending (O7); adapter pattern means the screens above don't change regardless of which is picked

## Implied tables

See SCHEMA.md v4.0 — `lenders` (identity + active/priority only, no policy FK), `eligibility_evaluations` (references `lender_code` + `rules_version` string, not a policy row), `wallet_ledger` (append-only; payout rows now written by the provider webhook handler, not an admin form), `dealer_bank_accounts` (new in v4.0 — verification status per D9a).

## Cross-app locked notes

- Eligibility check UX (C5/C6/C9 pattern) is identical wherever it appears (Customer, Dealer, Staff) — only what powers it on the backend differs (hardcoded lender modules, not stored policy data).
- Staff App and Staff Panel are structurally excluded from commissions/wallet — no screen, no route, no controller.
- Dealer/Customer data isolation is enforced at the RLS layer, not just hidden in UI — never assume a missing nav link is the only guard.

---

### Sign-off — no design or build work before this is signed

| | Client | CKR Technologies |
|---|---|---|
| Name | Prateek | |
| Role | | Delivery Lead |
| Signature | | |
| Date | | |
