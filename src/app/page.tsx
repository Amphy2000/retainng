'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useIsMounted } from '@/lib/useMounted';
import { formatNgn, formatRelativeTime } from '@/lib/utils';
import { getBusinesses, getCustomers, getSales, setActiveBusiness } from '@/lib/storage';
import Link from 'next/link';
import {
  Bot,
  TrendingUp,
  Building2,
  Sparkles,
  QrCode,
  Store,
  CheckCircle2,
  Clock,
  Zap,
  ExternalLink,
  Users,
  Settings,
  DollarSign,
  CreditCard,
  Receipt,
  MessageCircle,
  FileText,
  Check,
} from 'lucide-react';

const BIZ_ICONS: Record<string, string> = {
  pharmacy: '💊',
  clinic: '🩺',
  barber: '💈',
  salon: '💅',
  laundry: '🧺',
  spa_wellness: '🧖',
  other: '🏪',
};

export default function AgencyRadarPage() {
  const { openQrModal } = useApp();
  const mounted = useIsMounted();
  const [selectedBiz, setSelectedBiz] = useState<string>('all');
  const [syncVersion, setSyncVersion] = useState(0);
  const [radarView, setRadarView] = useState<'client_impact' | 'agency_mrr'>('client_impact');
  const [subFilter, setSubFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');

  useEffect(() => {
    const handleSync = () => setSyncVersion((v) => v + 1);
    window.addEventListener('retainng_fleet_synced', handleSync);
    return () => window.removeEventListener('retainng_fleet_synced', handleSync);
  }, []);

  const allBusinesses = useMemo(() => {
    if (!mounted) return [];
    return getBusinesses();
  }, [mounted, syncVersion]);

  // Agency Retainer MRR calculations
  const agencyMRR = useMemo(() => {
    return allBusinesses.reduce((acc, b) => acc + (b.monthly_retainer_ngn || 25000), 0);
  }, [allBusinesses]);

  const paidSubscribersCount = useMemo(() => {
    return allBusinesses.filter((b) => (b.subscription_status || 'active') === 'active').length;
  }, [allBusinesses]);

  const filteredSubscribers = useMemo(() => {
    if (subFilter === 'all') return allBusinesses;
    if (subFilter === 'paid') return allBusinesses.filter((b) => (b.subscription_status || 'active') === 'active');
    if (subFilter === 'pending') return allBusinesses.filter((b) => b.subscription_status === 'pending');
    if (subFilter === 'overdue') return allBusinesses.filter((b) => b.subscription_status === 'overdue');
    return allBusinesses;
  }, [allBusinesses, subFilter]);

  // Aggregate metrics across entire fleet or a single business
  const data = useMemo(() => {
    if (!mounted) {
      return {
        totalBusinesses: 0,
        totalPatients: 0,
        todayOnboarded: 0,
        totalRefills: 0,
        totalProtectedRevenue: 0,
        recentActivity: [],
      };
    }

    const stores = selectedBiz === 'all'
      ? allBusinesses
      : allBusinesses.filter((b) => b.id === selectedBiz);

    let totalPatients = 0;
    let todayOnboarded = 0;
    let totalRefills = 0;
    let totalProtectedRevenue = 0;
    const recentActivity: Array<{
      id: string;
      customerName: string;
      phone: string;
      service: string;
      businessName: string;
      date: string;
      badgeText: string;
      badgeColor: 'emerald' | 'blue';
    }> = [];

    stores.forEach((biz) => {
      const custs = getCustomers(biz.id);
      const sales = getSales(biz.id);

      custs.forEach((c) => {
        totalPatients++;
        const cDate = c.created_at || c.consent_date;
        if (cDate && new Date(cDate).toDateString() === new Date().toDateString()) {
          todayOnboarded++;
        }

        // Add to live activity if not already present in sales
        const hasMatchingSale = sales.some(
          (s) =>
            s.customer_id === c.id ||
            (s.customer_phone && c.phone && s.customer_phone.replace(/[\s+-]/g, '') === c.phone.replace(/[\s+-]/g, ''))
        );
        if (!hasMatchingSale) {
          recentActivity.push({
            id: `onboard_${c.id}`,
            customerName: c.full_name || 'Customer',
            phone: c.phone || '',
            service: c.tags?.[0] ? `${c.tags[0]} Onboarding` : 'Bag Slip QR Onboarding',
            businessName: biz.name,
            date: c.created_at || c.consent_date || new Date().toISOString(),
            badgeText: 'New Client',
            badgeColor: 'blue',
          });
        }
      });

      sales.forEach((s) => {
        totalRefills++;
        const val = s.amount_ngn && s.amount_ngn > 0
          ? s.amount_ngn
          : (biz.business_type === 'pharmacy' ? 12000 : 8000);
        totalProtectedRevenue += val;

        recentActivity.push({
          id: s.id,
          customerName: s.customer_name || 'Customer',
          phone: s.customer_phone || '',
          service: s.service_or_product || (biz.business_type === 'pharmacy' ? 'Prescription Refill' : 'Service Check-in'),
          businessName: biz.name,
          date: s.created_at || s.visit_date,
          badgeText: s.amount_ngn > 0 ? 'Fulfilled' : 'Check-in',
          badgeColor: 'emerald',
        });
      });
    });

    return {
      totalBusinesses: allBusinesses.length,
      totalPatients,
      todayOnboarded,
      totalRefills,
      totalProtectedRevenue,
      recentActivity: recentActivity.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    };
  }, [mounted, allBusinesses, selectedBiz]);

  if (!mounted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-500 text-xs">
        Loading Agency Radar...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* ━━ 1. RADAR HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              Autonomous Agency Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Founder&apos;s Revenue Radar
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
            Everything your AI Concierge is doing across your partner businesses. Zero manual data entry.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/settings"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
          >
            <span>+ Add New Partner</span>
          </Link>
        </div>
      </div>

      {/* ━━ 2. FILTER STORE (CLEAN DROPDOWN FOR SCALE) ━━━━━━━━━━━━━━ */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-800">Viewing Partner:</span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedBiz}
            onChange={(e) => setSelectedBiz(e.target.value)}
            className="text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-64 cursor-pointer"
          >
            <option value="all">🌍 All Stores (Agency Fleet Total)</option>
            {allBusinesses.map((b) => (
              <option key={b.id} value={b.id}>
                {BIZ_ICONS[b.business_type] || '🏪'} {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ━━ 2b. VIEW TOGGLE (CLIENT IMPACT vs AGENCY REVENUE) ━━━━━━━━━━━ */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit">
        <button
          onClick={() => setRadarView('client_impact')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            radarView === 'client_impact'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          📊 Client Impact
        </button>
        <button
          onClick={() => setRadarView('agency_mrr')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
            radarView === 'agency_mrr'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          Agency Revenue
        </button>
      </div>

      {/* ━━ AGENCY MRR ANALYTICS VIEW ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {radarView === 'agency_mrr' && (
        <div className="space-y-4">
          {/* Revenue summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monthly MRR</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-600 leading-none">{formatNgn(agencyMRR)}</p>
              <p className="text-xs text-slate-500 pt-0.5">Retainer income / month</p>
            </div>

            <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Annual Run Rate</span>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 leading-none">{formatNgn(agencyMRR * 12)}</p>
              <p className="text-xs text-slate-500 pt-0.5">Projected ARR</p>
            </div>

            <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Partners</span>
                <Check className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 leading-none">{paidSubscribersCount}</p>
              <p className="text-xs text-slate-500 pt-0.5">Paid subscribers</p>
            </div>

            <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Partners</span>
                <Building2 className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 leading-none">{allBusinesses.length}</p>
              <p className="text-xs text-slate-500 pt-0.5">On platform</p>
            </div>
          </div>

          {/* Subscriber management table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-slate-900">Subscriber Management</h2>
                <p className="text-xs text-slate-500 mt-0.5">Track retainers, subscription status, and partner health</p>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(['all', 'paid', 'pending', 'overdue'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setSubFilter(f)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition capitalize ${
                      subFilter === f
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {f === 'paid' ? 'Active (Paid)' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredSubscribers.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No partners match this filter.
                </div>
              ) : (
                filteredSubscribers.map((biz) => {
                  const status = biz.subscription_status || 'active';
                  const retainer = biz.monthly_retainer_ngn || 25000;
                  const badgeColor =
                    status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : status === 'pending'
                      ? 'bg-amber-100 text-amber-800'
                      : status === 'overdue'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-blue-100 text-blue-800';

                  return (
                    <div
                      key={biz.id}
                      className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="text-xl p-2 bg-slate-100 rounded-xl shrink-0">
                          {BIZ_ICONS[biz.business_type] || '🏪'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-sm text-slate-900 truncate">{biz.name}</div>
                          <div className="text-xs text-slate-400 capitalize">{biz.business_type} · {biz.city || 'Nigeria'}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                        <div className="text-right">
                          <div className="text-sm font-black text-slate-900">{formatNgn(retainer)}/mo</div>
                          {biz.subscription_renewal_date && (
                            <div className="text-[10px] text-slate-400">Renews {biz.subscription_renewal_date}</div>
                          )}
                        </div>

                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${badgeColor}`}>
                          {status === 'active' ? '✓ Active' : status === 'pending' ? '⏳ Pending' : status === 'overdue' ? '⚠️ Overdue' : '🔵 Trial'}
                        </span>

                        <Link
                          href={`/settings?biz=${biz.id}`}
                          onClick={() => setActiveBusiness(biz.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition border border-slate-200"
                          title="Manage Partner"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>💡 Set retainer amounts &amp; renewal dates in each partner&apos;s Settings</span>
              <span className="font-bold text-slate-700">{filteredSubscribers.length} partner{filteredSubscribers.length !== 1 ? 's' : ''} shown</span>
            </div>
          </div>
        </div>
      )}

      {/* ━━ 3. THE 3 NUMBERS THAT PROVE YOUR VALUE ━━━━━━━━━━━━━━━━━━━━━ */}
      {radarView === 'client_impact' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Clients Onboarded
                </span>
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-3xl font-black text-slate-900 leading-none">
                {data.totalPatients}
              </p>
              <p className="text-xs text-slate-500 pt-1">
                {data.todayOnboarded > 0 ? (
                  <span className="text-emerald-600 font-bold">+{data.todayOnboarded} joined today</span>
                ) : (
                  <span>All-time client network</span>
                )}
              </p>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Repeat Orders Handled
                </span>
                <Bot className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-3xl font-black text-slate-900 leading-none">
                {data.totalRefills}
              </p>
              <p className="text-xs text-slate-500 pt-1">
                Fulfilled via WhatsApp without staff effort
              </p>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Protected Client Revenue
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-3xl font-black text-emerald-600 leading-none">
                {formatNgn(data.totalProtectedRevenue)}
              </p>
              <p className="text-xs text-slate-500 pt-1">
                Repeat sales saved from competitors
              </p>
            </div>
          </div>

          {/* ━━ 4. WHAT THE AI HAS DONE & WHAT IT WILL DO NEXT ━━━━━━━━━━━━━━ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* WHAT AI HAS DONE */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    What AI Has Done (Live Activity)
                  </h2>
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Live Feed</span>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {data.recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    No repeat orders logged yet. As clients and patients scan QR slips and text the bot, their orders appear here!
                  </div>
                ) : (
                  data.recentActivity.map((act) => (
                    <div
                      key={act.id}
                      className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-slate-900 truncate">
                          {act.customerName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {act.service} • <span className="text-slate-400">{act.businessName}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full block ${
                            act.badgeColor === 'blue'
                              ? 'text-blue-700 bg-blue-100/80 border border-blue-200'
                              : 'text-emerald-700 bg-emerald-100/70 border border-emerald-200'
                          }`}
                        >
                          {act.badgeText}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          {formatRelativeTime(act.date)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* WHAT AI WILL DO NEXT */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    What AI Will Do Next (Autonomous Queue)
                  </h2>
                </div>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 font-bold px-2 py-0.5 rounded-full uppercase">
                  Automated
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>⏱️ Tomorrow at 9:00 AM WAT</span>
                    <span className="text-[10px] text-emerald-600 font-bold">Cron Scheduled</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Scan customer records for 25-day chronic refills, hair touch-ups, or service return cycle triggers.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>📅 1st of Next Month at 9:00 AM</span>
                    <span className="text-[10px] text-emerald-600 font-bold">Executive Report</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Compile total protected repeat revenue and send monthly WhatsApp Executive Reports &amp; ₦25,000 management invoices to owners.
                  </p>
                </div>

                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                    <span>🛡️ Continuous 24/7 Watchdog</span>
                    <span className="text-[10px] text-emerald-700 font-black">Active</span>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Listens on Green-API webhook for new QR slip scans, natural Nigerian Pidgin refill messages, and manager dispatch pings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ━━ 5. PARTNER BUSINESS FLEET & BAG SLIPS ━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900">Partner Businesses</h2>
            <p className="text-xs text-slate-500">Click to print bag slips or open their client portal</p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {allBusinesses.map((biz) => {
            const icon = BIZ_ICONS[biz.business_type] || '🏪';
            const custCount = getCustomers(biz.id).length;

            const isPharm = biz.business_type === 'pharmacy' || biz.business_type === 'clinic';
            const isBarber = biz.business_type === 'barber' || biz.business_type === 'salon';
            const isLaundry = biz.business_type === 'laundry';

            const noun = isPharm ? 'patients' : isLaundry ? 'customers' : 'clients';
            const slipTag = isPharm
              ? '100% Bag Slip QR'
              : isBarber
              ? 'Mirror Stand Card'
              : isLaundry
              ? 'Laundry Bag Tag'
              : 'Counter QR Slip';
            const printBtnLabel = isPharm
              ? 'Print 4-in-1 Slips'
              : isBarber
              ? 'Print Stand Card'
              : isLaundry
              ? 'Print Bag Tags'
              : 'Print QR Slips';

            return (
              <div
                key={biz.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 rounded-xl px-2 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-2xl p-2 bg-slate-100 rounded-2xl">{icon}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm text-slate-900 truncate">{biz.name}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
                        {biz.business_type}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      <span>{custCount} {noun} onboarded</span>
                      <span className="mx-1.5">•</span>
                      <span className="text-emerald-600 font-semibold">{slipTag}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/portal/${biz.opt_in_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Store className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Portal</span>
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
                    <span>{printBtnLabel}</span>
                  </button>

                  <Link
                    href={`/settings?biz=${biz.id}`}
                    onClick={() => setActiveBusiness(biz.id)}
                    title="Manage / Configure Partner"
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer border border-slate-200"
                  >
                    <Settings className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
