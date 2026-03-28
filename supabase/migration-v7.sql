-- Migration v7: Leads table for chatbot and campaign captures
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT,
  phone TEXT,
  source TEXT DEFAULT 'chatbot',
  plan_interest TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view leads"
  ON public.leads FOR SELECT TO authenticated USING (true);

-- Allow anonymous inserts from chatbot (public page, no auth)
CREATE POLICY "Anyone can insert leads"
  ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (true);
