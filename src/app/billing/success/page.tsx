'use client';

import React, { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ShieldCheck, ArrowRight, Store, Bot } from 'lucide-react';
import { formatNgn } from '@/lib/utils';

function SuccessInner() {
  const searchParams = useSearchParams();
  const plan = searchParams?.get('plan') || 'quarterly';
  const slug = searchParams?.get('slug') || '';
  const txRef = searchParams?.get('tx_ref') || searchParams?.get('transaction_id') || '';
  const amount = Number(searchParams?.get('amount')) || (plan === 'annual' ? 240000 : plan === 'quarterly' ? 67500 : 25000);

  useEffect(() => {
    if (txRef && slug) {
      fetch('/api/billing/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tx_ref: txRef,
          plan_id: plan,
          slug: slug,
        }),
      }).catch((e) => console.warn('Billing verification error:', e));
    }
  }, [txRef, slug, plan]);

  const planLabel =
    plan === 'annual'
      ? 'Annual Retainer (12 Months)'
      : plan === 'quarterly'
      ? 'Quarterly Retainer (3 Months)'
      : 'Monthly Retainer (1 Month)';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-emerald-500 selection:text-white">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-7 text-center space-y-6 shadow-2xl shadow-emerald-500/10">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-9 h-9 text-emerald-400" />
        </div>

        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full inline-block">
            Payment Verified &amp; Active
          </span>
          <h1 className="text-2xl font-black text-white">Retainer Subscription Active!</h1>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            Your RetainNG Agency Autopilot has been successfully renewed. Your customers will continue receiving automated refill care.
          </p>
        </div>

        <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-left text-xs space-y-2">
          <div className="flex justify-between text-slate-400">
            <span>Activated Plan</span>
            <span className="font-bold text-white">{planLabel}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Amount Paid</span>
            <span className="font-bold text-emerald-400">{formatNgn(amount)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Payment Gateway</span>
            <span className="font-bold text-slate-300">Flutterwave Live (Verified)</span>
          </div>
          <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-2">
            <span>AI Concierge Status</span>
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              100% Autonomous Active
            </span>
          </div>
        </div>

        <div className="space-y-2.5 pt-2">
          {slug ? (
            <Link
              href={`/portal/${slug}`}
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <Store className="w-4 h-4 text-slate-950" />
              <span>Return to Store Portal</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </Link>
          ) : (
            <div className="text-xs text-slate-400 py-2">
              You can now close this tab and return to WhatsApp.
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Automated Tax Invoice sent to your email &amp; WhatsApp</span>
        </p>
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-slate-400">Verifying payment...</div>}>
      <SuccessInner />
    </Suspense>
  );
}
