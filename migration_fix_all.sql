-- =====================================================================
-- migration_fix_all.sql — PostgreSQL 55P04 Safe 2-Step Migration
-- =====================================================================

-- STEP 1: Execute these ALTER TYPE statements FIRST in Supabase SQL Editor:
ALTER TYPE public.loan_stage ADD VALUE IF NOT EXISTS 'pre_check';
ALTER TYPE public.loan_stage ADD VALUE IF NOT EXISTS 'document_verification';
ALTER TYPE public.loan_stage ADD VALUE IF NOT EXISTS 'sanction';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'clarification_requested';

-- =====================================================================
-- STEP 2: Execute these statements SECOND (after Step 1 succeeds):
-- =====================================================================
ALTER TABLE public.loan_stage_entries DROP CONSTRAINT IF EXISTS loan_stage_entries_outcome_check;
ALTER TABLE public.loan_stage_entries ADD CONSTRAINT loan_stage_entries_outcome_check 
  CHECK (outcome IN ('approved', 'clarification_requested', 'rejected', 'pass', 'fail', 'pending', 'rework'));

ALTER TABLE public.loan_applications ALTER COLUMN current_stage SET DEFAULT 'pre_check'::public.loan_stage;

NOTIFY pgrst, 'reload schema';
