# AUTH-MATRIX.md — Shreeja Finance Platform
**Version:** v3.0 · **Date:** 02 Aug 2026 · **Companions:** SCHEMA.md v3.0, API.md v3.0
**Change from v2.0:** "Lender policies" row removed (no longer exists as an editable resource). "Lenders" row narrowed to reflect active/priority-only admin writes.

Roles: customer, dealer, staff (app+panel shared account), admin. Auth models unchanged from v2.0 §top.

## Permission matrix (revised rows only — all others unchanged from v2.0)

| Resource | Customer | Dealer | Staff | Admin |
|---|---|---|---|---|
| Lenders (identity, active, priority) | — | R active | R active | R/W (active + priority only — no rule content exists here) |
| Lender rules reference (read-only, code-derived) | engine-mediated only | engine-mediated only | engine-mediated only | R (view only, A6 — no write path exists for anyone) |
| ~~Lender policies~~ | — | — | — | **removed — resource no longer exists** |
| ~~Policy documents~~ | — | — | — | **removed — resource no longer exists** |

All other rows (applications, stage entries, commissions, wallet ledger, withdrawal requests, valuation slabs/settings, notifications, audit log, staff/dealer accounts) — unchanged from v2.0.

## Hard rules — unchanged from v2.0, plus:

8. **No role, including admin, has a write path to lender credit rules through the application.** The only way rules change is a CKR code deploy. This is enforced by absence — there is no `PATCH /admin/lenders/:code/rules` endpoint, no policy table to write to, and the admin UI's Lender Settings screen (A7) accepts only `is_active`/`priority` fields (API.md v3.0 §5 — the endpoint itself rejects any other field with `VALIDATION_ERROR`).
