-- ============================================================================
-- Customer Retention SaaS for Nigerian SMEs
-- Schema Migration: Multi-tenant database schema with Row Level Security (RLS)
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. BUSINESSES TABLE
-- Stores profile and settings for each business tenant.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    business_type TEXT NOT NULL DEFAULT 'other', -- 'salon', 'barber', 'laundry', 'car_wash', 'boutique', 'other'
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT DEFAULT 'Lagos',
    state TEXT DEFAULT 'Lagos',
    currency TEXT NOT NULL DEFAULT 'NGN',
    timezone TEXT NOT NULL DEFAULT 'Africa/Lagos',
    logo_url TEXT,
    opt_in_slug TEXT UNIQUE NOT NULL, -- used for public customer self-registration QR/link
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for public opt-in lookup
CREATE INDEX IF NOT EXISTS idx_businesses_opt_in_slug ON public.businesses(opt_in_slug);

-- ----------------------------------------------------------------------------
-- 2. BUSINESS MEMBERS TABLE
-- Multi-tenant membership linking Supabase auth.users to businesses
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'owner', -- 'owner', 'manager', 'staff'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(business_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_members_user ON public.business_members(user_id);
CREATE INDEX IF NOT EXISTS idx_business_members_biz ON public.business_members(business_id);

-- ----------------------------------------------------------------------------
-- 3. CUSTOMERS TABLE
-- Stores customer profiles strictly segregated per business.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL, -- e.g., +2348012345678 or 08012345678
    email TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    notes TEXT,
    -- Consent must be explicit: 'unconfirmed', 'consented', or 'opted_out'
    consent_status TEXT NOT NULL DEFAULT 'unconfirmed' CHECK (consent_status IN ('unconfirmed', 'consented', 'opted_out')),
    consent_source TEXT, -- 'qr_optin', 'in_store_verbal', 'web_link', 'csv_import', 'manual_entry'
    consent_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_business_customer_phone UNIQUE (business_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_customers_biz ON public.customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_consent ON public.customers(business_id, consent_status);

-- ----------------------------------------------------------------------------
-- 4. CUSTOMER CONSENT RECORDS (Audit Trail)
-- Immutable history of consent grants, updates, or revocations.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('consented', 'opted_out', 'unconfirmed')),
    source TEXT NOT NULL, -- 'qr_optin', 'in_store_verbal', 'web_link', 'csv_import', 'manual_edit'
    notes TEXT,
    ip_address TEXT,
    recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_records_customer ON public.customer_consent_records(customer_id);

-- ----------------------------------------------------------------------------
-- 5. SALES OR VISITS TABLE
-- Fast, low-effort records of customer visits and purchases in NGN.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_or_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    amount_ngn NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    service_or_product TEXT, -- e.g., 'Haircut & Beard Trim', 'Dry Cleaning 3 Suits'
    notes TEXT,
    is_manual_entry BOOLEAN NOT NULL DEFAULT TRUE, -- Honest automation flag
    recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_biz ON public.sales_or_visits(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales_or_visits(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales_or_visits(business_id, visit_date);

-- ----------------------------------------------------------------------------
-- 6. CAMPAIGN DRAFTS TABLE
-- Marketing drafts prepared for specific customer segments.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message_template TEXT NOT NULL, -- e.g., 'Hello {{name}}, we miss you at Lekki Barbers! Enjoy 10% off this Friday.'
    target_segment TEXT NOT NULL DEFAULT 'all_consented', 
    -- segments: 'all_consented', 'active_30d', 'inactive_30d', 'inactive_60d', 'frequent_visitors', 'no_purchase'
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'simulated_sent', 'archived')),
    estimated_recipients INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_biz ON public.campaign_drafts(business_id);

-- ----------------------------------------------------------------------------
-- 7. CAMPAIGN PREVIEW / AUDIT RECORDS
-- Simulated preview recipient log verifying consent prior to sending.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_preview_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_draft_id UUID NOT NULL REFERENCES public.campaign_drafts(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    personalized_message TEXT NOT NULL,
    consent_snapshot_status TEXT NOT NULL,
    eligibility_status TEXT NOT NULL DEFAULT 'eligible' CHECK (eligibility_status IN ('eligible', 'excluded_no_consent', 'excluded_opted_out')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preview_records_campaign ON public.campaign_preview_records(campaign_draft_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict multi-tenant isolation ensuring each business accesses only its data.
-- ============================================================================

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_or_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_preview_records ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current authenticated user belongs to business
CREATE OR REPLACE FUNCTION public.is_business_member(biz_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.business_members
        WHERE business_id = biz_id 
          AND user_id = auth.uid()
    );
$$;

-- Business policies
CREATE POLICY "Users can view businesses they belong to"
    ON public.businesses FOR SELECT
    USING (
        id IN (SELECT business_id FROM public.business_members WHERE user_id = auth.uid())
        OR is_demo = TRUE
    );

CREATE POLICY "Users can update businesses they belong to"
    ON public.businesses FOR UPDATE
    USING (
        id IN (SELECT business_id FROM public.business_members WHERE user_id = auth.uid())
    );

-- Business members policies
CREATE POLICY "Users can view members of their businesses"
    ON public.business_members FOR SELECT
    USING (
        business_id IN (SELECT business_id FROM public.business_members WHERE user_id = auth.uid())
    );

-- Customers policies
CREATE POLICY "Members can view customers in their business"
    ON public.customers FOR SELECT
    USING (public.is_business_member(business_id));

CREATE POLICY "Members can insert customers in their business"
    ON public.customers FOR INSERT
    WITH CHECK (public.is_business_member(business_id));

CREATE POLICY "Members can update customers in their business"
    ON public.customers FOR UPDATE
    USING (public.is_business_member(business_id));

CREATE POLICY "Members can delete customers in their business"
    ON public.customers FOR DELETE
    USING (public.is_business_member(business_id));

-- Public Self-Registration / QR Opt-in Policy:
-- Allows unauthenticated visitors to insert their own customer record with explicit opt-in
CREATE POLICY "Public customer opt-in through business slug"
    ON public.customers FOR INSERT
    WITH CHECK (
        consent_status = 'consented'
        AND consent_source IN ('qr_optin', 'web_link')
        AND business_id IN (SELECT id FROM public.businesses WHERE opt_in_slug IS NOT NULL)
    );

-- Customer consent records policies
CREATE POLICY "Members can view consent records for their business"
    ON public.customer_consent_records FOR SELECT
    USING (public.is_business_member(business_id));

CREATE POLICY "Members can insert consent records for their business"
    ON public.customer_consent_records FOR INSERT
    WITH CHECK (public.is_business_member(business_id));

CREATE POLICY "Public opt-in can insert audit log"
    ON public.customer_consent_records FOR INSERT
    WITH CHECK (
        status = 'consented'
        AND source IN ('qr_optin', 'web_link')
    );

-- Sales / Visits policies
CREATE POLICY "Members can view sales in their business"
    ON public.sales_or_visits FOR SELECT
    USING (public.is_business_member(business_id));

CREATE POLICY "Members can insert sales in their business"
    ON public.sales_or_visits FOR INSERT
    WITH CHECK (public.is_business_member(business_id));

CREATE POLICY "Members can update sales in their business"
    ON public.sales_or_visits FOR UPDATE
    USING (public.is_business_member(business_id));

CREATE POLICY "Members can delete sales in their business"
    ON public.sales_or_visits FOR DELETE
    USING (public.is_business_member(business_id));

-- Campaign drafts policies
CREATE POLICY "Members can view campaign drafts"
    ON public.campaign_drafts FOR SELECT
    USING (public.is_business_member(business_id));

CREATE POLICY "Members can manage campaign drafts"
    ON public.campaign_drafts FOR ALL
    USING (public.is_business_member(business_id));

-- Campaign preview records policies
CREATE POLICY "Members can view campaign preview records"
    ON public.campaign_preview_records FOR SELECT
    USING (
        campaign_draft_id IN (
            SELECT id FROM public.campaign_drafts 
            WHERE public.is_business_member(business_id)
        )
    );
