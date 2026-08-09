ALTER TABLE loan_applications ADD COLUMN ownership_provided_by TEXT CHECK (ownership_provided_by IN ('applicant', 'co_applicant', 'guarantor'));
