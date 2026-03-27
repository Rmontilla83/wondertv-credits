-- Fix recursive RLS policies on profiles table
-- The old policies queried the profiles table itself, causing infinite recursion

-- Drop all existing profile policies
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin views all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin manages profiles" ON public.profiles;

-- Also fix policies on other tables that reference profiles
DROP POLICY IF EXISTS "Admin manages purchases" ON public.credit_purchases;
DROP POLICY IF EXISTS "Operator views purchases" ON public.credit_purchases;
DROP POLICY IF EXISTS "Admin/Operator manage clients" ON public.clients;
DROP POLICY IF EXISTS "Viewer reads clients" ON public.clients;
DROP POLICY IF EXISTS "Admin/Operator manage assignments" ON public.credit_assignments;
DROP POLICY IF EXISTS "Viewer reads assignments" ON public.credit_assignments;
DROP POLICY IF EXISTS "Admin manages rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "All read rates" ON public.exchange_rates;

-- Helper function to get user role without querying profiles (avoids recursion)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- PROFILES policies (non-recursive)
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin manages profiles" ON public.profiles
  FOR ALL USING (public.get_my_role() = 'admin');

-- CREDIT PURCHASES policies
CREATE POLICY "Admin manages purchases" ON public.credit_purchases
  FOR ALL USING (public.get_my_role() = 'admin');

CREATE POLICY "Operator views purchases" ON public.credit_purchases
  FOR SELECT USING (public.get_my_role() IN ('operator', 'viewer'));

-- CLIENTS policies
CREATE POLICY "Admin/Operator manage clients" ON public.clients
  FOR ALL USING (public.get_my_role() IN ('admin', 'operator'));

CREATE POLICY "Viewer reads clients" ON public.clients
  FOR SELECT USING (public.get_my_role() = 'viewer');

-- CREDIT ASSIGNMENTS policies
CREATE POLICY "Admin/Operator manage assignments" ON public.credit_assignments
  FOR ALL USING (public.get_my_role() IN ('admin', 'operator'));

CREATE POLICY "Viewer reads assignments" ON public.credit_assignments
  FOR SELECT USING (public.get_my_role() = 'viewer');

-- EXCHANGE RATES policies
CREATE POLICY "Admin manages rates" ON public.exchange_rates
  FOR ALL USING (public.get_my_role() = 'admin');

CREATE POLICY "All read rates" ON public.exchange_rates
  FOR SELECT USING (auth.uid() IS NOT NULL);
