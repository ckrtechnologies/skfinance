-- 1. Grant base PostgreSQL permissions so the 'anon' and 'authenticated' roles can actually read/write tables.
-- Without these grants, disabling RLS still won't let them read the table!
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role, postgres;

-- 2. Instead of just disabling RLS (which can be finicky in Supabase), let's create a blanket policy 
-- that allows ALL operations for ALL roles (anon and authenticated) on every table.

DO $$ 
DECLARE 
  t text;
BEGIN 
  FOR t IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
  LOOP
    -- Enable RLS just so the policy applies
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    
    -- Drop the policy if it exists to prevent duplicate errors
    EXECUTE format('DROP POLICY IF EXISTS "Allow All" ON public.%I;', t);
    
    -- Create a policy allowing EVERYTHING to EVERYONE
    EXECUTE format('CREATE POLICY "Allow All" ON public.%I AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);', t);
  END LOOP; 
END $$;
