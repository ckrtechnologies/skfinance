-- =====================================================================
-- migration_v5.sql — Dealer Onboarding Support
-- Run in Supabase SQL Editor AFTER setup.sql and migration_v4.sql
-- =====================================================================

-- 1. Create enum safely (idempotent block)
DO $$ BEGIN
  CREATE TYPE dealer_onboarding_status AS ENUM ('pending', 'under_review', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Add onboarding columns to dealers table
ALTER TABLE public.dealers
  ADD COLUMN IF NOT EXISTS onboarding_status dealer_onboarding_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS onboarding_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_reviewed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_reviewed_by  UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS onboarding_rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS documents JSONB NOT NULL DEFAULT '{}';

-- 3. Make dealer_code nullable so we can create a row before admin assigns a code
ALTER TABLE public.dealers ALTER COLUMN dealer_code DROP NOT NULL;

-- 4. Existing approved dealers — backfill their onboarding_status so they keep full access
UPDATE public.dealers SET onboarding_status = 'approved' WHERE dealer_code IS NOT NULL;

-- 5. Index for fast admin queries on pending onboarding requests
CREATE INDEX IF NOT EXISTS idx_dealers_onboarding_status ON public.dealers(onboarding_status);

-- 6. Grant permissions to service_role
GRANT ALL ON public.dealers TO service_role;

-- 7. Refresh Supabase PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';
