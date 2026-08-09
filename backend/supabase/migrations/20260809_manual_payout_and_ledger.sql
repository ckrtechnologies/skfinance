-- Migration: Manual Payout Workflow with PDF Receipts & Line-Item Transparency
-- Date: 2026-08-09

-- 1. Add application_id & PDF receipt columns to wallet_ledger
ALTER TABLE wallet_ledger 
  ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES loan_applications(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS receipt_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS receipt_pdf_name TEXT;

-- 2. Add PDF receipt columns to withdrawal_requests
ALTER TABLE withdrawal_requests 
  ADD COLUMN IF NOT EXISTS receipt_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS receipt_pdf_name TEXT;

-- 3. Add index for application_id lookup in wallet_ledger
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_application ON wallet_ledger(application_id);
