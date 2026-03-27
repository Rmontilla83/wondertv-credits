-- Wonder TV Credits - Database Migration
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operator', 'viewer')) DEFAULT 'viewer',
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit purchases (Admin buys bulk credits)
CREATE TABLE public.credit_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchased_by UUID REFERENCES public.profiles(id) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_cost_usd NUMERIC(10,2) NOT NULL CHECK (total_cost_usd > 0),
  cost_per_credit NUMERIC(10,4) GENERATED ALWAYS AS (total_cost_usd / quantity) STORED,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('banesco_bss', 'paypal', 'zelle')),
  payment_reference TEXT,
  notes TEXT,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients (end users of Wonder TV IPTV service)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  device_info TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'suspended')) DEFAULT 'active',
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit assignments (Operator assigns credits to clients)
-- NOTE: period_end is stored as a regular DATE column and calculated in the application layer
CREATE TABLE public.credit_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.clients(id) NOT NULL,
  assigned_by UUID REFERENCES public.profiles(id) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  period_start DATE NOT NULL,
  period_end DATE,
  payment_amount_usd NUMERIC(10,2),
  payment_method TEXT CHECK (payment_method IN ('banesco_bss', 'paypal', 'zelle', 'cash', 'transfer')),
  payment_reference TEXT,
  payment_amount_bss NUMERIC(15,2),
  exchange_rate NUMERIC(10,4),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exchange rate log (BCV rate snapshots)
CREATE TABLE public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rate_bss_usd NUMERIC(10,4) NOT NULL,
  source TEXT DEFAULT 'manual',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- VIEWS for dashboard statistics
-- ============================================

-- Current credit balance
CREATE OR REPLACE VIEW public.credit_balance AS
SELECT
  COALESCE((SELECT SUM(quantity) FROM public.credit_purchases), 0) AS total_purchased,
  COALESCE((SELECT SUM(quantity) FROM public.credit_assignments), 0) AS total_assigned,
  COALESCE((SELECT SUM(quantity) FROM public.credit_purchases), 0) -
  COALESCE((SELECT SUM(quantity) FROM public.credit_assignments), 0) AS available_credits;

-- Monthly financial summary
CREATE OR REPLACE VIEW public.monthly_financial_summary AS
SELECT
  DATE_TRUNC('month', ca.created_at) AS month,
  COUNT(ca.id) AS total_assignments,
  SUM(ca.quantity) AS credits_assigned,
  SUM(ca.payment_amount_usd) AS revenue_usd,
  COUNT(DISTINCT ca.client_id) AS unique_clients,
  ROUND(AVG(ca.payment_amount_usd), 2) AS avg_ticket_usd,
  ROUND(AVG(ca.quantity), 1) AS avg_credits_per_assignment
FROM public.credit_assignments ca
GROUP BY DATE_TRUNC('month', ca.created_at)
ORDER BY month DESC;

-- Cost vs Revenue per month
CREATE OR REPLACE VIEW public.monthly_profitability AS
SELECT
  months.month,
  COALESCE(purchases.total_cost, 0) AS total_cost_usd,
  COALESCE(purchases.credits_bought, 0) AS credits_bought,
  COALESCE(assignments.revenue, 0) AS revenue_usd,
  COALESCE(assignments.credits_sold, 0) AS credits_sold,
  COALESCE(assignments.revenue, 0) - COALESCE(purchases.total_cost, 0) AS profit_usd,
  CASE
    WHEN COALESCE(purchases.total_cost, 0) > 0
    THEN ROUND(((COALESCE(assignments.revenue, 0) - COALESCE(purchases.total_cost, 0)) / purchases.total_cost * 100), 1)
    ELSE 0
  END AS margin_pct
FROM (
  SELECT DISTINCT DATE_TRUNC('month', created_at) AS month
  FROM public.credit_purchases
  UNION
  SELECT DISTINCT DATE_TRUNC('month', created_at) AS month
  FROM public.credit_assignments
) months
LEFT JOIN (
  SELECT DATE_TRUNC('month', purchased_at) AS month,
         SUM(total_cost_usd) AS total_cost,
         SUM(quantity) AS credits_bought
  FROM public.credit_purchases
  GROUP BY 1
) purchases ON purchases.month = months.month
LEFT JOIN (
  SELECT DATE_TRUNC('month', created_at) AS month,
         SUM(payment_amount_usd) AS revenue,
         SUM(quantity) AS credits_sold
  FROM public.credit_assignments
  GROUP BY 1
) assignments ON assignments.month = months.month
ORDER BY months.month DESC;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Profiles: users see own, admin sees all
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admin views all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin manages profiles" ON public.profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Credit purchases: admin full access, operator/viewer read
CREATE POLICY "Admin manages purchases" ON public.credit_purchases FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Operator views purchases" ON public.credit_purchases FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operator', 'viewer'))
);

-- Clients: admin and operator full access, viewer read
CREATE POLICY "Admin/Operator manage clients" ON public.clients FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'operator'))
);
CREATE POLICY "Viewer reads clients" ON public.clients FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'viewer')
);

-- Assignments: admin and operator full access, viewer read
CREATE POLICY "Admin/Operator manage assignments" ON public.credit_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'operator'))
);
CREATE POLICY "Viewer reads assignments" ON public.credit_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'viewer')
);

-- Exchange rates: admin manages, all read
CREATE POLICY "Admin manages rates" ON public.exchange_rates FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "All read rates" ON public.exchange_rates FOR SELECT USING (
  auth.uid() IS NOT NULL
);

-- ============================================
-- TRIGGER: auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'viewer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
