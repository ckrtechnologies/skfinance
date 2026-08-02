# DEPLOYMENT.md — Shreeja Finance Platform
**Version:** v2.0 · **Date:** 02 Aug 2026 · **Companion:** ARCHITECTURE.md v1.0

## Topology

- **CKR VPS** (Ubuntu), Nginx reverse proxy + static host, PM2 process manager.
- **Backend:** single Express process (`shreeja-api`) under PM2, all five `api/<deliverable>` route groups mounted. PM2 cron entries for J1–J4.
- **Web panels:** two static builds served by Nginx —
  - `admin.<domain>` → Admin Panel (React+Vite `dist/`)
  - `staff.<domain>` → Staff Panel (React+Vite `dist/`)
- **API:** `api.<domain>` → proxied to Express.
- **Mobile apps:** Customer, Dealer, Staff — Play Store + App Store, all pointing at `api.<domain>`.
- **Supabase:** hosted project (Postgres + Auth + Storage + RLS). Not self-hosted.
- **TLS:** Certbot/Let's Encrypt on all three subdomains, auto-renew.

## Environments

| Env | Backend | Panels | DB |
|---|---|---|---|
| dev | `api-dev.<domain>` (PM2 app 2) | `admin-dev` / `staff-dev` subdomains | Supabase dev project |
| prod | `api.<domain>` | `admin` / `staff` | Supabase prod project |

Separate Supabase projects per env — never shared. Seed data applied to both; prod seed excludes test accounts.

## Repos & CI

| Repo | Deliverable |
|---|---|
| `shreeja-backend` | Express API + jobs + migrations |
| `shreeja-customer-app` | RN |
| `shreeja-dealer-app` | RN |
| `shreeja-staff-app` | RN |
| `shreeja-staff-panel` | React+Vite |
| `shreeja-admin-panel` | React+Vite |

Deploy flow (backend): push → SSH pull on VPS → `npm ci` → run pending Supabase migrations (CLI) → `pm2 reload shreeja-api` (zero-downtime). Panels: build in CI, rsync `dist/` to Nginx roots. Mobile: manual store releases per release checklist.

## Env & secrets

One `.env` per environment on the VPS (never in repo). Read only via `src/config/secrets.js` (ARCHITECTURE.md §4). Keys: Supabase URL + service key, JWT secret, OTP provider key (O4), CORS origins (admin/staff subdomains + app schemes).

## Ops runbook (minimum)

- `pm2 logs shreeja-api` + daily logrotate; Nginx access/error logs retained 30 days.
- Supabase automated backups on (daily); before every migration on prod, take a manual backup point.
- Health endpoint `GET /v1/health` (checks DB round-trip) — UptimeRobot ping every 5 min.
- Rollback: PM2 keeps previous release dir; `pm2 reload` back + reverse migration only via a new down-migration (never edit applied ones).
