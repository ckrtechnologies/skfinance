CREATE TABLE IF NOT EXISTS dealer_banners (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url text NOT NULL,
  action_link text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS Policies
ALTER TABLE dealer_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to dealer banners"
  ON dealer_banners FOR SELECT
  USING (true);

CREATE POLICY "Allow admin full access to dealer banners"
  ON dealer_banners FOR ALL
  USING (true);

-- Grants
GRANT ALL ON public.dealer_banners TO service_role;
GRANT ALL ON public.dealer_banners TO postgres;
GRANT SELECT ON public.dealer_banners TO authenticated;
GRANT SELECT ON public.dealer_banners TO anon;
