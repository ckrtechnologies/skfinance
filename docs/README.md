# Shreeja Finance Platform — Project Docs (CKR Process)

> CKR Technologies · 02 Aug 2026 · Doc set **v3.0**
> **Major change this version:** the multi-lender eligibility engine moved from **policy-as-data** (admin-editable, JSONB-driven) to **hardcoded per-lender service modules** (code-driven, CKR-maintained). See PRD.md v3.0 §3 for the full reasoning and trade-off, recorded as locked decisions L11/L12/L16/L17.

## Document set & status

| Doc | Tier | Version | Status |
|---|---|---|---|
| `PRD.md` | Core | v3.0 | Draft — **needs client sign-off, gates everything** |
| `SCREEN-MAP.md` | Core | v3.0 | Draft — **needs client sign-off; no design/build before** |
| `DESIGN.md` | Core | v1.1 | Mostly carried over from v1.0; two new components for the simplified Admin lender screens |
| `API.md` | Core | v3.0 | Draft — freezes after Screen Map signs |
| `AGENTS.md` | Core | v3.0 | Ready — copy into every repo root at scaffold |
| `SCHEMA.md` | 2 | v3.0 | Draft — gates migrations |
| `ARCHITECTURE.md` | 2 | v2.0 | Final — hardcoded lender-module pattern locked (L-ARCH-5..7) |
| `AUTH-MATRIX.md` | 2 | v3.0 | Draft — gates RLS + guards |
| `JOBS.md` | 2 | v3.0 | Draft — J1–J3 (J4 removed) |
| `DEPLOYMENT.md` | 2 | v3.0 | Draft — topology unchanged, new lender-deploy runbook note |
| INTEGRATIONS.md | 2 | — | Not created yet — springs into existence if O3 resolves to Aadhaar eSign or a payment gateway enters scope |

## Open items blocking sign-off

| # | Item | Owner |
|---|---|---|
| O1 | Commission slab basis (whole amount vs marginal above ₹10L) | Prateek |
| O2 | Rule sheets: Bajaj / Mahindra / Tata Capital / IndusInd + CV sheets — **each is now a new lender-module build**, scoped per sheet | Prateek |
| O3 | E-sign decision | Prateek |
| O4 | OTP/SMS provider account | Prateek |
| O5 | Brand asset confirmation | Prateek |
| **O6** | **Rule-change process/SLA** — how a client-requested rule change gets submitted, scoped, and turned around by CKR (new in v3.0, see PRD.md §8) | Prateek + CKR |

## Antigravity kickoff order (after PRD + Screen Map sign-off)

1. Scaffold `shreeja-backend`; place `AGENTS.md` + `docs/` in root.
2. Migrations `0001`–`0008` + `seed.sql` per SCHEMA.md v3.0 §5 (lender identity rows only — **no policy seed step**, rules ship as code).
3. Backend build order: auth → `domains/lenders/sk-finance/` + `domains/lenders/iti-finance/` (build + unit test each against its rule sheet) → `domains/eligibility-engine/orchestrator.js` → loan-applications (state machine + disbursement) → commissions/wallet → documents → notifications → jobs J1–J3. Postman-verify every endpoint vs seed before frontend work.
4. Frontends, same order as v2.0: **Customer App → Staff App → Staff Panel → Dealer App → Admin Panel**.
5. QA → UAT → store release ×3 + panels live → handover.

## Repos — unchanged

`shreeja-backend` · `shreeja-customer-app` · `shreeja-dealer-app` · `shreeja-staff-app` · `shreeja-staff-panel` · `shreeja-admin-panel`
