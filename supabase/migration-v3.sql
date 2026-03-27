-- Migration v3: Add Flujo TV service dates and credit tracking to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS flujo_end_date TIMESTAMPTZ;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS flujo_start_date TIMESTAMPTZ;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS flujo_credits INTEGER DEFAULT 0;
