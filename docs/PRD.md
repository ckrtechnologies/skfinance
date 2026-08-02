# PRD.md — Shreeja Finance Vehicle Loan Platform
**Client:** Shreeja Finance Private Limited (contact: Prateek)
**Prepared by:** CKR Technologies · **Version:** v2.0 · **Date:** 02 Aug 2026
**Supersedes:** v1.x (4-app, single-lender scope). This version is the source of truth.
**Companions:** SCREEN-MAP.md v2.0 · ARCHITECTURE.md v1.0 · SCHEMA.md v2.0 · API.md v2.0 · AUTH-MATRIX.md v2.0 · JOBS.md v2.0 · AGENTS.md v2.0

---

## 1. Business context

Shreeja Finance Private Limited (Barabanki, UP · CIN UP64990UP2026PTC244922 · Director Mrs. Shivangi Srivastava) is a DSA / loan aggregator / digital lending platform for vehicle loans. It does **not** lend its own money — it sources loan files through a channel-partner network of car dealers and its own staff, then routes each file to the best-fit lender among its NBFC/bank partners (SK Finance, ITI Finance, Bajaj Finserv, Mahindra Finance, Tata Capital, IndusInd Bank).

**Products:** New Car Loan, Used Car Loan, Commercial Vehicle Loan.
**Revenue:** payout from lenders on disbursed files; dealers earn a commission share per disbursed file.

## 2. What we are building (5 deliverables + 1 backend)

| # | Deliverable | Platform | Primary users |
|---|---|---|---|
| 1 | Customer App | React Native (bare CLI) | End customers — check eligibility, apply, upload documents, track status |
| 2 | Dealer App | React Native (bare CLI) | Channel partners — add customers/leads, track files, view commissions + wallet |
| 3 | Staff App | React Native (bare CLI) | Shreeja staff — add leads, process/track files, view own performance |
| 4 | Staff Panel | React + Vite web | Same capabilities as Staff App on desktop |
| 5 | Admin Panel | React + Vite web | Ops/admin — lender & policy management, all files, dealers, staff, payouts |
| — | Backend | Express.js + Supabase | Shared by all five (see ARCHITECTURE.md) |

Marketing website: **already delivered — out of scope.**

## 3. The core differentiator — multi-lender eligibility engine

Every partner NBFC has a different credit policy (age band, CIBIL cutoff, LTV, co-applicant rules, guarantor triggers). The platform's engine evaluates one customer profile against **all active lender policies** and returns a per-lender verdict:

- **Eligible** — file can go to this lender
- **Not eligible** — with the exact failed rules (e.g. "age above 62 — ITI max", "CIBIL −1 not accepted")
- **Incomplete** — with the list of missing data/documents

When multiple lenders pass, results are ranked by admin-set lender priority; staff/admin choose where to submit. Policies are stored as **versioned data** in Supabase (not code) and managed through an Admin Panel rule editor — adding a lender is data entry, not development. Full design in ARCHITECTURE.md §2–3 and SCHEMA.md.

**Two-stage evaluation:** a quick pre-check (6–8 questions, before documents) narrows the lender list early; the full check runs after data + document capture.

**Lender policies available at launch:** SK Finance (New/Used Car) and ITI Finance (New/Used Car) — both seeded from client-provided credit rule sheets. Other lenders and Commercial Vehicle rule sheets are pending from client (Open Item O2).

## 4. Loan pipeline (unchanged from v1)

Six-stage pipeline per file: **CIBIL → Bank → Valuation → FI → Approval → Disbursement.**
- All verification is **manual** (no CIBIL API, no Aadhaar/KYC API, no third-party valuation API). Vehicle valuation uses the in-house depreciation-slab formula.
- Stage entries are **immutable/append-only** — corrections are new rows with remarks.
- **90-day rule:** loans not disbursed within 90 days of approval are auto-blocked and require re-approval (background job J1). The disbursement endpoint independently re-verifies the window at write time.

## 5. Commission & wallet (updated in v2)

- **Slab commission for dealers** on disbursed amount: **1.5% for disbursed amount ≤ ₹10,00,000; 2% above ₹10,00,000.** Auto-calculated at disbursement, single calculation point in `domains/commissions`.
- **Wallet = append-only ledger** per dealer: `commission_earned` (auto on disbursement) → `payout` (admin pays manually via bank, records UTR + date in Admin Panel) → `adjustment` (corrections as new rows). Balance = sum of ledger. Dealer App shows balance, ledger history, and a "request withdrawal" action that flags admin.
- **No payment gateway in v1** — payouts are off-platform bank transfers, recorded on-platform.
- **Staff earn no commission** (salaried). Staff App/Panel have **no wallet or commission surface at all** — structurally excluded (ARCHITECTURE.md L-ARCH-2). Staff get performance tracking: files added, files disbursed, stage conversion.
- One dealer per loan; no sub-dealer hierarchy.

## 6. Roles & auth

| Role | Surfaces | Auth |
|---|---|---|
| Customer | Customer App | Phone OTP |
| Dealer | Dealer App | Phone OTP |
| Staff | Staff App + Staff Panel (same account) | Username + password |
| Admin | Admin Panel | Email + password |

Full permission matrix in AUTH-MATRIX.md. RLS on every table.

## 7. Locked decisions (v2)

| # | Decision |
|---|---|
| L1 | 5 deliverables as per §2; marketing website excluded (delivered) |
| L2 | Six-stage pipeline CIBIL → Bank → Valuation → FI → Approval → Disbursement |
| L3 | 90-day approval-to-disbursement window; auto-block via job J1; re-approval required after block |
| L4 | Stage entries, commissions, ledger rows, evaluations: append-only, never edited or deleted |
| L5 | All verification manual in v1 — no CIBIL/KYC/valuation APIs; in-house depreciation-slab valuation |
| L6 | No payment gateway in v1; commission payouts manual + ledger-recorded |
| L7 | Commission slab: 1.5% ≤ ₹10,00,000 / 2% above, on disbursed amount, dealers only |
| L8 | Staff (app + panel) structurally excluded from commissions/wallet |
| L9 | Auth models per §6 |
| L10 | One dealer per loan; no sub-dealer hierarchy |
| L11 | Multi-lender eligibility engine: policy-as-data, versioned, admin-editable; evaluations pin the exact policy version used |
| L12 | Launch lender set: SK Finance + ITI Finance (New/Used Car); additional lenders added via admin rule editor as client supplies rule sheets |
| L13 | Backend: two-layer structure — thin `api/<deliverable>/` over shared `domains/` (ARCHITECTURE.md L-ARCH-1) |
| L14 | Staff Panel is a separate React + Vite codebase, not a restricted Admin Panel view |
| L15 | Loan amount range ₹1,00,000 – ₹15,00,000 (per SK + ITI sheets; per-lender values live in policy data) |

## 8. Open items (must close at/before Screen Map sign-off)

| # | Item | Owner |
|---|---|---|
| O1 | Commission slab basis: does 2% apply to the whole disbursed amount once above ₹10L, or only the portion above? (Docs currently assume whole amount — confirm) | Prateek |
| O2 | Credit rule sheets for Bajaj, Mahindra, Tata Capital, IndusInd + Commercial Vehicle sheets for all lenders | Prateek |
| O3 | E-signing of customer loan agreement: Aadhaar eSign via ESP (Digio/Leegality, per-signature cost, creates INTEGRATIONS.md) vs in-app click-to-sign + OTP (no external dependency, weaker legal standing) | Prateek |
| O4 | SMS/OTP provider account (MSG91/2Factor/other) — client-owned or CKR-procured | Prateek |
| O5 | Brand assets for the three new/changed surfaces (Staff App, Staff Panel) — confirm same tokens as existing DESIGN.md | Prateek |

## 9. Out of scope (v1)

Payment gateway / EMI collection · automated CIBIL/KYC/valuation APIs · push notifications & SMS beyond OTP (notifications are in-app rows) · sub-dealer hierarchy · lender-side portal access · marketing website (delivered separately).

---

### Sign-off

| | Client | CKR Technologies |
|---|---|---|
| Name | Prateek | |
| Role | | Delivery Lead |
| Signature | | |
| Date | | |
