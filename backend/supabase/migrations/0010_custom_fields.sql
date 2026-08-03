-- Add custom_fields JSONB column to customers table to support arbitrary parameters
ALTER TABLE customers ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- Add validation_rules to lender_policies to support condition-based rejections
ALTER TABLE lender_policies ADD COLUMN IF NOT EXISTS validation_rules JSONB DEFAULT '[]'::jsonb;
