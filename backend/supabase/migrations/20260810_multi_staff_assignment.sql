-- Create the join table for multiple staff assignments
CREATE TABLE loan_application_assignees (
  loan_application_id UUID NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  PRIMARY KEY (loan_application_id, staff_id)
);

-- Migrate existing single assignments over to the new table
INSERT INTO loan_application_assignees (loan_application_id, staff_id)
SELECT id, assigned_staff_id 
FROM loan_applications 
WHERE assigned_staff_id IS NOT NULL;

-- Drop the old single assignment column and its index
DROP INDEX IF EXISTS idx_loan_app_assigned_staff;
ALTER TABLE loan_applications DROP COLUMN assigned_staff_id;

-- Grant permissions to standard Supabase roles
GRANT ALL ON TABLE loan_application_assignees TO anon;
GRANT ALL ON TABLE loan_application_assignees TO authenticated;
GRANT ALL ON TABLE loan_application_assignees TO service_role;
