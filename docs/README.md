# Shreeja Finance Platform — Project Docs (CKR Process)

> CKR Technologies · 02 Aug 2026 · Doc set **v2.0** (supersedes the v1.x "SK Finance" 4-app set — SK Finance is a *lender partner*, Shreeja Finance is the client/platform)

## Document set & status

| Doc | Tier | Version | Status |
|---|---|---|---|
| `PRD.md` | Core | v2.0 | Draft — **needs client sign-off, gates everything** |
| `SCREEN-MAP.md` | Core | v2.0 | Draft — **needs client sign-off; no design/build before** |
| `DESIGN.md` | Core | v1.0 (carried over) | Valid from previous delivery. Staff Panel uses the same web tokens as Admin Panel. Re-confirm brand assets (O5). |
| `API.md` | Core | v2.0 | Draft — freezes after Screen Map signs |
| `AGENTS.md` | Core | v2.0 | Ready — copy into every repo root at scaffold |
| `SCHEMA.md` | 2 | v2.0 | Draft — gates migrations |
| `ARCHITECTURE.md` | 2 | v1.0 | Final — two-layer backend locked (L-ARCH-1..4) |
| `AUTH-MATRIX.md` | 2 | v2.0 | Draft — gates RLS + guards |
| `JOBS.md` | 2 | v2.0 | Draft — J1–J4 |
| `DEPLOYMENT.md` | 2 | v2.0 | Draft |
| INTEGRATIONS.md | 2 | — | **Intentionally not created.** Springs into existence only if O3 resolves to Aadhaar eSign (Digio/Leegality) or a payment gateway enters scope. |
| Tier 3 (AI docs) | 3 | — | Not applicable |

## Open items blocking sign-off

| # | Item | Owner |
|---|---|---|
| O1 | Commission slab basis (whole amount vs marginal above ₹10L) — docs assume whole amount | Prateek |
| O2 | Rule sheets: Bajaj / Mahindra / Tata Capital / IndusInd + Commercial Vehicle sheets | Prateek |
| O3 | E-sign decision (Aadhaar eSign vs click-to-sign+OTP) | Prateek |
| O4 | OTP/SMS provider account | Prateek |
| O5 | Brand asset confirmation for Staff App/Panel | Prateek |

## Antigravity kickoff order (after PRD + Screen Map sign-off)

1. Scaffold `shreeja-backend` from CKR starter; place `AGENTS.md` + `docs/` in root.
2. Migrations `0001`–`0008` + `seed.sql` per SCHEMA.md §5 (SK + ITI policies seeded).
3. Backend build order: auth → lenders/policies → eligibility-engine → loan-applications (state machine + disbursement txn) → commissions/wallet → documents → notifications → jobs J1–J4. Postman-verify every endpoint vs seed before any frontend work.
4. Frontends, per Phase-5 order: **Customer App → Staff App → Staff Panel → Dealer App → Admin Panel** (Admin last — needs everything else's data flowing).
5. QA on real devices (2 Android + 1 iPhone, slow network) → UAT (TestFlight + Play Internal) → store release ×3 + panels live → handover.

## Repos

`shreeja-backend` · `shreeja-customer-app` · `shreeja-dealer-app` · `shreeja-staff-app` · `shreeja-staff-panel` · `shreeja-admin-panel`
