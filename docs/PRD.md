# PRD.md — Shreeja Finance Vehicle Loan Platform
**Client:** Shreeja Finance Private Limited (contact: Prateek)
**Prepared by:** CKR Technologies · **Version:** v3.0 · **Date:** 02 Aug 2026
**Supersedes:** v2.0 (policy-as-data multi-lender engine). This version replaces the generic rule engine with **per-lender hardcoded service modules**.
**Companions:** SCREEN-MAP.md v3.0 · ARCHITECTURE.md v2.0 · SCHEMA.md v3.0 · API.md v3.0 · AUTH-MATRIX.md v3.0 · JOBS.md v3.0 · AGENTS.md v3.0 · DESIGN.md v1.1

---

## 1. Business context

Unchanged from v2.0 §1 — Shreeja Finance Private Limited is a DSA/loan aggregator routing vehicle loan files through channel partners to NBFC/bank partners (SK Finance, ITI Finance, Bajaj Finserv, Mahindra Finance, Tata Capital, IndusInd Bank).

## 2. What we are building — unchanged deliverable count

Same 5 deliverables + backend as v2.0 §2 (Customer App, Dealer App, Staff App, Staff Panel, Admin Panel). Website excluded (delivered).

## 3. Eligibility architecture — reworked (v3.0 change)

**v2.0 approach (superseded):** lender credit policies stored as versioned JSONB data in Supabase, edited through an admin rule-editor form, interpreted at runtime by a generic rule evaluator.

**v3.0 approach (current):** each lender's credit policy is **hardcoded as its own backend service module** — `domains/lenders/sk-finance/`, `domains/lenders/iti-finance/`, etc. — implementing a fixed evaluation interface. There is no generic JSONB rule interpreter and no admin-editable policy form.

**Reasoning (recorded per house process — deviations/major changes need a recorded reason):**
- Client explicitly wants rule changes to route through CKR as billable maintenance work, not self-service admin edits.
- Hardcoded, lender-specific code is simpler to read, test, and debug than a generic conditional-rule interpreter.
- Trade-off accepted knowingly: adding a new lender or changing an existing lender's cutoff now requires a CKR code change + deploy, not a form submission. This is the intended behavior, not a limitation to fix later.

**What stays configurable without a deploy:** a lender's **active/inactive** status and **priority rank** remain editable fields in Admin Panel — Prateek can pause a lender or reorder preference without needing CKR, but cannot change *what a lender's rules are*.

**What every lender module must do:** given a customer's captured data + documents, return `{ result: eligible | not_eligible | incomplete, failed_rules: [...], missing_items: [...], required_documents: [...] }`. The **eligibility orchestrator** (`domains/eligibility-engine/orchestrator.js`) calls every active lender module, collects results, ranks by priority — this part is unchanged in spirit from v2.0, only what it calls has changed (fixed functions, not data-driven interpretation).

**Transparency mechanism:** each lender module also exports a human-readable rules summary (min/max age, CIBIL, LTV, document lists, guarantor conditions) that powers a **read-only "Lender Rules Reference" screen** in Admin Panel — so the client can see current rules at a glance even though they can't edit them, and so a shipped rule-change is visibly reflected as proof of completed maintenance work.

**Launch lender modules:** `sk-finance` and `iti-finance`, built from the client-provided credit rule sheets (New/Used Car). Additional lenders (O2) get their own module built by CKR once their rule sheet arrives — each is scoped and billed as its own build/change item.

## 4. Loan pipeline — unchanged

Six-stage pipeline (CIBIL → Bank → Valuation → FI → Approval → Disbursement), manual verification, append-only stage entries, 90-day auto-block (job J1) — all unchanged from v2.0 §4.

## 5. Commission & wallet — unchanged

Slab commission (1.5% ≤ ₹10,00,000 / 2% above), append-only wallet ledger, manual admin payouts, staff excluded from commission/wallet — unchanged from v2.0 §5.

## 6. Roles & auth — unchanged

Unchanged from v2.0 §6.

## 7. Locked decisions (v3.0 — supersedes/extends v2.0 L11–L12)

| # | Decision |
|---|---|
| L1–L10 | Unchanged from v2.0 (5 deliverables, pipeline, 90-day rule, append-only, manual verification, no payment gateway, commission slab, staff exclusion, auth model, one dealer per loan) |
| **L11 (revised)** | **Eligibility rules are hardcoded per lender**, one backend service module per lender under `domains/lenders/<lender-code>/`, each implementing a fixed evaluation interface. No generic JSONB rule interpreter. |
| **L12 (revised)** | Launch lender modules: SK Finance + ITI Finance (New/Used Car), built from client rule sheets. Additional lenders = new CKR-built module per lender, scoped as its own work item, billed accordingly. |
| L13–L14 | Unchanged from v2.0 (two-layer backend structure, Staff Panel separate codebase) |
| **L16 (new)** | Lender **active/inactive** status and **priority rank** remain Admin-Panel-editable (DB fields); the underlying credit **rules** are not editable outside a CKR code change. |
| **L17 (new)** | Every lender module exports a machine-readable rules summary powering a read-only Admin Panel "Lender Rules Reference" screen. |
| L15 | Loan amount range ₹1,00,000–₹15,00,000 (per-lender values now live in that lender's `rules.js`, not a DB row) |

## 8. Open items

| # | Item | Owner |
|---|---|---|
| O1 | Commission slab basis (whole amount vs marginal above ₹10L) | Prateek |
| O2 | Credit rule sheets for Bajaj, Mahindra, Tata Capital, IndusInd + CV sheets — **each triggers a new lender-module build**, scope/estimate provided per sheet received | Prateek |
| O3 | E-signing decision (Aadhaar eSign vs click-to-sign+OTP) | Prateek |
| O4 | SMS/OTP provider account | Prateek |
| O5 | Brand assets / exact hex confirmation | Prateek |
| **O6 (new)** | **Rule-change process/SLA** — how a client-requested rule change (e.g. ITI CIBIL cutoff update) is submitted, scoped, and turned around by CKR. Recommend a short lightweight change-request template so these don't get lost in chat. | Prateek + CKR |

## 9. Out of scope (v1) — unchanged

Payment gateway/EMI, automated CIBIL/KYC/valuation APIs, push/SMS beyond OTP, sub-dealer hierarchy, lender-side portal access, marketing website. **Also now explicitly out of scope:** self-service admin editing of lender credit rules (was in scope in v2.0, removed in v3.0 per L11).

---

### Sign-off

| | Client | CKR Technologies |
|---|---|---|
| Name | Prateek | |
| Role | | Delivery Lead |
| Signature | | |
| Date | | |
