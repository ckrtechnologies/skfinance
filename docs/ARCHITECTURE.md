# ARCHITECTURE.md
**Project:** Shreeja Finance Private Limited — Multi-App Vehicle Loan Platform
**Client contact:** Prateek
**Prepared by:** CKR Technologies
**Version:** v1.0
**Date:** 02 Aug 2026
**Cross-references:** PRD.md, SCREEN-MAP.md, API.md, SCHEMA.md, AGENTS.md, JOBS.md

---

## 1. Overview

Five deliverables run against one shared Supabase/Express backend on a single CKR VPS:

| # | Deliverable | Platform | Users |
|---|---|---|---|
| 1 | Customer App | React Native (bare CLI) | End customers applying for a loan |
| 2 | Dealer App | React Native (bare CLI) | Channel partner dealers — leads, status, commissions, wallet |
| 3 | Staff App | React Native (bare CLI) | Shreeja Finance staff — leads, status, performance (no commission/wallet) |
| 4 | Staff Panel | React + Vite (web) | Same as Staff App, desktop surface |
| 5 | Admin Panel | React + Vite (web) | Shreeja Finance admin/ops — lenders, files, payouts, dealers, staff |

Marketing website is delivered separately and out of scope for this architecture.

**Stack (house default, per `ckr-mobile-project-process`):**
- Mobile: React Native bare CLI, plain JavaScript (no TypeScript), Redux Toolkit + RTK Query
- Web panels: React + Vite SPA, static-served via Nginx
- Backend: Express.js + Supabase (Postgres, Auth, RLS), on CKR VPS behind Nginx
- No payment gateway in v1 (commission payouts are manual, ledger-tracked — see §5)

---

## 2. Backend architecture — two layers, not one

The house pattern (`domains/<name>/routes → controller → service → repository → validation`) is extended for this project with an additional **per-deliverable API layer** on top of it. This is a deliberate, client-requested deviation from the pure single-layer house pattern, recorded as a Locked Decision (§7).

**Why two layers:** the client asked for one API folder per deliverable app so each app's endpoints are easy to find and reason about independently. But several rules in this system — eligibility logic, commission %, lender policy — must never exist in more than one place, because a lender changing their CIBIL cutoff must not require updating logic in five separate app folders. The two-layer split gets both: a clean per-app surface, and a single source of truth underneath it.

```
src/
  api/                              ← thin, one folder per deliverable
    customer-app/
      routes.js
      controllers/
        eligibility.controller.js
        loan-application.controller.js
        documents.controller.js
    dealer-app/
      routes.js
      controllers/
        leads.controller.js
        loan-status.controller.js
        commissions.controller.js
        wallet.controller.js
    staff-app/
      routes.js
      controllers/
        leads.controller.js
        loan-status.controller.js
        performance.controller.js       ← no commissions/wallet controller exists here
    staff-panel/
      routes.js
      controllers/
        leads.controller.js
        loan-status.controller.js
        performance.controller.js       ← same as staff-app, web surface
    admin-panel/
      routes.js
      controllers/
        lenders.controller.js
        policies.controller.js
        loan-files.controller.js
        commissions.controller.js
        payouts.controller.js
        dealers.controller.js
        staff.controller.js

  domains/                          ← fat, business logic lives exactly once
    eligibility-engine/
      service.js
      rule-evaluator.js
      repository.js
      validation.js
    lenders/
      service.js
      repository.js
      validation.js
    loan-applications/
      service.js                    ← includes stage tracker (CIBIL→Bank→Valuation→FI→Approval→Disbursement)
      repository.js
      validation.js
    commissions/
      service.js                    ← 1.5% ≤ ₹10,00,000 / 2% above, single calculation point
      repository.js
      validation.js
    wallet/
      service.js
      repository.js
      validation.js
    documents/
      service.js
      repository.js
      validation.js
    auth/
      service.js
      rbac.js                       ← role checks: customer / dealer / staff / admin

  jobs/
    j1-auto-block-90days.js         ← see JOBS.md

  config/
    secrets.js                      ← only file allowed to read process.env (see §4)
    database.js                     ← scoped Supabase client export

  shared/
    middleware/                     ← auth, error handling, request logging
    utils/

  app.js                            ← imports each api/<deliverable>/routes.js only
```

**Rules that make this hold together:**
- Controllers in `api/*` are thin — they validate the request shape for that app's context and call into `domains/*` services. They never contain business rules.
- Each `domains/<name>/repository.js` is the *only* file touching that domain's Supabase tables — no controller or another domain's service queries a table directly.
- A domain only imports from itself and `shared/` — never reaches into another domain's internals. `api/dealer-app/controllers/commissions.controller.js` and `api/admin-panel/controllers/commissions.controller.js` both call `domains/commissions/service.js` — never duplicate the calculation.
- **Staff App and Staff Panel structurally cannot expose commissions or wallet** — there is no `commissions.controller.js` or `wallet.controller.js` in either folder. The "staff gets no wallet" rule is enforced by what doesn't exist in the API surface, not by a conditional that could be missed.
- Adding a domain = copying the fixed file shape (`service.js`, `repository.js`, `validation.js`) and registering one route file in `app.js` — never restructuring what exists.

---

## 3. What changing a rule actually touches

| Change type | Example | What gets updated |
|---|---|---|
| Lender policy data | ITI Finance raises CIBIL cutoff 650→680 | One row in `lenders`/`lender_policies` tables via Admin Panel — no code, no frontend change |
| Business logic | New conditional-trigger type added to the rule evaluator | `domains/eligibility-engine/rule-evaluator.js` only — every app consuming eligibility checks gets it automatically |
| Commission % | Slab changes from 1.5%/2% to new rates | `domains/commissions/service.js` only |
| API contract | New field added to an eligibility response | The one `domains/eligibility-engine` service **and** only the specific `api/*` controllers/apps that need to read or display that field |

This table exists to make the earlier open question concrete: most day-to-day changes (lender rules, commission %) touch exactly one file and zero frontend apps.

---

## 4. Secrets gateway

Exactly one file, `src/config/secrets.js`, is allowed to read `process.env`. It exposes scoped, named exports:

- Most domains only get the Supabase client (via `config/database.js`)
- `wallet`/`commissions` domains get payout-related secrets if/when a payment gateway is introduced post-v1
- `auth` domain gets the JWT secret

Enforced via ESLint `no-restricted-properties`, banning `process.env` outside `src/config/**`. One `.env` file per environment — the gateway file limits blast radius, not separate env files per domain.

---

## 5. Frontend architecture (all 5 apps, same shape)

```
src/
  domains/
    <name>/
      screens/ (or pages/ for web)
      slice.js          ← RTK slice, if the domain has client state
      api.js             ← RTK Query endpoints for this domain
  shared/
    theme/
    components/
    navigation/          ← or router/ for web
    store/                ← RTK store + api base
```

A domain only imports from itself and `shared/`. Which domains exist per app follows directly from §2 — e.g. Dealer App has `wallet/` and `commissions/` domains, Staff App and Staff Panel do not.

---

## 6. Deployment topology

- Single CKR VPS, Nginx as reverse proxy / static host
- Express backend: one process (PM2-managed), all 5 `api/*` route groups mounted under it
- Web panels (Admin Panel, Staff Panel): static builds served by Nginx
- Mobile apps (Customer, Dealer, Staff): store-distributed, call the same backend over HTTPS
- Supabase: hosted Postgres + Auth + RLS, not self-hosted on the VPS
- Full detail in DEPLOYMENT.md

---

## 7. Locked Decisions

- **L-ARCH-1:** Backend uses a two-layer structure — `api/<deliverable>/` (thin, one folder per app) over `domains/<name>/` (fat, shared business logic) — as a project-specific extension of the house domain-driven pattern, approved by client.
- **L-ARCH-2:** Staff App and Staff Panel share identical backend domain access (leads, loan status, performance) and are structurally excluded from `commissions` and `wallet` domains — no controller for either exists in their `api/*` folders.
- **L-ARCH-3:** Staff Panel is a separate React + Vite web codebase, not a restricted-role view inside Admin Panel.
- **L-ARCH-4:** Eligibility engine, lender policies, and commission calculation each exist in exactly one `domains/*` service — no per-app duplication, regardless of how many `api/*` folders consume them.

---

**Document owner:** CKR Technologies — Delivery Lead
