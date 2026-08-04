# ARCHITECTURE.md
**Project:** Shreeja Finance Private Limited — Multi-App Vehicle Loan Platform
**Client contact:** Prateek
**Prepared by:** CKR Technologies
**Version:** v2.0 · **Date:** 02 Aug 2026
**Supersedes:** v1.0 — replaces the policy-as-data eligibility engine with hardcoded per-lender service modules (PRD.md v3.0 §3).
**Cross-references:** PRD.md v3.0, SCREEN-MAP.md v3.0, API.md v3.0, SCHEMA.md v3.0, AGENTS.md v3.0

---

## 1. Overview — unchanged

Five deliverables, one backend, one VPS. See v1.0 §1 (stack, deliverable list) — unchanged in this revision.

## 2. Backend architecture — two layers, lender rules now hardcoded per module

The two-layer pattern from v1.0 (`api/<deliverable>/` thin over `domains/<name>/` fat) is unchanged. What changes is the internal shape of the `lenders` and `eligibility-engine` domains.

```
src/
  api/                              ← unchanged from v1.0 — thin, one folder per deliverable
    customer-app/ ... dealer-app/ ... staff-app/ ... staff-panel/ ...
    admin-panel/
      controllers/
        lenders.controller.js       ← now handles only: list, PATCH active/priority, GET rules-reference
        (policies.controller.js REMOVED — no policy CRUD surface exists)

  domains/
    eligibility-engine/
      orchestrator.js                ← calls every active lender module, collects + ranks results
      repository.js                  ← writes eligibility_evaluations rows

    lenders/
      registry.js                    ← maps `lender.code` (from DB) → the correct module's evaluate()/getRulesSummary()
      shared/
        evaluator-interface.js       ← documents the fixed contract (see §3) — not executable logic itself
      sk-finance/
        rules.js                     ← hardcoded constants: min/max age, CIBIL, LTV, customer types, co-applicant rule
        documents.js                 ← hardcoded required-document lists per party
        evaluate.js                  ← SK's 10-step decision logic, written as plain sequential/branching code
        index.js                     ← exports { evaluate, getRulesSummary, RULES_VERSION }
      iti-finance/
        rules.js
        documents.js
        evaluate.js
        index.js
      # future lenders: bajaj-finserv/, mahindra-finance/, tata-capital/, indusind-bank/ — each added the same way, one folder per lender, by CKR, as its own scoped work item

    lenders-admin/
      service.js                     ← the ONLY thing DB-backed here: active/inactive toggle, priority rank
      repository.js                  ← reads/writes the `lenders` table (identity + status only)

    loan-applications/ · commissions/ · wallet/ · documents/ · auth/   ← unchanged from v1.0

  jobs/
    j1-auto-block-90days.js          ← unchanged
    # j4-policy-effective-sweep.js REMOVED — no versioned policy rows to sweep

  config/ · shared/ · app.js          ← unchanged from v1.0
```

**What this buys, and what it costs — recorded per house process for major architecture decisions:**
- **Gain:** each lender's rules are plain, readable, testable code — no generic JSONB interpreter to reason about. A developer opens `sk-finance/evaluate.js` and reads the 10 steps top to bottom, matching the client's rule sheet almost line for line.
- **Cost, accepted knowingly:** a rule change or new lender is now a CKR code change + deploy, not an admin form submission. This is the client's explicit, recorded preference (PRD.md v3.0 §3) — maintenance-as-a-service is the intended business model here, not a gap to close later.

## 3. The fixed lender-module interface

Every folder under `domains/lenders/<code>/` must export exactly this shape from its `index.js` — nothing more, nothing less. This is what keeps N lender modules from turning into N inconsistent implementations:

```js
module.exports = {
  RULES_VERSION: 'sk-v1.0',           // bump on every rule change — this is what eligibility_evaluations pins
  evaluate(applicantInput) {
    // pure function: applicantInput in, verdict out. No DB calls inside evaluate() itself —
    // repository reads/writes happen in the orchestrator, not inside a lender module.
    return {
      result: 'eligible' | 'not_eligible' | 'incomplete',
      failed_rules: [ /* human-readable strings */ ],
      missing_items: [ /* human-readable strings */ ],
      required_documents: [ /* derived checklist for this applicant's situation */ ],
    };
  },
  getRulesSummary() {
    // returns a human-readable object powering Admin Panel's read-only Lender Rules Reference (A6)
    return { minAge, maxAge, minCibil, ltvRange, customerTypes, coApplicantRule, documentLists, guarantorConditions };
  },
};
```

**Rules:**
- `evaluate()` is a **pure function** — same input always produces the same output. No side effects, no DB access inside it. This is what makes each module trivially unit-testable (feed it a fixed applicant object, assert the verdict) — the exact debugging simplicity that motivated this rework.
- One module never imports another lender's internals. If two lenders happen to share logic (e.g. identical document-list shape), share it via `domains/lenders/shared/`, not by reaching into a sibling folder.
- `orchestrator.js` is the only caller of any lender module's `evaluate()` — no controller, no other domain calls a lender module directly.
- Adding a lender = adding a new folder implementing this interface + one line in `registry.js` mapping `code → module`. Never restructure existing lenders to add a new one.

## 4. What changing a rule actually touches (revised from v1.0 §3)

| Change type | v2.0 (policy-as-data) | v3.0 (hardcoded, current) |
|---|---|---|
| Lender changes a CIBIL cutoff | One DB row, no deploy | One line in that lender's `rules.js`, `RULES_VERSION` bump, deploy |
| New lender onboarded | Admin form, no deploy | New folder + module, code review, deploy — scoped as its own work item |
| Lender paused/reordered | DB row (same as before) | **Still just a DB row** — `is_active`/`priority` stay data, unchanged |
| New *kind* of condition (not covered by existing lenders) | Extend the generic JSONB interpreter | Write it directly into that lender's `evaluate.js` — no interpreter to extend |

This table is what should sit at the top of any client-facing explanation of "why did this change require a deploy" — it's the direct, honest trade-off of the L11 decision.

## 5. Secrets gateway — unchanged from v1.0 §4

## 6. Frontend architecture — unchanged from v1.0 §5

No frontend app's code changes as a result of this rework — the eligibility check request/response contract is identical; only the backend implementation behind it changed.

## 7. Deployment topology — unchanged from v1.0 §6, see DEPLOYMENT.md v3.0

## 8. Locked Decisions

- **L-ARCH-1 through L-ARCH-4:** unchanged from v1.0 (two-layer backend, Staff exclusion, Staff Panel separate codebase, single-source-of-truth-per-domain).
- **L-ARCH-5 (new):** lender credit rules are hardcoded per-lender modules under `domains/lenders/<code>/`, each implementing the fixed interface in §3. No generic rule interpreter exists in this codebase.
- **L-ARCH-6 (new):** lender `is_active` and `priority` remain the only DB-editable lender fields; everything else about a lender's behavior is code.
- **L-ARCH-7 (new):** every lender module exports `RULES_VERSION`, bumped on every rule change, pinned into every `eligibility_evaluations` row that module produces — this is the audit trail replacing the old versioned-policy-row mechanism.

---

**Document owner:** CKR Technologies — Delivery Lead
