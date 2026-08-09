-- Adds staff assignment tracking to the loan_applications table

ALTER TABLE loan_applications 
ADD COLUMN assigned_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
ADD COLUMN assigned_at TIMESTAMPTZ;

CREATE INDEX idx_loan_app_assigned_staff ON loan_applications(assigned_staff_id);
