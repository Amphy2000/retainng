'use client';

import React, { useState, useEffect } from 'react';
import { OnboardingState } from '@/types';
import { getOnboardingState, getActiveBusiness } from '@/lib/storage';
import { CheckCircle2, Circle, Sparkles, ChevronRight, X } from 'lucide-react';
import Link from 'next/link';

interface Props {
  onOpenRecordModal?: () => void;
  onOpenQrModal?: () => void;
}

export function OnboardingBanner({ onOpenRecordModal, onOpenQrModal }: Props) {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const biz = getActiveBusiness();
      if (biz) {
        setState(getOnboardingState(biz.id));
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (dismissed || !state) return null;

  const steps = [
    {
      id: 'profile',
      label: 'Business Profile',
      desc: 'Set business name and type',
      done: state.has_created_profile,
      href: '/settings',
    },
    {
      id: 'customer',
      label: 'Add Customer',
      desc: 'Record a contact & consent status',
      done: state.has_added_customer,
      href: '/customers',
    },
    {
      id: 'sale',
      label: 'Record Sale / Visit',
      desc: 'Takes 10 seconds on mobile',
      done: state.has_recorded_sale,
      onClick: onOpenRecordModal,
      href: onOpenRecordModal ? undefined : '/sales',
    },
    {
      id: 'qr',
      label: 'Display Opt-in QR',
      desc: 'Let customers self-register',
      done: state.has_viewed_qr,
      onClick: onOpenQrModal,
      href: onOpenQrModal ? undefined : '/customers',
    },
    {
      id: 'campaign',
      label: 'Draft Follow-up',
      desc: 'Preview targeted segment message',
      done: state.has_drafted_campaign,
      href: '/campaigns',
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allCompleted = completedCount === steps.length;

  return (
    <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-emerald-800/40 relative overflow-hidden mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              Quick Start Checklist
            </span>
            <span className="text-xs text-slate-400">
              {completedCount} of {steps.length} done
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white mt-1">
            {allCompleted ? '🎉 Your retention engine is fully ready!' : 'Get your customer retention flywheel going'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5 max-w-xl">
            {allCompleted
              ? 'You have customer records, visits, and campaign previews set up. Keep recording visits to see repeat behavior.'
              : 'Complete these quick steps to build your customer list and drive repeat visits without bookkeeping friction.'}
          </p>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          aria-label="Dismiss checklist"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress track */}
      <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
        <div
          className="bg-emerald-400 h-full rounded-full transition-all duration-500"
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        />
      </div>

      {/* Horizontal Step Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
        {steps.map((step) => {
          const content = (
            <div
              className={`p-2.5 rounded-xl border text-left h-full transition ${
                step.done
                  ? 'bg-emerald-950/40 border-emerald-600/40 text-emerald-200'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                {step.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-500" />
                )}
                <ChevronRight className="w-3 h-3 text-slate-500" />
              </div>
              <p className="text-xs font-semibold text-white truncate">{step.label}</p>
              <p className="text-[11px] text-slate-400 line-clamp-1">{step.desc}</p>
            </div>
          );

          if (step.onClick) {
            return (
              <button key={step.id} onClick={step.onClick} className="w-full text-left">
                {content}
              </button>
            );
          }

          return (
            <Link key={step.id} href={step.href || '#'}>
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
