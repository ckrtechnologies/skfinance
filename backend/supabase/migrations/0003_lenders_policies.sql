-- =====================================================================
-- 0003_lenders_policies.sql — Shreeja Finance Platform
-- Lenders, versioned policies, policy documents, eligibility evaluations
-- =====================================================================

-- ─── lenders ─────────────────────────────────────────────────────────
CREATE TABLE lenders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  code          TEXT NOT NULL UNIQUE,           -- e.g. SK_FINANCE, ITI_FINANCE
  lender_type   TEXT NOT NULL DEFAULT 'nbfc',  -- nbfc | bank
  -- Contact
  contact_name  TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  -- Display
  logo_url      TEXT,
  -- Ranking: lower number = higher preference when multiple lenders are eligible
  priority      INT NOT NULL DEFAULT 10,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_lenders
  BEFORE UPDATE ON lenders
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─── lender_policies ─────────────────────────────────────────────────
-- Each row is a versioned credit policy snapshot for one lender × product.
-- Policy-as-data: changing a rule = publishing a new version, never editing an active row.
-- The eligibility engine pre-filters using indexed numeric columns, then evaluates jsonb rules.
CREATE TABLE lender_policies (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lender_id             UUID NOT NULL REFERENCES lenders(id) ON DELETE RESTRICT,
  product_type          product_type NOT NULL,
  version               INT NOT NULL DEFAULT 1,
  -- Lifecycle
  effective_from        DATE NOT NULL,
  effective_to          DATE,                   -- NULL = currently active
  status                policy_status NOT NULL DEFAULT 'draft',
  -- Loan amount
  min_loan_amount       NUMERIC(14,2) NOT NULL, -- e.g. 100000
  max_loan_amount       NUMERIC(14,2) NOT NULL, -- e.g. 1500000
  -- LTV (Loan-to-Value)
  ltv_min               NUMERIC(5,2),           -- pct e.g. 80.00
  ltv_max               NUMERIC(5,2),           -- pct e.g. 100.00
  -- Age
  min_age               INT NOT NULL,
  max_age               INT NOT NULL,
  -- CIBIL
  min_cibil             INT,                    -- NULL = no hard floor; -1 = NTC accepted
  cibil_negative_accepted BOOLEAN NOT NULL DEFAULT FALSE, -- -1 score accepted?
  preferred_cibil       INT,                    -- informational / soft floor
  -- Customer type filter
  customer_types        customer_type[] NOT NULL DEFAULT '{}',
  -- Co-applicant
  co_applicant_required   BOOLEAN NOT NULL DEFAULT FALSE,
  co_applicant_relations  TEXT[] NOT NULL DEFAULT '{}', -- e.g. ['spouse','parent','sibling']
  -- Jsonb rule blocks (interpreted only by rule-evaluator.js)
  ownership_proof_rules   JSONB NOT NULL DEFAULT '[]',
  conditional_rules       JSONB NOT NULL DEFAULT '[]',
  -- Audit source
  reference_doc_url       TEXT,                 -- uploaded original credit sheet
  notes                   TEXT,
  -- Unique: one active version per lender × product (enforced via partial index below)
  CONSTRAINT uq_lender_product_version UNIQUE (lender_id, product_type, version),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active policy per lender × product at a time
CREATE UNIQUE INDEX uix_lender_policy_active
  ON lender_policies(lender_id, product_type)
  WHERE status = 'active';

CREATE TRIGGER set_updated_at_lender_policies
  BEFORE UPDATE ON lender_policies
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─── policy_documents ────────────────────────────────────────────────
-- Required document list per policy version.
-- party: applicant | co_applicant | guarantor
-- selection_group + min_required_in_group: "submit any 2 of these 3" patterns
CREATE TABLE policy_documents (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id               UUID NOT NULL REFERENCES lender_policies(id) ON DELETE CASCADE,
  party                   TEXT NOT NULL CHECK (party IN ('applicant', 'co_applicant', 'guarantor')),
  doc_type                TEXT NOT NULL,        -- e.g. 'aadhaar', 'pan', 'salary_slip_3m'
  is_mandatory            BOOLEAN NOT NULL DEFAULT TRUE,
  -- Grouping for "any N of M" patterns
  selection_group         TEXT,                 -- nullable: group label e.g. 'address_proof'
  min_required_in_group   INT,                  -- null unless selection_group set
  -- Document-specific metadata
  photo_count             INT,                  -- for photo requirements (e.g. 2 passport photos)
  bank_statement_months   INT,                  -- e.g. 6 for 6-month bank statement
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_policy_documents
  BEFORE UPDATE ON policy_documents
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─── eligibility_evaluations ─────────────────────────────────────────
-- APPEND-ONLY. One row per evaluation attempt per application per lender.
-- Re-evaluation = new row. Never update or delete.
-- stage: pre_check (6-8 questions) | full (after data + documents)
CREATE TABLE eligibility_evaluations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_application_id   UUID NOT NULL,          -- FK added after loan_applications table exists
  lender_policy_id      UUID NOT NULL REFERENCES lender_policies(id) ON DELETE RESTRICT,
  stage                 TEXT NOT NULL CHECK (stage IN ('pre_check', 'full')),
  result                evaluation_result NOT NULL,
  failed_rules          JSONB NOT NULL DEFAULT '[]',
  missing_items         JSONB NOT NULL DEFAULT '[]',
  evaluated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- No updated_at — append-only, never mutated
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- FK to loan_applications added in 0004_pipeline.sql via ALTER TABLE
