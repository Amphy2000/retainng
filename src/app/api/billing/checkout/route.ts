import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

/**
 * RetainNG Flutterwave Subscription Checkout
 * 
 * Plans:
 * 1. Monthly:   ₦25,000 / month (Standard)
 * 2. Quarterly: ₦67,500 / 3 months (10% discount: ₦22,500/mo, saves ₦7,500)
 * 3. Annual:    ₦240,000 / 12 months (20% discount: ₦20,000/mo, saves ₦60,000)
 */

export const SUBSCRIPTION_PLANS = {
  monthly: {
    id: 'monthly',
    name: 'Monthly Retainer',
    amount: 25000,
    durationMonths: 1,
    discountLabel: 'Standard Rate',
    monthlyEquivalent: 25000,
    popular: false,
  },
  quarterly: {
    id: 'quarterly',
    name: 'Quarterly Retainer (3 Months)',
    amount: 67500,
    durationMonths: 3,
    discountLabel: '10% Discount (Save ₦7,500)',
    monthlyEquivalent: 22500,
    popular: true,
  },
  annual: {
    id: 'annual',
    name: 'Annual Retainer (12 Months)',
    amount: 240000,
    durationMonths: 12,
    discountLabel: '20% Discount (Save ₦60,000)',
    monthlyEquivalent: 20000,
    popular: false,
  },
} as const;

export type PlanKey = keyof typeof SUBSCRIPTION_PLANS;

// Flutterwave OAuth2 Token Helper
async function getFlutterwaveToken(): Promise<string | null> {
  const clientId = process.env.FLUTTERWAVE_CLIENT_ID || '41a6a298-2ede-4f1c-9b18-70f3d6499475';
  const clientSecret = process.env.FLUTTERWAVE_SECRET_KEY || 'CwVbqxDrgTi374MV4tBtfMNViPP3Bn2Ecm5OTleN3vItT6lwAQOzots8ivDLObRyvGryXqWBW0LUl2U2T5vf9n';

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const res = await fetch('https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      console.error('Flutterwave IDP auth failed:', await res.text());
      return null;
    }

    const data = await res.json();
    return data.access_token || null;
  } catch (err) {
    console.error('Flutterwave token fetch error:', err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { business_id, slug, plan_id, email, phone_number, name } = body;

    const planKey = (plan_id || 'monthly') as PlanKey;
    const plan = SUBSCRIPTION_PLANS[planKey] || SUBSCRIPTION_PLANS.monthly;

    const txRef = `retainng_${planKey}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const host = req.headers.get('host') || 'retainng.vercel.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const redirectUrl = `${protocol}://${host}/billing/success?tx_ref=${txRef}&plan=${planKey}&slug=${slug || ''}&amount=${plan.amount}`;

    const secretKey = process.env.FLW_SECRET_KEY || 'FLWSECK-1ca7dde57593bd12913c122936030bfe-1a20b64a5d1vt-X';
    let checkoutLink = '';

    try {
      const payRes = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tx_ref: txRef,
          amount: plan.amount,
          currency: 'NGN',
          redirect_url: redirectUrl,
          customer: {
            email: email || 'billing@retainng.com',
            phonenumber: phone_number || '09169153129',
            name: name || 'Partner Business',
          },
          customizations: {
            title: `RetainNG — ${plan.name}`,
            description: `Subscription Retainer for ${name || 'Partner Store'}`,
            logo: 'https://retainng.vercel.app/icon.png',
          },
          meta: {
            slug: slug || '',
            business_id: business_id || '',
            plan: planKey,
          },
        }),
      });

      const payData = await payRes.json();
      if (payData?.status === 'success' && payData?.data?.link) {
        checkoutLink = payData.data.link;
      }
    } catch (e) {
      console.warn('Flutterwave hosted link error:', e);
    }

    // Return checkout payload with live Flutterwave payment link
    return NextResponse.json({
      success: true,
      tx_ref: txRef,
      amount: plan.amount,
      currency: 'NGN',
      plan,
      link: checkoutLink,
      redirect_url: redirectUrl,
      customer: {
        email: email || 'billing@retainng.com',
        phone_number: phone_number || '09169153129',
        name: name || 'Partner Business',
      },
    });
  } catch (err: unknown) {
    console.error('Checkout error:', err);
    return NextResponse.json({ error: 'Failed to initiate checkout' }, { status: 500 });
  }
}
