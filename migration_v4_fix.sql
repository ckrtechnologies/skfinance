-- Fix permissions for otps table
GRANT ALL ON public.otps TO anon;
GRANT ALL ON public.otps TO authenticated;
GRANT ALL ON public.otps TO service_role;
