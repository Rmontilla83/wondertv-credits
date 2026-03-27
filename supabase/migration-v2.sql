-- Migration v2: Add courtesy tracking, Flujo TV sync fields, and clean up payment methods

-- Add Flujo TV sync fields to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS flujo_cust_id TEXT UNIQUE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS flujo_login TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS country TEXT;

-- Add courtesy fields to credit_assignments
ALTER TABLE public.credit_assignments ADD COLUMN IF NOT EXISTS is_courtesy BOOLEAN DEFAULT FALSE;
ALTER TABLE public.credit_assignments ADD COLUMN IF NOT EXISTS courtesy_reason TEXT;

-- Update payment method constraint to only allow the 3 methods
ALTER TABLE public.credit_assignments DROP CONSTRAINT IF EXISTS credit_assignments_payment_method_check;
ALTER TABLE public.credit_assignments ADD CONSTRAINT credit_assignments_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('banesco_bss', 'paypal', 'zelle'));
