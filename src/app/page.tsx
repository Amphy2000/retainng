'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useIsMounted } from '@/lib/useMounted';
import { formatNgn, formatRelativeTime, getWhatsAppUrl } from '@/lib/utils';
import { getBusinesses, getCustomers, getSales, setActiveBusiness } from '@/lib/storage';
import { Business } from '@/types';
import Link from 'next/link';
import {
  Bot,
  TrendingUp,
  Users,
  Zap,
  ArrowRight,
  MessageCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  QrCode,
  Building2,
  Sparkles,
  ShieldCheck,
  Store,
  Lock,
  Unlock,
  Check,
  ExternalLink,
} from 'lucide-react';

const BIZ_ICONS: Record<string, string> = {
  barber: '💈',
  salon: '💅',
  laundry: '🧺',
  car_wash: '🚗',
  boutique: '👗',
  spa_wellness: '🧖',
  pharmacy: '💊',
  clinic: '🏥',
  other: '🏪',
};

const BIZ_CADENCE: Record<string, number> = {
  barber: 14,
  salon: 21,
  laundry: 10,
  car_wash: 14,
  boutique: 30,
  spa_wellness: 21,
  pharmacy: 28,
  clinic: 60,
  other: 21,
};

function getHealthScore(customers: ReturnType<typeof getCustomers>, sales: ReturnType<typeof getSales>, cadence: number): number {
  if (customers.length === 0) return 50;
  const now = new Date();
  const consentRate = customers.filter(c => c.consent_status === 'consented').length / customers.length;
  const activeRate = customers.filter(c => {
    if (!c.last_visit_date) return false;
    const diff = Math.floor((now.getTime() - new Date(c.last_visit_date).getTime()) / 86400000);
    return diff <= cadence;
  }).length / Math.max(customers.length, 1);
  const hasRecentSales = sales.some(s => {
    const diff = Math.floor((now.getTime() - new Date(s.created_at).getTime()) / 86400000);
    return diff <= 7;
  });
  const score = Math.round((consentRate * 40) + (activeRate * 45) + (hasRecentSales ? 15 : 0));
  return Math.max(10, Math.min(99, score));
}

export default function AgencyHQPage() {
  const { activeBusiness, refreshData, openQrModal } = useApp();
  const mounted = useIsMounted();
  const [actionDoneToast, setActionDoneToast] = useState<string | null>(null);

  // Load ALL businesses + their clean stats
  const allBusinessData = useMemo(() => {
    if (!mounted) return [];
    try {
      const bizList = getBusinesses();
      const now = new Date();

      return bizList.map((biz) => {
        const bizCustomers = getCustomers(biz.id);
        const bizSales = getSales(biz.id);
        const cadence = BIZ_CADENCE[biz.business_type] || 21;

        const lapsedCustomers = bizCustomers.filter(c => {
          if (!c.last_visit_date || c.consent_status !== 'consented') return false;
          const diff = Math.floor((now.getTime() - new Date(c.last_visit_date).getTime()) / 86400000);
          return diff >= cadence;
        });

        const health = getHealthScore(bizCustomers, bizSales, cadence);
        const avgTicket = biz.business_type === 'pharmacy' ? 12000 : biz.business_type === 'barber' ? 6000 : 8000;
        const lapsedValue = lapsedCustomers.reduce((a, c) => a + (c.total_spent_ngn || avgTicket), 0);

        // Check if store has check-ins in last 3 days
        const lastSale = bizSales[0];
        const daysSinceLastSale = lastSale?.created_at
          ? Math.floor((now.getTime() - new Date(lastSale.created_at).getTime()) / 86400000)
          : 99;

        return {
          biz,
          customers: bizCustomers,
          sales: bizSales,
          lapsedCustomers,
          health,
          lapsedValue,
          cadence,
          daysSinceLastSale,
        };
      });
    } catch {
      return [];
    }
  }, [mounted]);

  // Overall clean totals
  const totals = useMemo(() => {
    const totalClients = allBusinessData.length;
    const totalCustomers = allBusinessData.reduce((a, d) => a + d.customers.length, 0);
    const totalLapsed = allBusinessData.reduce((a, d) => a + d.lapsedCustomers.length, 0);
    const totalLapsedValue = allBusinessData.reduce((a, d) => a + d.lapsedValue, 0);

    // Attention items: stores with no check-in for > 3 days
    const attentionStores = allBusinessData.filter(d => d.daysSinceLastSale > 3);

    return { totalClients, totalCustomers, totalLapsed, totalLapsedValue, attentionStores };
  }, [allBusinessData]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-500 text-sm">Loading Cockpit...</div>
      </div>
    );
  }

  // ━━━ SOLOPRENEUR MORNING COCKPIT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div className="space-y-5 pb-6 max-w-5xl mx-auto">

      {/* Toast */}
      {actionDoneToast && (
        <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionDoneToast}</span>
        </div>
      )}

      {/* ━━ 1. AUTOPILOT STATUS HEADER (ZERO FRICTION) ━━ */}
      <div className="bg-slate-950 text-white rounded-3xl border border-slate-800 p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
              Agency Autopilot Engine · 100% Autonomous
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Founder&apos;s Morning Radar
          </h1>
          <p className="text-xs text-slate-400">
            Monitoring {totals.totalClients} client accounts. AI runs visit cadences and customer retargeting while you sleep.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/campaigns"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
          >
            <Bot className="w-4 h-4" />
            <span>AI Command Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ━━ 2. 100% AUTOPILOT WATCHDOG STATUS ━━ */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              AI Retention Autopilot
            </h2>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Autonomous • 0 Staff Input
          </span>
        </div>

        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-emerald-950">
                All 5 Partner Stores Running Hands-Free
              </div>
              <div className="text-[11px] text-emerald-800/80 mt-0.5">
                Patients scan 4-in-1 bag slips ➔ WhatsApp AI binds them ➔ 28-day refill reminders &amp; dispensary orders trigger automatically.
              </div>
            </div>
          </div>

          <Link
            href="/campaigns"
            className="shrink-0 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
          >
            <span>View Queued Refills</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ━━ 3. THE 3 SIMPLE NUMBERS THAT PROVE YOUR AGENCY'S VALUE ━━ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Client Stores</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">
            {totals.totalClients}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            {totals.totalCustomers} regular customers tracked
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <Bot className="w-4 h-4 text-emerald-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider">AI Queued Actions</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 leading-none">
            {totals.totalLapsed}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Personalized recovery messages ready
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Protected Client Revenue</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 leading-none">
            {formatNgn(totals.totalLapsedValue)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            At-risk revenue the AI is recovering
          </p>
        </div>
      </div>

      {/* ━━ 4. CLIENT FLEET OVERVIEW (1 CLEAN LINE PER STORE) ━━ */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900">Your Client Fleet</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click &quot;Store Portal&quot; to view or send their counter interface
            </p>
          </div>
          <Link
            href="/settings"
            className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition"
          >
            + Onboard New Business
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {allBusinessData.map((data) => {
            const { biz, customers: bizCusts, lapsedCustomers, health } = data;
            const icon = BIZ_ICONS[biz.business_type] || '🏪';

            return (
              <div
                key={biz.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 rounded-xl px-2 transition"
              >
                {/* Store info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-2xl p-2 bg-slate-100 rounded-2xl">{icon}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm text-slate-900 truncate">{biz.name}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
                        {biz.business_type}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{bizCusts.length} customers</span>
                      <span>•</span>
                      <span className="text-emerald-600 font-semibold">{lapsedCustomers.length} AI queued</span>
                      <span>•</span>
                      <span className="text-slate-500 font-medium">Health: {health}%</span>
                    </div>
                  </div>
                </div>

                {/* 2 Simple Action Links */}
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/portal/${biz.opt_in_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Store className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Store Portal</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>

                  <button
                    onClick={() => {
                      setActiveBusiness(biz.id);
                      openQrModal(true);
                    }}
                    className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-emerald-200"
                  >
                    <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Print Bag Slips</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
