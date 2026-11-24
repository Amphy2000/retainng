'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getBusinessBySlug } from '@/lib/storage';
import { Business } from '@/types';
import { formatNgn } from '@/lib/utils';
import { RetainNgLogo } from '@/components/RetainNgLogo';
import {
  ShieldCheck,
  Check,
  Sparkles,
  CreditCard,
  Building2,
  Lock,
  ArrowRight,
  Bot,
  AlertTriangle,
  Zap,
} from 'lucide-react';

const PLANS = [
  {
    id: 'monthly',
    name: 'Monthly Retainer',
    billingCycle: 'Billed every month',
    amount: 25000,
    monthlyRate: 25000,
    discountBadge: null,
    savingsText: null,
    popular: false,
    features: [
      '24/7 Autonomous WhatsApp Concierge',
      'Multilingual Hausa/Yoruba/Igbo Voice Notes',
      'Photo & Prescription Blister Scanner',
      '1-Tap Ready & Dispatch Manager Alerts',
      'Monthly Net Profit ROI Certificate',
    ],
  },
  {
    id: 'quarterly',
    name: 'Quarterly Retainer',
    billingCycle: 'Billed every 3 months',
    amount: 67500,
    monthlyRate: 22500,
    discountBadge: '10% DISCOUNT',
    savingsText: 'Save ₦7,500 every 3 months',
    popular: true,
    features: [
      'Everything in Monthly Retainer',
      'Priority Delivery Pipeline',
      'Saved ₦7,500 on retainer fees',
      'Zero interruption for 90 days',
      'VIP Dispensary Onboarding Support',
    ],
  },
  {
    id: 'annual',
    name: 'Annual Retainer',
    billingCycle: 'Billed once a year',
    amount: 240000,
    monthlyRate: 20000,
    discountBadge: '20% DISCOUNT (BEST VALUE)',
    savingsText: 'Save ₦60,000 every year',
    popular: false,
    features: [
      'Everything in Quarterly Retainer',
      'Maximum Agency Savings (₦60,000 saved)',
      '1 Full Year Autonomous Protection',
      'Free Customized 4-in-1 Counter Slips',
      'Dedicated Founder Concierge Hotline',
    ],
  },
];

function BillingPortalInner() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [business, setBusiness] = useState<Business | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('quarterly');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');

  useEffect(() => {
    if (!slug) return;
    const biz = getBusinessBySlug(slug);
    if (biz) {
      setBusiness(biz);
      setOwnerEmail(biz.email || 'billing@' + (biz.opt_in_slug || 'store') + '.com');
      setOwnerPhone(biz.phone || '09169153129');
    }
    setLoading(false);
  }, [slug]);

  const activePlan = useMemo(() => {
    return PLANS.find((p) => p.id === selectedPlan) || PLANS[1];
  }, [selectedPlan]);

  async function handleCheckout() {
    if (!business) return;
    setPaying(true);

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: business.id,
          slug: business.opt_in_slug,
          plan_id: activePlan.id,
          email: ownerEmail,
          phone_number: ownerPhone,
          name: business.name,
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.link) {
          // Redirect merchant directly to Flutterwave Live Hosted Checkout (Cards, Bank Transfer, OPay)
          window.location.href = data.link;
          return;
        }

        // If direct verification flow
        const verifyRes = await fetch('/api/billing/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tx_ref: data.tx_ref,
            plan_id: activePlan.id,
            slug: business.opt_in_slug,
            business_id: business.id,
          }),
        });

        if (verifyRes.ok) {
          router.push(`/billing/success?plan=${activePlan.id}&slug=${business.opt_in_slug}&amount=${activePlan.amount}`);
        } else {
          alert('Could not verify payment. Please try again.');
        }
      } else {
        alert(data.error || 'Failed to initiate payment.');
      }
    } catch (e) {
      console.error('Checkout error:', e);
      alert('An error occurred during payment processing.');
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Loading RetainNG Billing Portal...
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center text-white max-w-sm space-y-2">
          <p className="font-bold text-sm">Store Not Found</p>
          <p className="text-xs text-slate-400">Could not find a store profile for &quot;{slug}&quot;.</p>
        </div>
      </div>
    );
  }

  const isOverdue = business.subscription_status === 'overdue';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16 selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20 px-4 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-emerald-500/30 overflow-hidden flex items-center justify-center shadow-md shadow-emerald-950/50">
              <RetainNgLogo className="w-7 h-7" />
            </div>
            <div>
              <span className="font-black text-sm tracking-tight text-white block leading-none">
                Retain<span className="text-emerald-400">NG</span> Billing
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Agency Retainer Subscription</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              isOverdue
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              {isOverdue ? '⚠️ Renewal Required' : '✓ Active Partner'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Banner */}
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Anti-Churn Autonomous Concierge Protection</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Select Your Subscription Plan for {business.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Keep your customer refill retention, local dialect voice concierge, and 1-tap dispatch engine running 24/7 without interruption.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative rounded-3xl p-6 transition cursor-pointer flex flex-col justify-between border ${
                  isSelected
                    ? 'bg-gradient-to-b from-slate-900 to-slate-900/90 border-emerald-500 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/30'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                {plan.discountBadge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-[10px] tracking-wider uppercase shadow-md">
                    {plan.discountBadge}
                  </span>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-base text-white">{plan.name}</h3>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-emerald-500 bg-emerald-500 text-slate-950' : 'border-slate-700'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white">{formatNgn(plan.amount)}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{plan.billingCycle}</p>
                    {plan.savingsText && (
                      <p className="text-xs text-emerald-400 font-bold mt-1">🎉 {plan.savingsText}</p>
                    )}
                  </div>

                  <div className="border-t border-slate-800 pt-4 space-y-2.5">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-start gap-2 text-xs text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    type="button"
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <span>{isSelected ? 'Selected Plan' : 'Choose Plan'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Checkout Action Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5 max-w-xl mx-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <p className="text-xs text-slate-400">Selected Retainer</p>
              <h3 className="text-lg font-black text-white">{activePlan.name}</h3>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-emerald-400">{formatNgn(activePlan.amount)}</p>
              <p className="text-[10px] text-slate-400">{activePlan.billingCycle}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Store Owner WhatsApp / Contact Phone
              </label>
              <input
                type="tel"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder="09169153129"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Billing Email Address (for tax invoice & receipt)
              </label>
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="owner@pharmacy.com"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={paying}
            className="w-full py-3.5 px-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Lock className="w-4 h-4 text-slate-950" />
            <span>{paying ? 'Processing Retainer Payment...' : `Pay ${formatNgn(activePlan.amount)} with Flutterwave`}</span>
            <ArrowRight className="w-4 h-4 text-slate-950" />
          </button>

          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 pt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Secured by Flutterwave</span>
            </span>
            <span>•</span>
            <span>Cards, Bank Transfer &amp; OPay Supported</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function StoreBillingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-slate-400">Loading Billing Portal...</div>}>
      <BillingPortalInner />
    </Suspense>
  );
}
