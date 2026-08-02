# AGENTS.md — Shreeja Finance Platform
> CKR Technologies · read automatically by Antigravity at session start. Design comes from `docs/DESIGN.md`, data from `docs/API.md`, behavior from here. **Version v2.0 · 02 Aug 2026.** Copy this file into every repo's root.

---

## 1. Project Context

- **Project:** Shreeja Finance — multi-lender vehicle loan platform (5 deliverables + backend)
- **Client:** Shreeja Finance Private Limited (Prateek)
- **Docs (build only what they say):** `docs/PRD.md` v2.0 · `docs/SCREEN-MAP.md` v2.0 · `docs/DESIGN.md` · `docs/API.md` v2.0 · `docs/SCHEMA.md` v2.0 · `docs/ARCHITECTURE.md` v1.0 · `docs/AUTH-MATRIX.md` v2.0 · `docs/JOBS.md` v2.0 · `docs/DEPLOYMENT.md` v2.0
- **Roles:** customer, dealer, staff, admin. Repo ↔ role mapping per SCREEN-MAP sections.
- New screens/fields/endpoints not in the docs = change request. Flag, never silently add.

## 2. Stack & Versions

- Mobile: React Native **bare CLI** — never Expo/expo-*. Plain JavaScript, no TypeScript; JSDoc for type hints.
- Navigation: `@react-navigation/native` (native-stack + bottom-tabs).
- State/data: **Redux Toolkit** — RTK slices (client state) + **RTK Query** (all server data). No other data library.
- Web panels: React + Vite SPA.
- Backend: Express.js + Supabase (Postgres/Auth/Storage/RLS). Frontends touch Supabase **only through `src/domains/*/api.js` RTK Query files** hitting our Express API — never `supabase.from()` in a screen.
- No new npm dependency without listing and asking first, except libraries named in `DESIGN.md` §11.

## 3. Design Rules (non-negotiable)

1. Read `docs/DESIGN.md` fully before any UI work.
2. No raw hex, literal px sizes, or arbitrary spacing — everything from `src/shared/theme/`. Missing token → propose in DESIGN.md §1 first.
3. Every data screen: loading (skeleton), empty, error+retry, offline. Every control: default/pressed/disabled/loading; buttons keep width in loading state.
4. Reuse `shared/components` before creating; new shared component goes to `shared/` first, then used.
5. Copy per DESIGN.md §6: sentence case, verb+object buttons, no raw error codes; strings from the strings file.
6. Touch targets ≥ 44×44; safe areas via `react-native-safe-area-context`; keyboard via `react-native-keyboard-controller`.
7. Before marking a screen complete, self-check against DESIGN.md §10 and report which boxes pass.

## 4. API & Data Rules

1. Contract is `docs/API.md` v2.0 — never invent an endpoint, field, or response shape. Missing → stop and ask.
2. All mutations show loading on the trigger and disable while in flight — double-submits corrupt append-only tables.
3. **Append-only entities are never edited/deleted in any UI:** stage entries, eligibility evaluations, wallet ledger, commissions, audit rows. No edit buttons exist; a task that seems to need one is a flag, not a feature.
4. Customer App must never render internal remarks, staff names, or evaluation internals — the API projects them out; if any leak through, that's a backend bug to flag.
5. Dealer App must never receive/render other dealers' data — same rule: flag, don't display.
6. Staff App and Staff Panel have **no commission or wallet code paths at all** (PRD L8). Do not scaffold "hidden" versions.

## 5. Code Conventions

PascalCase components (file matches), camelCase functions, kebab-case non-component files; one component per file. Domain-driven frontend layout per ARCHITECTURE.md §5: `src/domains/<name>/{screens|pages, slice.js, api.js}` + `src/shared/`. A domain imports only itself + shared. Every async path handled (RTK Query states or try/catch). One-line JSDoc on non-obvious exports.

## 6. Backend Rules (`shreeja-backend`)

1. Two-layer structure per ARCHITECTURE.md: thin `api/<deliverable>/` controllers → fat `domains/<name>/` services; a domain's `repository.js` is the only file touching its tables; cross-domain = service→service.
2. `zod` validation on every route before any DB touch. Response `{ success, data?, error:{ code, message } }` — codes from API.md, never raw stacks.
3. RLS on every table, no exceptions; schema changes via migrations only; never modify an applied migration.
4. `process.env` only in `src/config/secrets.js` (ESLint-enforced); domains import scoped exports.
5. Pipeline state machine lives in `domains/loan-applications/service.js` alone: stage order, `WRONG_STAGE`/`APPLICATION_TERMINAL`/`LIMIT_BLOCKED_90D`, and the **disbursement transaction** that atomically writes the stage entry, sets status, creates the commission (slab 1.5% ≤ ₹10,00,000 / 2% above — computed only in `domains/commissions/service.js`), appends the ledger row, and creates notifications.
6. Disbursement re-verifies the 90-day window at write time — never rely on J1 alone.
7. The eligibility engine (`domains/eligibility-engine/`) is the only interpreter of `lender_policies.conditional_rules` jsonb; every evaluation appends `eligibility_evaluations` pinning `lender_policy_id`. Never inline lender rules anywhere else.
8. Lender policies: draft-edit → publish-activate only; active/retired immutable; publishing versions the predecessor out (API.md §5).
9. Every stage entry, payout, adjustment, policy publish, and settings change writes an `audit_log` row via the service layer.
10. Jobs J1–J4 call services, never raw SQL; idempotent; failures never crash the process (JOBS.md).

## 7. What the Agent Must Never Do

- Never commit secrets/`.env`; never modify an applied migration.
- Never change `src/shared/theme/` without DESIGN.md §1 changing first (and flagging).
- Never build edit/delete for stage entries, evaluations, commissions, ledger, or audit rows (PRD L4).
- Never compute or "fix" commission amounts client-side; never create a commission outside the disbursement transaction.
- Never add payment-gateway/EMI/money-movement code (PRD L6) — payouts are manual + ledger-recorded.
- Never add CIBIL/KYC/valuation API calls — manual in v1 (PRD L5).
- Never add push/SMS beyond the OTP provider — notifications are in-app rows only.
- Never duplicate lender rule logic into an app folder or frontend — engine only (L11, L-ARCH-4).
- Never add commission/wallet surface to Staff App/Panel (L8).
- Never let Dealer app show other dealers' data or Customer app show internal fields.
- Never skip/silence ESLint to force a build; never add anything absent from SCREEN-MAP/API.md without flagging.

## 8. When Unsure

Stop and ask a specific question instead of guessing a plausible default. *Anything that violates these documents is a bug, even if it looks fine.*
