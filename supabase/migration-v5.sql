-- Migration v5: Sync log table
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  total_processed INTEGER DEFAULT 0,
  created INTEGER DEFAULT 0,
  updated INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  pending_sales INTEGER DEFAULT 0,
  total_in_flujo INTEGER DEFAULT 0,
  pages INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: admin can read, service role can insert
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sync logs"
  ON public.sync_logs FOR SELECT
  TO authenticated
  USING (true);
