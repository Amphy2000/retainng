-- ============================================================================
-- RetainNG Database Setup & Schema Migration
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/vxinwmcdkghpvrwkdzbe/sql)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BUSINESSES TABLE
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    business_type TEXT NOT NULL DEFAULT 'pharmacy',
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT DEFAULT 'Kaduna',
    state TEXT DEFAULT 'Kaduna',
    currency TEXT NOT NULL DEFAULT 'NGN',
    timezone TEXT NOT NULL DEFAULT 'Africa/Lagos',
    logo_url TEXT,
    opt_in_slug TEXT UNIQUE NOT NULL,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    whatsapp_routing_mode TEXT DEFAULT 'agency_concierge',
    manager_alert_phone TEXT DEFAULT '2349169153129',
    concierge_phone TEXT DEFAULT '+234 703 267 3310',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_businesses_slug ON public.businesses(opt_in_slug);

-- 2. CUSTOMERS / PATIENTS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    notes TEXT,
    consent_status TEXT NOT NULL DEFAULT 'consented',
    consent_source TEXT DEFAULT 'qr_optin',
    consent_date TIMESTAMPTZ DEFAULT now(),
    total_visits INTEGER DEFAULT 1,
    total_spent_ngn NUMERIC(12, 2) DEFAULT 0.00,
    last_visit_date TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_business_customer_phone UNIQUE (business_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_customers_biz ON public.customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

-- 3. SALES / ORDERS / REFILLS TABLE
CREATE TABLE IF NOT EXISTS public.sales_or_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    customer_name TEXT,
    customer_phone TEXT,
    amount_ngn NUMERIC(12, 2) NOT NULL DEFAULT 12000.00,
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    service_or_product TEXT DEFAULT 'Prescription Refill',
    notes TEXT,
    is_manual_entry BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_biz ON public.sales_or_visits(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales_or_visits(visit_date);

-- 4. RLS POLICIES (Open for agency operations)
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_or_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access businesses" ON public.businesses;
CREATE POLICY "Public full access businesses" ON public.businesses FOR ALL USING (true);

DROP POLICY IF EXISTS "Public full access customers" ON public.customers;
CREATE POLICY "Public full access customers" ON public.customers FOR ALL USING (true);

DROP POLICY IF EXISTS "Public full access sales" ON public.sales_or_visits;
CREATE POLICY "Public full access sales" ON public.sales_or_visits FOR ALL USING (true);

-- 5. INITIAL PILOT BUSINESSES SEED
INSERT INTO public.businesses (id, name, business_type, phone, email, address, city, state, opt_in_slug, manager_alert_phone, concierge_phone)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'Apex Health & Community Pharmacy', 'pharmacy', '+234 916 915 3129', 'care@apexpharmacy.ng', '12 Awolowo Road', 'Kaduna', 'Kaduna', 'apex-pharmacy', '2349169153129', '+234 703 267 3310'),
  ('a0000000-0000-0000-0000-000000000002', 'Danfodio Pharmacy, Barnawa', 'pharmacy', '+234 916 915 3129', 'danfodio@pharmacy.ng', 'Barnawa Complex', 'Kaduna', 'Kaduna', 'danfodio-pharmacy', '2349169153129', '+234 703 267 3310'),
  ('a0000000-0000-0000-0000-000000000003', 'Lekki Grooming & Barber Lounge', 'barber', '+234 916 915 3129', 'contact@lekkibarbers.ng', 'Admiralty Way', 'Lagos', 'Lagos', 'lekki-barbers', '2349169153129', '+234 703 267 3310'),
  ('a0000000-0000-0000-0000-000000000004', 'Yaba Glow Hair Studio & Spa', 'salon', '+234 916 915 3129', 'hello@yabaglow.ng', 'Commercial Avenue', 'Lagos', 'Lagos', 'yaba-glow', '2349169153129', '+234 703 267 3310'),
  ('a0000000-0000-0000-0000-000000000005', 'SparkleWash Express Laundry', 'laundry', '+234 916 915 3129', 'wash@sparklewash.ng', 'Allen Avenue', 'Lagos', 'Lagos', 'sparklewash-ikeja', '2349169153129', '+234 703 267 3310')
ON CONFLICT (opt_in_slug) DO UPDATE SET
  manager_alert_phone = EXCLUDED.manager_alert_phone,
  concierge_phone = EXCLUDED.concierge_phone;
