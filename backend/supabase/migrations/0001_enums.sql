-- =====================================================================
-- 0001_enums.sql — Shreeja Finance Platform
-- All custom PostgreSQL enums
-- =====================================================================

CREATE TYPE user_role AS ENUM ('customer', 'dealer', 'staff', 'admin');
CREATE TYPE product_type AS ENUM ('new_car', 'used_car', 'commercial_vehicle');
CREATE TYPE loan_stage AS ENUM ('cibil', 'bank', 'valuation', 'fi', 'approval', 'disbursement');
CREATE TYPE application_status AS ENUM ('draft', 'in_progress', 'approved', 'blocked_90d', 'disbursed', 'rejected', 'cancelled');
CREATE TYPE evaluation_result AS ENUM ('eligible', 'not_eligible', 'incomplete');
CREATE TYPE policy_status AS ENUM ('draft', 'active', 'retired');
CREATE TYPE commission_status AS ENUM ('earned', 'payout_pending', 'paid');
CREATE TYPE ledger_entry_type AS ENUM ('commission_earned', 'payout', 'adjustment');
CREATE TYPE withdrawal_status AS ENUM ('requested', 'processed', 'rejected');
CREATE TYPE customer_type AS ENUM ('salaried', 'self_employed', 'agriculture');
