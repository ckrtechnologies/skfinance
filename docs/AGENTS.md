# AGENTS.md — Shreeja Finance Platform
> CKR Technologies · read automatically by Antigravity at session start. **Version v3.0 · 02 Aug 2026.** Copy this file into every repo's root.

---

## 1. Project Context

- **Project:** Shreeja Finance — multi-lender vehicle loan platform (5 deliverables + backend)
- **Client:** Shreeja Finance Private Limited (Prateek)
- **Docs:** `docs/PRD.md` v3.0 · `docs/SCREEN-MAP.md` v3.0 · `docs/DESIGN.md` v1.1 · `docs/API.md` v3.0 · `docs/SCHEMA.md` v3.0 · `docs/ARCHITECTURE.md` v2.0 · `docs/AUTH-MATRIX.md` v3.0 · `docs/JOBS.md` v3.0 · `docs/DEPLOYMENT.md` v3.0
- **v3.0 change:** eligibility rules are hardcoded per lender (no generic policy engine). See §6.7–6.10 below before touching anything under `domains/lenders/`.

## 2. Stack & Versions — unchanged from v2.0

## 3. Design Rules — unchanged from v2.0

## 4. API & Data Rules — unchanged from v2.0

## 5. Code Conventions — unchanged from v2.0

## 6. Backend Rules (`shreeja-backend`)

1–4. Unchanged from v2.0 (two-layer structure, zod validation, RLS, secrets gateway).
5. Pipeline state machine, disbursement transaction, commission calc — unchanged from v2.0.
6. Disbursement re-verifies the 90-day window at write time — unchanged.

**7 (revised). Lender eligibility rules are hardcoded, one module per lender:**
- Every lender's rules live in exactly one place: `domains/lenders/<code>/`. Never write lender-specific eligibility logic anywhere else — not in a controller, not in the orchestrator, not inline in a screen.
- Every lender module implements the fixed interface (`evaluate()`, `getRulesSummary()`, `RULES_VERSION`) documented in `ARCHITECTURE.md` §3. Do not deviate from this shape — the orchestrator calls every module identically and expects identical output shape.
- `evaluate()` must be a **pure function** — no DB calls, no side effects inside it. If a lender's rule genuinely needs data not present in `applicantInput`, extend what the orchestrator passes in — never reach into the DB from inside a lender module.
- One lender module never imports another's internals. Shared logic goes in `domains/lenders/shared/`.
- **A rule change means editing that lender's `rules.js`/`evaluate.js` and bumping `RULES_VERSION`.** This is expected, routine, billable work — not a sign something is broken. Do not build any admin-facing UI or API path that lets a rule be edited without a code deploy; that capability was deliberately removed (PRD.md v3.0 L11).
- Every rule change needs a matching unit test (fixed applicant input → expected verdict) before merge — this is the safety net for a hardcoded rule, replacing what used to be admin-form validation.

**8 (new).** `domains/lenders-admin/service.js` is the only DB-backed lender logic — it handles exactly two fields: `is_active`, `priority`. Never let this service or its repository touch anything resembling rule content; there is no rule content in the database.

**9 (new).** `getRulesSummary()` on every lender module must stay in sync with `evaluate()` — if you change a cutoff in `evaluate()`, update the matching value in `getRulesSummary()` in the same change. A drifted summary silently misleads Admin Panel's Lender Rules Reference screen (A6), which is also the client's visible proof that a requested change shipped — a mismatch there is a trust problem, not just a cosmetic bug.

**10 (new).** `eligibility_evaluations` rows must always carry the `rules_version` returned by the module that produced them (`ARCHITECTURE.md` §3) — never write a row without it; this is the entire audit trail for "what rules were active when," now that there's no versioned policy table to fall back on.

11. Jobs J1–J3 unchanged from v2.0. **J4 no longer exists — do not resurrect it or anything like it.**

## 7. What the Agent Must Never Do

- Unchanged items from v2.0 (secrets, migrations, theme, edit/delete on append-only entities, commission client-side computation, payment gateway/EMI code, CIBIL/KYC API calls, push/SMS beyond OTP, staff commission/wallet surface, cross-dealer data leaks, silencing lint).
- **Never build a generic rule interpreter or JSONB-driven eligibility logic** — that pattern was deliberately removed in v3.0; reintroducing it defeats the entire point of this rework.
- **Never let two lender modules share mutable state or call into each other.**
- **Never add a write endpoint, admin screen, or form field that edits lender rule content** — active/priority only, per L-ARCH-6.
- **Never ship a rule change without bumping `RULES_VERSION` and adding a test.**

## 8. When Unsure

Unchanged from v2.0 — stop and ask rather than guess.
