-- WhatsApp Marketing Module Migration

-- 1. Ensure `dealers` table has the required columns.
-- Assuming `dealers` already exists (as per standard platform setup).
-- If it doesn't, this will fail. If it does, we safely add these columns.
ALTER TABLE dealers ADD COLUMN IF NOT EXISTS phone_e164 VARCHAR(20) UNIQUE;
ALTER TABLE dealers ADD COLUMN IF NOT EXISTS wa_opt_in BOOLEAN DEFAULT TRUE;
ALTER TABLE dealers ADD COLUMN IF NOT EXISTS opted_out_at TIMESTAMP WITH TIME ZONE NULL;

-- 2. Create `wa_templates` table
CREATE TABLE IF NOT EXISTS wa_templates (
  id BIGSERIAL PRIMARY KEY,
  meta_template_id VARCHAR(64) UNIQUE,
  name VARCHAR(120) NOT NULL,
  language VARCHAR(16) NOT NULL,
  category VARCHAR(50) NOT NULL,
  status VARCHAR(50),
  header_format VARCHAR(50) DEFAULT 'NONE',
  header_var_count INT DEFAULT 0,
  body_var_count INT DEFAULT 0,
  raw_components JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create `wa_media` table
CREATE TABLE IF NOT EXISTS wa_media (
  id BIGSERIAL PRIMARY KEY,
  file_name VARCHAR(255),
  mime_type VARCHAR(100),
  size_bytes BIGINT,
  kind VARCHAR(50),
  media_id VARCHAR(255) NULL,       -- from /media (for sending)
  public_url VARCHAR(500) NULL,     -- Supabase CDN url
  uploaded_by BIGINT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create `campaigns` table
CREATE TABLE IF NOT EXISTS campaigns (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  template_id BIGINT NOT NULL REFERENCES wa_templates(id),
  media_id BIGINT NULL REFERENCES wa_media(id),
  header_var_map JSONB,     -- ["city"]
  body_var_map JSONB,       -- ["name","discount"]
  audience_filter JSONB,    -- {"state":"MH","category":"GOLD"}
  status VARCHAR(50) DEFAULT 'draft', -- draft, queued, running, completed, failed, cancelled
  total_count INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  delivered_count INT DEFAULT 0,
  read_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  scheduled_at TIMESTAMP WITH TIME ZONE NULL,
  created_by UUID NULL,
  idempotency_key VARCHAR(80) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create `campaign_messages` table
CREATE TABLE IF NOT EXISTS campaign_messages (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT NOT NULL REFERENCES campaigns(id),
  dealer_id UUID NOT NULL, -- references dealers(id)
  to_phone VARCHAR(20) NOT NULL,
  payload JSONB,
  wamid VARCHAR(255) NULL,
  status VARCHAR(50) DEFAULT 'queued', -- queued, sent, delivered, read, failed
  error_code VARCHAR(80) NULL,
  error_message TEXT NULL,
  attempts INT DEFAULT 0,
  sent_at TIMESTAMP WITH TIME ZONE NULL,
  delivered_at TIMESTAMP WITH TIME ZONE NULL,
  read_at TIMESTAMP WITH TIME ZONE NULL,
  UNIQUE(campaign_id, dealer_id)
);
CREATE INDEX IF NOT EXISTS idx_wamid ON campaign_messages(wamid);

-- 6. Create `wa_events` table
CREATE TABLE IF NOT EXISTS wa_events (
  id BIGSERIAL PRIMARY KEY,
  wamid VARCHAR(255),
  event_type VARCHAR(50),
  raw JSONB,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
GRANT ALL ON TABLE public.wa_templates TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.wa_media TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.campaigns TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.campaign_messages TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.wa_events TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
