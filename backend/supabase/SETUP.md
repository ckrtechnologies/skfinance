# Supabase Setup — Shreeja Finance Platform

## How to run

### Option A — Supabase CLI (Recommended for CI/CD)
```bash
# From the backend/ folder
supabase db push --db-url "postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
```

### Option B — Manual via Supabase Dashboard SQL Editor
Run each file **in order** — paste and execute one at a time:

1. `0001_enums.sql`
2. `0002_identity.sql`
3. `0003_lenders_policies.sql`
4. `0004_pipeline.sql`
5. `0005_money.sql`
6. `0006_platform.sql`
7. `0007_rls.sql` _(stub — no-op, RLS not used)_
8. `0008_indexes.sql`
9. `seed.sql`

> **Note on RLS:** Row-Level Security is intentionally not enabled. All access control is enforced in the Express middleware layer (`authenticate → role gate → domain service`). The backend connects to Supabase exclusively using the **service-role key** (server-to-server only — the anon key is never exposed to clients).

---

## After running migrations

### Create the admin user
1. Supabase Dashboard → **Authentication → Users → Add user**
   - Email: `admin@shreeja.finance`
   - Password: (set a strong one; change after first login)
2. Copy the UUID shown for the new user
3. Run in SQL editor (replace UUID):
```sql
INSERT INTO profiles (auth_user_id, role, full_name, email, is_active)
VALUES (
  'PASTE-UUID-HERE',   -- auth.users.id from step 2
  'admin',
  'Shreeja Admin',
  'admin@shreeja.finance',
  TRUE
);
```

---

## CDN file storage (VPS Nginx)

Document uploads are stored on the VPS filesystem, **not** in Supabase Storage.

### Directory layout
```
Production: /var/www/skfinance/cdn/loans/<application_no>/<party>/<doc_type>/<uuid>.<ext>
Local dev:  ./cdn/loans/<application_no>/<party>/<doc_type>/<uuid>.<ext>
```

### What gets stored in the DB
Only the **relative path** (everything after the base dir) is stored in `documents.cdn_path`, e.g.:
```
loans/SF-2026-00001/applicant/aadhaar/f3a1bc92.pdf
```
Full public URL = `CDN_BASE_URL + "/" + cdn_path`

### Production: create directories + set permissions
```bash
# On the VPS
sudo mkdir -p /var/www/skfinance/cdn/loans
sudo chown -R www-data:www-data /var/www/skfinance/cdn
sudo chmod -R 750 /var/www/skfinance/cdn
```

### Production: Nginx config for the CDN location
Add inside the `server {}` block of your Nginx site config:
```nginx
# CDN — serves uploaded loan documents
# Access is validated upstream by Express (signed token or session check);
# Nginx serves the file directly after Express sets X-Accel-Redirect.
location /cdn/ {
    internal;                                      # blocks direct browser access
    alias /var/www/skfinance/cdn/;
    expires 1h;
    add_header Cache-Control "private, no-store";  # documents are private
}
```
The Express `documents` service uses `X-Accel-Redirect` to hand off the file to Nginx without streaming through Node.

### Local dev: create the directory
```bash
# From the backend/ project root
mkdir -p ./cdn/loans
```
Local dev serves files directly from Express (no Nginx needed):
```
GET /cdn/loans/SF-2026-00001/applicant/aadhaar/abc123.pdf
→ Express streams from ./cdn/loans/...
```

---

## .env variables needed in backend
```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # server-to-server only; never sent to clients
JWT_SECRET=<your-jwt-secret>                    # from Supabase project settings → JWT

# CDN
CDN_BASE_DIR=/var/www/skfinance/cdn            # production VPS path (use ./cdn for local dev)
CDN_BASE_URL=https://cdn.shreeja.finance        # public base URL served by Nginx (use http://localhost:4001/cdn for local dev)
```

---

## What's seeded

| Entity | Count | Notes |
|---|---|---|
| Lenders | 6 | SK Finance + ITI Finance active; 4 others inactive (pending O2) |
| Lender policies | 4 | SK New Car v1, SK Used Car v1, ITI New Car v1, ITI Used Car v1 — all active |
| Policy documents | ~40 rows | Applicant + co-applicant docs per policy |
| Settings | 4 | commission_slab, ninety_day_window, stale_draft_window, withdrawal_reminder_hours |
| Valuation slabs | 18 | 6 age bands × 3 vehicle categories |
| Admin profile | 0 | Manual step required (needs auth.users ID) |
