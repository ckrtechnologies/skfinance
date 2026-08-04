# SCREEN-MAP.md — Shreeja Finance Platform
**Version:** v3.0 · **Date:** 02 Aug 2026 · **Companion:** PRD.md v3.0
**Change from v2.0:** Admin Panel screens A6–A10 (Lender Onboarding / Policy Editor, form-based) are **removed**. Replaced with A6 (Lender Rules Reference, read-only) and A7 (Lender Settings — active/priority only). Customer/Dealer/Staff app screens are unchanged from v2.0 — the eligibility check UX is identical; only what powers it on the backend changed.

---

## 1. Customer App — unchanged from v2.0 (C1–C13)
## 2. Dealer App — unchanged from v2.0 (D1–D12)
## 3. Staff App — unchanged from v2.0 (S1–S10)
## 4. Staff Panel — unchanged from v2.0 (SP1–SP7)

See PRD.md v3.0 §3 — the multi-lender check, verdict display, and dynamic document checklist all still work the same way from these apps' point of view; the orchestrator now calls hardcoded lender modules instead of interpreting stored policy data, which is invisible to these four surfaces.

## 5. Admin Panel — revised

| # | Screen | Purpose | Entry point | Data in/out |
|---|---|---|---|---|
| A1 | Login | Email + password | URL | credentials → session |
| A2 | Dashboard | Network-wide KPIs, charts (per DESIGN.md §12.4) | Post-login | aggregates ← |
| A3 | Loan Files List | All files, filters | Nav | files ← |
| A4 | File Detail | Full file, evaluations, timeline, disbursement | A3 | stage entry →; disbursement → |
| **A5** | **Lenders List** | All partner NBFCs, active/inactive, priority | Nav | lenders ←→ (active + priority only) |
| **A6 (new)** | **Lender Rules Reference** | Read-only view of each active lender's hardcoded rules — age/CIBIL/LTV bounds, document lists, guarantor conditions, human-readable — pulled live from that lender's code module | A5 row click | rules summary ← (read-only) |
| **A7 (new)** | **Lender Settings** | Toggle active/inactive, set priority rank. No rule fields here — replaces old A6–A10 entirely | A5 "Settings" | active, priority →→ |
| A11 | Dealers List + Detail | Unchanged from v2.0 | Nav | ←→ |
| A12 | Staff List + Detail | Unchanged from v2.0 | Nav | ←→ |
| A13 | Commissions | Unchanged from v2.0 | Nav | ← |
| A14 | Payouts | Unchanged from v2.0 | Nav | payout → |
| A15 | Settings | Commission slab, 90-day window, valuation slabs, doc master — **lender credit rules explicitly NOT here** (they're in code, view-only at A6) | Nav | settings ←→ |
| A16 | Audit Log | Unchanged from v2.0 | Nav | ← |
| A17 | Notifications | Unchanged from v2.0 | Bell | ← |

**Removed from v2.0:** A6–A10 (48-field Policy Editor: Details, Header & Limits, Documents, Ownership & Conditional Rules, Preview & Publish). No screen in this app can create, edit, or publish a lender policy — that capability no longer exists in the product; it's a CKR code change.

---

## Fixed / seeded master data (revised)

- Lenders: SK Finance, ITI Finance (active, code-defined rules) + 4 inactive placeholders (Bajaj, Mahindra, Tata Capital, IndusInd — activated only once CKR ships their module)
- Loan products: New Car, Used Car, Commercial Vehicle
- Commission slab, valuation depreciation slabs, document master list, 90-day window — unchanged, still admin-editable via A15 (these are business settings, not lender credit rules)

## Implied tables (revised)

See SCHEMA.md v3.0 — `lender_policies`, `policy_documents`, `conditional_rules`/`ownership_proof_rules` JSONB are **removed**. `lenders` table simplified to identity + active/priority. `eligibility_evaluations` now references `lender_code` + `rules_version` (a version string bumped in code) instead of a policy row FK.

---

### Sign-off — no design or build work before this is signed

| | Client | CKR Technologies |
|---|---|---|
| Name | Prateek | |
| Role | | Delivery Lead |
| Signature | | |
| Date | | |
