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
  BarChart2,
  PlusCircle,
  QrCode,
  Send,
  Building2,
  Sparkles,
  ShieldCheck,
  RefreshCw,
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

function healthColor(score: number) {
  if (score >= 75) return { ring: 'border-emerald-500/40', bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Healthy' };
  if (score >= 50) return { ring: 'border-amber-500/40', bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Needs Care' };
  return { ring: 'border-rose-500/40', bg: 'bg-rose-500/10', text: 'text-rose-400', label: 'At Risk' };
}

export default function AgencyHQPage() {
  const { activeBusiness, customers, sales, refreshData, openRecordSaleModal, openQrModal } = useApp();
  const mounted = useIsMounted();
  const [quickCheckIn, setQuickCheckIn] = useState(false);
  const [quickAmount, setQuickAmount] = useState('5000');
  const [quickCustId, setQuickCustId] = useState('');
  const [checkinSuccess, setCheckinSuccess] = useState<string | null>(null);

  // Load ALL businesses + their data for agency overview
  const allBusinessData = useMemo(() => {
    if (!mounted) return [];
    try {
      const bizList = getBusinesses();
      return bizList.map((biz) => {
        const bizCustomers = getCustomers(biz.id);
        const bizSales = getSales(biz.id);
        const cadence = BIZ_CADENCE[biz.business_type] || 21;
        const now = new Date();
        const lapsedCustomers = bizCustomers.filter(c => {
          if (!c.last_visit_date || c.consent_status !== 'consented') return false;
          const diff = Math.floor((now.getTime() - new Date(c.last_visit_date).getTime()) / 86400000);
          return diff >= cadence;
        });
        const thisMonthStr = new Date().toISOString().slice(0, 7);
        const thisMonthSales = bizSales.filter(s => s.visit_date?.startsWith(thisMonthStr));
        const monthRevenue = thisMonthSales.reduce((a, s) => a + (Number(s.amount_ngn) || 0), 0);
        const totalRevenue = bizSales.reduce((a, s) => a + (Number(s.amount_ngn) || 0), 0);
        const consentedCount = bizCustomers.filter(c => c.consent_status === 'consented').length;
        const health = getHealthScore(bizCustomers, bizSales, cadence);
        const lapsedValue = lapsedCustomers.reduce((a, c) => a + (c.total_spent_ngn || 5000), 0);
        return {
          biz,
          customers: bizCustomers,
          sales: bizSales,
          lapsedCustomers,
          monthRevenue,
          totalRevenue,
          consentedCount,
          health,
          lapsedValue,
          cadence,
        };
      });
    } catch {
      return [];
    }
  }, [mounted]);

  // Global agency metrics
  const globalMetrics = useMemo(() => {
    const totalClients = allBusinessData.length;
    const totalCustomers = allBusinessData.reduce((a, d) => a + d.customers.length, 0);
    const totalConsentRate = totalCustomers > 0
      ? Math.round((allBusinessData.reduce((a, d) => a + d.consentedCount, 0) / totalCustomers) * 100)
      : 0;
    const totalLapsed = allBusinessData.reduce((a, d) => a + d.lapsedCustomers.length, 0);
    const totalLapsedValue = allBusinessData.reduce((a, d) => a + d.lapsedValue, 0);
    const totalMonthRevenue = allBusinessData.reduce((a, d) => a + d.monthRevenue, 0);
    const avgHealth = allBusinessData.length > 0
      ? Math.round(allBusinessData.reduce((a, d) => a + d.health, 0) / allBusinessData.length)
      : 0;
    return { totalClients, totalCustomers, totalConsentRate, totalLapsed, totalLapsedValue, totalMonthRevenue, avgHealth };
  }, [allBusinessData]);

  // AI live action feed across all businesses
  const aiLiveFeed = useMemo(() => {
    const now = new Date();
    const actions: Array<{
      bizName: string;
      bizType: string;
      action: string;
      customerName: string;
      customerPhone: string;
      waUrl: string;
      status: 'queued' | 'urgent';
      value: number;
    }> = [];

    for (const data of allBusinessData) {
      const cadence = data.cadence;
      for (const c of data.lapsedCustomers.slice(0, 2)) {
        const diff = Math.floor((now.getTime() - new Date(c.last_visit_date!).getTime()) / 86400000);
        const firstName = c.full_name?.split(' ')[0] || 'Customer';
        const bizName = data.biz.name;
        const isPharmacy = data.biz.business_type === 'pharmacy';
        const msg = isPharmacy
          ? `Hello ${firstName}! 💊 This is ${bizName}. Your ${cadence}-day refill window is now open. Reply here to schedule your next pickup or delivery — we'll have it ready for you!`
          : `Hello ${firstName}! It's ${bizName}. We noticed it's been ${diff} days since your last visit. We'd love to see you back this week — reply to claim your VIP priority slot!`;
        actions.push({
          bizName: data.biz.name,
          bizType: data.biz.business_type,
          action: isPharmacy ? 'Refill Reminder' : 'Lapsed Recovery',
          customerName: c.full_name || 'Customer',
          customerPhone: c.phone,
          waUrl: getWhatsAppUrl(c.phone, msg),
          status: diff > cadence * 1.5 ? 'urgent' : 'queued',
          value: c.total_spent_ngn || 5000,
        });
      }
    }
    return actions.slice(0, 8);
  }, [allBusinessData]);

  const todayStr = new Date().toISOString().split('T')[0];
  const topCustomers = customers.slice(0, 5);

  function handleQuickLog() {
    if (!activeBusiness) return;
    const { recordSale } = require('@/lib/storage');
    try {
      const amount = Number(quickAmount) || 5000;
      if (quickCustId) {
        recordSale(activeBusiness.id, {
          customer_id: quickCustId,
          amount_ngn: amount,
          visit_date: todayStr,
          service_or_product: 'Staff-logged Visit',
        });
        const cust = customers.find(c => c.id === quickCustId);
        setCheckinSuccess(`✓ ${cust?.full_name?.split(' ')[0] || 'Customer'} — ₦${amount.toLocaleString()} logged`);
      } else {
        recordSale(activeBusiness.id, {
          new_customer_name: 'Walk-in Guest',
          new_customer_phone: '08000000000',
          amount_ngn: amount,
          visit_date: todayStr,
          service_or_product: 'Walk-in Visit',
          grant_marketing_consent: false,
        });
        setCheckinSuccess(`✓ Walk-in ₦${amount.toLocaleString()} logged`);
      }
      refreshData();
      setQuickCheckIn(false);
      setTimeout(() => setCheckinSuccess(null), 4000);
    } catch (err) {
      console.error(err);
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-500 text-sm">Loading Agency HQ...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">

      {/* ━━━ AGENCY HERO HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl border border-slate-800 overflow-hidden p-5 sm:p-7">
        {/* Decorative grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/25 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Agency Autopilot — Active</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              Agency HQ
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-xl leading-relaxed">
              Your AI is actively monitoring <span className="text-emerald-400 font-semibold">{globalMetrics.totalClients} client businesses</span>, running retention playbooks, and queuing personalized re-engagement messages — 24/7 on autopilot.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => openRecordSaleModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-900/40 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Log Visit
            </button>
            <button
              onClick={() => openQrModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              Counter Stand
            </button>
          </div>
        </div>

        {/* ━━ Global Impact Metrics ━━ */}
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {[
            {
              label: 'Managed Clients',
              value: globalMetrics.totalClients,
              icon: Building2,
              color: 'text-emerald-400',
              sub: 'All on AI autopilot',
            },
            {
              label: 'Revenue At Risk',
              value: formatNgn(globalMetrics.totalLapsedValue),
              icon: TrendingUp,
              color: 'text-amber-400',
              sub: `${globalMetrics.totalLapsed} lapsed customers`,
            },
            {
              label: 'Total Customers',
              value: globalMetrics.totalCustomers,
              icon: Users,
              color: 'text-sky-400',
              sub: `${globalMetrics.totalConsentRate}% AI consent rate`,
            },
            {
              label: 'Avg Client Health',
              value: `${globalMetrics.avgHealth}%`,
              icon: Zap,
              color: globalMetrics.avgHealth >= 70 ? 'text-emerald-400' : 'text-amber-400',
              sub: 'Across all clients',
            },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
                <div className={`flex items-center gap-1.5 mb-1`}>
                  <Icon className={`w-3.5 h-3.5 ${m.color}`} />
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{m.label}</span>
                </div>
                <div className={`text-xl sm:text-2xl font-black ${m.color} leading-none`}>{m.value}</div>
                <div className="text-[10px] text-slate-600 mt-1">{m.sub}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ━━━ CLIENT PORTFOLIO GRID ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-black text-slate-900">Client Portfolio</h2>
            <p className="text-xs text-slate-500 mt-0.5">AI retention running for every client below</p>
          </div>
          <Link href="/settings" className="text-xs text-emerald-700 font-semibold hover:text-emerald-600 flex items-center gap-1 transition">
            + Add Client <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allBusinessData.map((data) => {
            const { biz, customers: bizCusts, lapsedCustomers, monthRevenue, health, lapsedValue } = data;
            const hc = healthColor(health);
            const icon = BIZ_ICONS[biz.business_type] || '🏪';
            const isActive = biz.id === activeBusiness?.id;
            const consentedPct = bizCusts.length > 0 ? Math.round((bizCusts.filter(c => c.consent_status === 'consented').length / bizCusts.length) * 100) : 0;

            return (
              <div
                key={biz.id}
                className={`relative bg-white border-2 rounded-2xl p-4 transition group ${
                  isActive ? 'border-emerald-400 shadow-md shadow-emerald-100' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                {isActive && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-400/30 rounded-full">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">Active</span>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className="text-2xl">{icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm text-slate-900 leading-tight truncate pr-10">{biz.name}</div>
                    <div className="text-[11px] text-slate-500 capitalize mt-0.5">{biz.business_type} • {biz.city}</div>
                  </div>
                </div>

                {/* Health bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Client Health</span>
                    <span className={`text-xs font-black ${hc.text}`}>{health}% — {hc.label}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${health >= 75 ? 'bg-emerald-500' : health >= 50 ? 'bg-amber-400' : 'bg-rose-500'}`}
                      style={{ width: `${health}%` }}
                    />
                  </div>
                </div>

                {/* Key numbers */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="bg-slate-50 rounded-xl p-2 text-center">
                    <div className="text-sm font-black text-slate-800">{bizCusts.length}</div>
                    <div className="text-[9px] text-slate-500 font-medium mt-0.5">Customers</div>
                  </div>
                  <div className={`${lapsedCustomers.length > 0 ? 'bg-amber-50' : 'bg-slate-50'} rounded-xl p-2 text-center`}>
                    <div className={`text-sm font-black ${lapsedCustomers.length > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
                      {lapsedCustomers.length}
                    </div>
                    <div className="text-[9px] text-slate-500 font-medium mt-0.5">AI Queued</div>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-2 text-center">
                    <div className="text-sm font-black text-emerald-800">{consentedPct}%</div>
                    <div className="text-[9px] text-slate-500 font-medium mt-0.5">Consented</div>
                  </div>
                </div>

                {/* Revenue at risk callout */}
                {lapsedValue > 0 && (
                  <div className="mt-3 flex items-center gap-2 px-2.5 py-1.5 bg-amber-50 border border-amber-200/80 rounded-xl">
                    <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                    <span className="text-[11px] text-amber-800 font-semibold">
                      {formatNgn(lapsedValue)} revenue at risk — AI is working on it
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      setActiveBusiness(biz.id);
                      refreshData();
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {isActive ? '✓ Managing' : 'Manage Client'}
                  </button>
                  <Link
                    href="/campaigns"
                    className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition"
                    onClick={() => { if (!isActive) { setActiveBusiness(biz.id); refreshData(); } }}
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">AI</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ━━━ AI LIVE COMMAND FEED ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900">AI Live Action Feed</h2>
              <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 border border-emerald-200 rounded-full text-[10px] font-black text-emerald-700">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                LIVE
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">What your AI marketing team is doing right now across all clients</p>
          </div>
          <Link href="/campaigns" className="text-xs text-emerald-700 font-semibold hover:text-emerald-600 flex items-center gap-1 transition">
            Full Center <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {aiLiveFeed.length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-emerald-900">All caught up!</p>
            <p className="text-xs text-emerald-700 mt-1">No lapsed customers detected. AI is on standby.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {aiLiveFeed.map((action, i) => {
              const bizIcon = BIZ_ICONS[action.bizType] || '🏪';
              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border transition group ${
                    action.status === 'urgent'
                      ? 'bg-rose-50 border-rose-200/80'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Status dot */}
                  <div className={`mt-0.5 w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-sm ${
                    action.status === 'urgent' ? 'bg-rose-100' : 'bg-emerald-50'
                  }`}>
                    {bizIcon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-slate-900">{action.customerName}</span>
                      <span className="text-[10px] text-slate-400">via</span>
                      <span className="text-[10px] font-semibold text-slate-600 truncate">{action.bizName}</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide ${
                        action.status === 'urgent'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {action.status === 'urgent' ? '🔴 Urgent' : '🟡 Queued'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <Bot className="w-3 h-3 text-emerald-500" />
                      <span>{action.action}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-emerald-700 font-semibold">{formatNgn(action.value)} potential</span>
                    </div>
                  </div>

                  <a
                    href={action.waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-xl transition shadow-sm"
                  >
                    <Send className="w-3 h-3" />
                    <span className="hidden sm:inline">Send</span>
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ━━━ ACTIVE CLIENT QUICK CHECK-IN BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeBusiness && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <button
            onClick={() => setQuickCheckIn(!quickCheckIn)}
            className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/50 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-left">
                <div className="text-xs font-black text-white">
                  Quick Staff Check-in
                </div>
                <div className="text-[10px] text-slate-400">
                  {activeBusiness.name} · 3-second log
                </div>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-lg bg-slate-700 flex items-center justify-center transition ${quickCheckIn ? 'rotate-180' : ''}`}>
              <ArrowRight className="w-3 h-3 text-slate-400 rotate-90" />
            </div>
          </button>

          {quickCheckIn && (
            <div className="border-t border-slate-800 p-4 space-y-3">
              {checkinSuccess && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/15 border border-emerald-500/25 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-300">{checkinSuccess}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Customer</label>
                  <select
                    value={quickCustId}
                    onChange={e => setQuickCustId(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-800 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Walk-in Guest</option>
                    {topCustomers.map(c => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Amount (₦)</label>
                  <input
                    type="number"
                    value={quickAmount}
                    onChange={e => setQuickAmount(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-800 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="5000"
                  />
                </div>
              </div>
              <button
                onClick={handleQuickLog}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Log Visit Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* ━━━ AGENCY ROI PROOF BANNER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-950 to-slate-950 border border-emerald-800/60 rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Agency ROI Proof</span>
            </div>
            <h3 className="text-base font-black text-white leading-tight">
              Your AI is protecting{' '}
              <span className="text-emerald-400">{formatNgn(globalMetrics.totalLapsedValue)}</span>
              {' '}in at-risk revenue
            </h3>
            <p className="text-xs text-emerald-200/60 mt-1">
              {globalMetrics.totalLapsed} customers detected as lapsed. AI queuing re-engagement across all {globalMetrics.totalClients} clients.
            </p>
          </div>
          <Link
            href="/campaigns"
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs rounded-xl transition shadow-md shadow-emerald-900/40"
          >
            <Bot className="w-4 h-4" />
            Open AI Command Center
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ━━━ WHAT WE DELIVER (PITCH CARD) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            icon: '🤖',
            title: 'Full Autopilot',
            desc: 'AI monitors visit cadence 24/7 and queues personalized re-engagement — zero staff effort after setup.',
            tag: 'Zero Maintenance',
            tagColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          },
          {
            icon: '🎯',
            title: 'Industry Playbooks',
            desc: 'Pharmacy refill reminders. Barber biweekly triggers. Salon style-refresh nudges. Each client gets its own AI strategy.',
            tag: 'Business-Specific',
            tagColor: 'bg-sky-50 text-sky-800 border-sky-200',
          },
          {
            icon: '📊',
            title: 'Proof of Delivery',
            desc: 'Revenue protected, customers recovered, campaigns dispatched. Every result tracked so clients never question the ROI.',
            tag: 'Measurable Results',
            tagColor: 'bg-amber-50 text-amber-800 border-amber-200',
          },
        ].map(card => (
          <div key={card.title} className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-sm hover:border-slate-300 transition">
            <div className="text-2xl mb-2">{card.icon}</div>
            <div className="font-extrabold text-sm text-slate-900 mb-1">{card.title}</div>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">{card.desc}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${card.tagColor}`}>
              {card.tag}
            </span>
          </div>
        ))}
      </div>

    </div>
  );
}
