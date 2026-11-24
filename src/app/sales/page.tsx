'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatNgn, formatRelativeTime } from '@/lib/utils';
import { getBusinesses, getSales, getCustomers } from '@/lib/storage';
import {
  TrendingUp,
  Bot,
  CheckCircle2,
  Calendar,
  MessageCircle,
  Building2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
} from 'lucide-react';

export default function AnalyticsRetainedPage() {
  const { activeBusiness } = useApp();
  const [selectedBiz, setSelectedBiz] = useState<string>('all');

  const allBusinesses = useMemo(() => getBusinesses(), []);

  // Compute metrics across selected business or entire agency fleet
  const metrics = useMemo(() => {
    const stores = selectedBiz === 'all'
      ? allBusinesses
      : allBusinesses.filter((b) => b.id === selectedBiz);

    let totalPatients = 0;
    let todayOnboarded = 0;
    let totalRefills = 0;
    let totalProtectedRevenue = 0;
    const nowStr = new Date().toDateString();
    const activityLog: Array<{
      id: string;
      customerName: string;
      service: string;
      businessName: string;
      date: string;
      status: string;
      type: 'refill' | 'wellness' | 'linked';
    }> = [];

    stores.forEach((biz) => {
      const custs = getCustomers(biz.id);
      const sales = getSales(biz.id);
      totalPatients += custs.length;

      custs.forEach((c) => {
        const cDate = c.created_at || c.consent_date;
        if (cDate && new Date(cDate).toDateString() === nowStr) {
          todayOnboarded++;
        }
      });

      sales.forEach((s) => {
        totalRefills++;
        const val = s.amount_ngn && s.amount_ngn > 0
          ? s.amount_ngn
          : (biz.business_type === 'pharmacy' ? 12000 : 8000);
        totalProtectedRevenue += val;

        activityLog.push({
          id: s.id,
          customerName: s.customer_name || 'Customer',
          service: s.service_or_product || 'Prescription Refill',
          businessName: biz.name,
          date: s.created_at,
          status: 'Fulfilled via WhatsApp',
          type: 'refill',
        });
      });
    });

    return {
      totalCustomers: totalPatients,
      todayOnboarded,
      totalRefills,
      totalProtectedRevenue,
      activityLog: activityLog.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    };
  }, [allBusinesses, selectedBiz]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            AI Performance &amp; Protected Revenue
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time audit log of customer refills, automated follow-ups, and protected repeat sales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>AI Autopilot Active</span>
          </div>
        </div>
      </div>

      {/* Fleet Filter Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mr-1">
          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
          Filter Store:
        </span>
        <button
          onClick={() => setSelectedBiz('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            selectedBiz === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          All Stores (Fleet Overview)
        </button>
        {allBusinesses.map((b) => (
          <button
            key={b.id}
            onClick={() => setSelectedBiz(b.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              selectedBiz === b.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>

      {/* 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Repeat Refills Handled
            </span>
            <Bot className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 leading-none">
            {metrics.totalRefills}
          </p>
          <p className="text-xs text-slate-500 pt-1">
            Orders processed via WhatsApp concierge
          </p>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Protected Repeat Revenue
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-emerald-600 leading-none">
            {formatNgn(metrics.totalProtectedRevenue)}
          </p>
          <p className="text-xs text-slate-500 pt-1">
            Prescription refills saved from competitors
          </p>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Clients Onboarded
            </span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 leading-none">
            {metrics.totalCustomers}
          </p>
          <p className="text-xs text-slate-500 pt-1">
            {metrics.todayOnboarded > 0 ? (
              <span className="text-emerald-600 font-bold">+{metrics.todayOnboarded} joined today</span>
            ) : (
              <span>All-time client network</span>
            )}
          </p>
        </div>
      </div>

      {/* What the Bot Has Done & What It Is About To Do */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card A: What the Bot Has Done (Audit Trail) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Completed Actions (What AI Has Done)
              </h2>
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase">
              Live Feed
            </span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {metrics.activityLog.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No orders recorded yet. As patients text the bot, their refill alerts appear here!
              </div>
            ) : (
              metrics.activityLog.map((act) => (
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
                      Dispatched
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

        {/* Card B: What the Bot Is About To Do (Upcoming Autonomous Queue) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Upcoming Queue (What AI Will Do Next)
              </h2>
            </div>
            <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 font-bold px-2 py-0.5 rounded-full uppercase">
              Autonomous
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>⏱️ Tomorrow at 9:00 AM WAT</span>
                <span className="text-[10px] text-emerald-600">Cron Scheduled</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Scan patient database for 25-day chronic refill reminders (BP, Metformin, Ulcer) and 4-day acute wellness check-ins.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>📅 1st of Next Month at 9:00 AM</span>
                <span className="text-[10px] text-emerald-600">Executive Report</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Compile total protected repeat revenue and dispatch WhatsApp Executive Reports &amp; agency invoices to pharmacy managers.
              </p>
            </div>

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                <span>🛡️ Continuous 24/7 Watchdog</span>
                <span className="text-[10px] text-emerald-700 font-black">Always On</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Listens on Green-API webhook for instant patient QR scans, natural Pidgin refill orders, and manager dispatch pings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
