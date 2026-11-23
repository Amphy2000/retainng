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

  useEffect(() => {
    const handleSync = () => setSyncVersion((v) => v + 1);
    window.addEventListener('retainng_fleet_synced', handleSync);
    return () => window.removeEventListener('retainng_fleet_synced', handleSync);
  }, []);

  const allBusinesses = useMemo(() => {
    if (!mounted) return [];
    return getBusinesses();
  }, [mounted, syncVersion]);

  // Aggregate metrics across entire fleet or a single business
  const data = useMemo(() => {
    if (!mounted) {
      return {
        totalBusinesses: 0,
        totalPatients: 0,
        totalRefills: 0,
        totalProtectedRevenue: 0,
        recentActivity: [],
      };
    }

    const stores = selectedBiz === 'all'
      ? allBusinesses
      : allBusinesses.filter((b) => b.id === selectedBiz);

    let totalPatients = 0;
    let totalRefills = 0;
    let totalProtectedRevenue = 0;
    const recentActivity: Array<{
      id: string;
      customerName: string;
      phone: string;
      service: string;
      businessName: string;
      date: string;
    }> = [];

    stores.forEach((biz) => {
      const custs = getCustomers(biz.id);
      const sales = getSales(biz.id);
      totalPatients += custs.length;

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
          service: s.service_or_product || 'Prescription Refill',
          businessName: biz.name,
          date: s.created_at,
        });
      });
    });

    return {
      totalBusinesses: allBusinesses.length,
      totalPatients,
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

      {/* ━━ 3. THE 3 NUMBERS THAT PROVE YOUR VALUE ━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Staff Labor Required
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 leading-none">
            0 hrs
          </p>
          <p className="text-xs text-slate-500 pt-1">
            100% Bag Slip QR + WhatsApp Autopilot
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
                No refill orders logged yet. As patients scan bag slips and text the bot, their orders appear here!
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
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full block">
                      Fulfilled
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
                Scan patient records for 25-day chronic refill reminders (BP, Metformin, Ulcer) and 4-day acute wellness check-ins.
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
                    href="/settings"
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
