CREATE TABLE dealer_banners (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  image_url text NOT NULL,
  action_link text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);
