-- ============================================================================
-- Seed Data for Nigerian SME Retention Platform
-- Demonstrates realistic businesses: Barbershop, Salon, Dry Cleaner, Boutique
-- ============================================================================

-- Business 1: Lekki Grooming & Barber Lounge
INSERT INTO public.businesses (
    id, name, business_type, phone, email, address, city, state, currency, timezone, opt_in_slug, is_demo
) VALUES (
    'b1111111-1111-1111-1111-111111111111',
    'Lekki Grooming & Barber Lounge',
    'barber',
    '+2348023456789',
    'hello@lekkibarbers.ng',
    'Plot 14 Admiralty Way, Lekki Phase 1',
    'Lagos',
    'Lagos',
    'NGN',
    'Africa/Lagos',
    'lekki-barbers',
    TRUE
) ON CONFLICT (id) DO NOTHING;

-- Demo Customers for Lekki Grooming
INSERT INTO public.customers (
    id, business_id, full_name, phone, email, tags, notes, consent_status, consent_source, consent_date, created_at
) VALUES 
(
    'c1111111-0001-0000-0000-000000000001',
    'b1111111-1111-1111-1111-111111111111',
    'Chinedu Okafor',
    '+2348031234567',
    'chinedu.okafor@gmail.com',
    ARRAY['VIP', 'Fade Cut', 'Weekend'],
    'Prefers Master Barber Dayo. Usually comes every other Saturday.',
    'consented',
    'qr_optin',
    NOW() - INTERVAL '45 days',
    NOW() - INTERVAL '50 days'
),
(
    'c1111111-0002-0000-0000-000000000002',
    'b1111111-1111-1111-1111-111111111111',
    'Babajide Adeleke',
    '+2348059876543',
    'adeleke.b@yahoo.com',
    ARRAY['Beard Grooming'],
    'Always buys beard oil after treatment.',
    'consented',
    'in_store_verbal',
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '35 days'
),
(
    'c1111111-0003-0000-0000-000000000003',
    'b1111111-1111-1111-1111-111111111111',
    'Emeka Nwosu',
    '+2348071122334',
    NULL,
    ARRAY['Regular'],
    'Has not visited in 40 days.',
    'consented',
    'qr_optin',
    NOW() - INTERVAL '60 days',
    NOW() - INTERVAL '60 days'
),
(
    'c1111111-0004-0000-0000-000000000004',
    'b1111111-1111-1111-1111-111111111111',
    'Tunde Fashola',
    '+2348185550199',
    'tfashola@workmail.ng',
    ARRAY['Walk-in'],
    'Recorded visit during fuel scarcity week. Did not grant SMS consent.',
    'unconfirmed',
    'manual_entry',
    NULL,
    NOW() - INTERVAL '12 days'
),
(
    'c1111111-0005-0000-0000-000000000005',
    'b1111111-1111-1111-1111-111111111111',
    'Ahmed Danjuma',
    '+2349094443322',
    'ahmed.d@outlook.com',
    ARRAY['Opted-Out'],
    'Requested no marketing SMS on 1st Nov.',
    'opted_out',
    'manual_edit',
    NOW() - INTERVAL '21 days',
    NOW() - INTERVAL '90 days'
) ON CONFLICT (id) DO NOTHING;

-- Realistic Sales & Visits
INSERT INTO public.sales_or_visits (
    id, business_id, customer_id, amount_ngn, visit_date, service_or_product, notes, is_manual_entry
) VALUES
(
    's1111111-0001-0000-0000-000000000001',
    'b1111111-1111-1111-1111-111111111111',
    'c1111111-0001-0000-0000-000000000001',
    7500.00,
    CURRENT_DATE - INTERVAL '3 days',
    'Signature Haircut & Charcoal Mask',
    'Cash payment at till',
    TRUE
),
(
    's1111111-0002-0000-0000-000000000002',
    'b1111111-1111-1111-1111-111111111111',
    'c1111111-0001-0000-0000-000000000001',
    6000.00,
    CURRENT_DATE - INTERVAL '18 days',
    'Haircut + Beard Lineup',
    'Transfer via Moniepoint POS',
    TRUE
),
(
    's1111111-0003-0000-0000-000000000003',
    'b1111111-1111-1111-1111-111111111111',
    'c1111111-0002-0000-0000-000000000002',
    12000.00,
    CURRENT_DATE - INTERVAL '5 days',
    'Beard Spa & Premium Shave Cream',
    'OPay POS transfer',
    TRUE
),
(
    's1111111-0004-0000-0000-000000000004',
    'b1111111-1111-1111-1111-111111111111',
    'c1111111-0003-0000-0000-000000000003',
    5000.00,
    CURRENT_DATE - INTERVAL '40 days',
    'Standard Haircut',
    'First visit',
    TRUE
),
(
    's1111111-0005-0000-0000-000000000005',
    'b1111111-1111-1111-1111-111111111111',
    'c1111111-0004-0000-0000-000000000004',
    4500.00,
    CURRENT_DATE - INTERVAL '12 days',
    'Basic Cut',
    'Walk in',
    TRUE
) ON CONFLICT (id) DO NOTHING;
