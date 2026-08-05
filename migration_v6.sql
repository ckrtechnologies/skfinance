-- =====================================================================
-- migration_v6.sql — Expanded Vehicle Loan Pipeline Stages
-- =====================================================================

-- 1. Safely add new stages to loan_stage ENUM in PostgreSQL
ALTER TYPE public.loan_stage ADD VALUE IF NOT EXISTS 'pre_check' BEFORE 'cibil';
ALTER TYPE public.loan_stage ADD VALUE IF NOT EXISTS 'document_verification' AFTER 'cibil';
ALTER TYPE public.loan_stage ADD VALUE IF NOT EXISTS 'sanction' AFTER 'fi';

-- 2. Update default stage on loan_applications table to pre_check
ALTER TABLE public.loan_applications ALTER COLUMN current_stage SET DEFAULT 'pre_check'::public.loan_stage;

-- 3. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
