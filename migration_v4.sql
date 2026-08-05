-- Migration v4: Add custom otps table for passwordless login

CREATE TABLE IF NOT EXISTS public.otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure RLS is enabled and allow backend to manage it (via service role bypass)
ALTER TABLE public.otps ENABLE ROW LEVEL SECURITY;
