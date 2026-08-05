-- Migration v3: Enforce unique email and phone constraints in profiles table

-- Add UNIQUE constraint to email (ignores NULL values)
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);

-- Add UNIQUE constraint to phone (ignores NULL values)
ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_key UNIQUE (phone);
