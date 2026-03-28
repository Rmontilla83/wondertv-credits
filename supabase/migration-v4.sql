-- Migration v4: Add payment_status to credit_assignments for auto-detected sales
-- When sync detects a credit increase, it creates a 'pending' assignment
-- The operator then completes it with payment info

ALTER TABLE public.credit_assignments
  ADD COLUMN IF NOT EXISTS payment_status TEXT
  DEFAULT 'completed'
  CHECK (payment_status IN ('pending', 'completed'));

-- Existing rows keep 'completed' status (they were manually registered)
