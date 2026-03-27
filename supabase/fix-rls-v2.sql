-- =============================================
-- FIX RLS v2: Remove ALL recursive policies
-- =============================================

-- Drop everything first
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin views all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin manages profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin manages purchases" ON public.credit_purchases;
DROP POLICY IF EXISTS "Operator views purchases" ON public.credit_purchases;
DROP POLICY IF EXISTS "Admin/Operator manage clients" ON public.clients;
DROP POLICY IF EXISTS "Viewer reads clients" ON public.clients;
DROP POLICY IF EXISTS "Admin/Operator manage assignments" ON public.credit_assignments;
DROP POLICY IF EXISTS "Viewer reads assignments" ON public.credit_assignments;
DROP POLICY IF EXISTS "Admin manages rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "All read rates" ON public.exchange_rates;

-- Drop the helper function (it causes recursion in Supabase hosted)
DROP FUNCTION IF EXISTS public.get_my_role();

-- =============================================
-- PROFILES: All authenticated can READ all profiles (names/roles are not sensitive)
-- Only the user themselves or an admin can UPDATE
-- =============================================
CREATE POLICY "Authenticated read profiles" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================
-- Helper: use a SECURITY DEFINER function that reads role
-- Since profiles SELECT is now open to all authenticated, no recursion
-- =============================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- =============================================
-- CREDIT PURCHASES
-- =============================================
CREATE POLICY "All authenticated read purchases" ON public.credit_purchases
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin insert purchases" ON public.credit_purchases
  FOR INSERT WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "Admin update purchases" ON public.credit_purchases
  FOR UPDATE USING (public.get_my_role() = 'admin');

CREATE POLICY "Admin delete purchases" ON public.credit_purchases
  FOR DELETE USING (public.get_my_role() = 'admin');

-- =============================================
-- CLIENTS
-- =============================================
CREATE POLICY "All authenticated read clients" ON public.clients
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin/Operator insert clients" ON public.clients
  FOR INSERT WITH CHECK (public.get_my_role() IN ('admin', 'operator'));

CREATE POLICY "Admin/Operator update clients" ON public.clients
  FOR UPDATE USING (public.get_my_role() IN ('admin', 'operator'));

CREATE POLICY "Admin/Operator delete clients" ON public.clients
  FOR DELETE USING (public.get_my_role() IN ('admin', 'operator'));

-- =============================================
-- CREDIT ASSIGNMENTS
-- =============================================
CREATE POLICY "All authenticated read assignments" ON public.credit_assignments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin/Operator insert assignments" ON public.credit_assignments
  FOR INSERT WITH CHECK (public.get_my_role() IN ('admin', 'operator'));

CREATE POLICY "Admin/Operator update assignments" ON public.credit_assignments
  FOR UPDATE USING (public.get_my_role() IN ('admin', 'operator'));

-- =============================================
-- EXCHANGE RATES
-- =============================================
CREATE POLICY "All authenticated read rates" ON public.exchange_rates
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin insert rates" ON public.exchange_rates
  FOR INSERT WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "Admin update rates" ON public.exchange_rates
  FOR UPDATE USING (public.get_my_role() = 'admin');
