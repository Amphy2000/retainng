'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useIsMounted } from '@/lib/useMounted';
import { OnboardingBanner } from '@/components/OnboardingBanner';
import { DailyShiftModal } from '@/components/DailyShiftModal';
import { formatNgn, formatDate, formatRelativeTime } from '@/lib/utils';
import {
  Users,
  Receipt,
  UserCheck,
  Repeat,
  PlusCircle,
  QrCode,
  Send,
  ArrowRight,
  Info,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const {
    activeBusiness,
    customers,
    sales,
    openRecordSaleModal,
    openQrModal,
    openCustomerDetail,
  } = useApp();

  const mounted = useIsMounted();
  const [isDailyShiftOpen, setIsDailyShiftOpen] = useState(false);

  if (!mounted || !activeBusiness) {
    return (
      <div className="py-12 text-center text-slate-400 text-sm">
        Loading business dashboard...
      </div>
    );
  }

  // Dashboard Metrics
  const totalCustomers = customers.length;
  const consentedCustomers = customers.filter((c) => c.consent_status === 'consented').length;
  const consentedPct = totalCustomers > 0 ? Math.round((consentedCustomers / totalCustomers) * 100) : 0;

  const totalVisits = sales.length;
  const totalRevenueNgn = sales.reduce((acc, s) => acc + (Number(s.amount_ngn) || 0), 0);

  // Today's shift metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter((s) => s.visit_date === todayStr);
  const todayRevenueNgn = todaySales.reduce((acc, s) => acc + (Number(s.amount_ngn) || 0), 0);

  // Repeat customers (customers with 2 or more recorded sales/visits)
  const repeatCustomers = customers.filter((c) => (c.total_visits || 0) >= 2).length;
  const repeatRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;

  const recentSales = sales.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Onboarding Guidance Checklist */}
      <OnboardingBanner
        onOpenRecordModal={() => openRecordSaleModal()}
        onOpenQrModal={openQrModal}
      />

      {/* Welcome & Honest Record Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {activeBusiness.business_type} • {activeBusiness.city}
            </span>
            {activeBusiness.is_demo && (
              <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                Demo Data Active
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            {activeBusiness.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Customer retention and visit tracking overview.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openRecordSaleModal()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Sale / Visit</span>
          </button>

          <button
            onClick={() => setIsDailyShiftOpen(true)}
            title="View today's recorded visits and staff commission split"
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-xs rounded-xl border border-amber-200 shadow-2xs transition"
          >
            <span className="font-bold text-amber-700">₦</span>
            <span>Shift Tally ({todaySales.length})</span>
          </button>

          <button
            onClick={openQrModal}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 shadow-2xs transition"
          >
            <QrCode className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Opt-In QR</span>
          </button>
        </div>
      </div>

      {/* Honest Automation Disclaimer Banner */}
      <div className="bg-slate-100/80 border border-slate-200/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-800">Honest record statement:</strong> All numbers shown below are calculated strictly from visits recorded in this app or customer self-registrations. We do not scrape WhatsApp chats, Instagram DMs, or physical cash registers without a verified POS integration.
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Customers */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Customers
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {totalCustomers}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
            <Link href="/customers" className="text-blue-600 hover:underline font-medium">
              View customer list →
            </Link>
          </div>
        </div>

        {/* Consented for Follow-ups */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Marketing Consented
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2">
            {consentedCustomers}
          </p>
          <div className="flex items-center gap-1 mt-2 text-[11px] text-slate-500">
            <span className="font-semibold text-emerald-700">{consentedPct}%</span>
            <span>of database can receive offers</span>
          </div>
        </div>

        {/* Repeat Rate */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Repeat Visitors
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-purple-700 mt-2">
            {repeatCustomers}
          </p>
          <div className="flex items-center gap-1 mt-2 text-[11px] text-slate-500">
            <span className="font-semibold text-purple-700">{repeatRate}%</span>
            <span>have returned 2+ times</span>
          </div>
        </div>

        {/* Recorded Sales Volume */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Recorded Sales
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-2 truncate">
            {formatNgn(totalRevenueNgn)}
          </p>
          <div className="flex items-center gap-1 mt-2 text-[11px] text-slate-500">
            <span>Across</span>
            <span className="font-semibold text-slate-800">{totalVisits} recorded visits</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Activity & Visit Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  Recent Visits & Sales
                </h3>
                <p className="text-xs text-slate-500">
                  Recorded transactions and customer visits
                </p>
              </div>
              <Link
                href="/sales"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>View all ({sales.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentSales.length === 0 ? (
              <div className="p-8 text-center">
                <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No visits recorded yet</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Recording a customer visit takes 5 seconds on your phone. Start now to track repeat visits.
                </p>
                <button
                  onClick={() => openRecordSaleModal()}
                  className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl inline-flex items-center gap-1.5 shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Record First Visit</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition flex items-center justify-between gap-3 cursor-pointer"
                    onClick={() => openCustomerDetail(sale.customer_id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0 border border-slate-200">
                        {sale.customer_name?.charAt(0) || 'C'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {sale.customer_name || 'Customer'}
                          </p>
                          <span className="text-[11px] text-slate-500 hidden sm:inline">
                            {formatRelativeTime(sale.visit_date)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 truncate mt-0.5">
                          {sale.service_or_product || 'General Visit'}
                          {sale.notes ? ` • ${sale.notes}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-extrabold text-slate-900">
                        {formatNgn(sale.amount_ngn)}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatDate(sale.visit_date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Quick Retention Shortcuts & Segments */}
        <div className="space-y-4">
          {/* Quick Counter QR Action Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 border border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                Customer Self-Registration
              </span>
              <QrCode className="w-5 h-5 text-emerald-400" />
            </div>
            <h4 className="text-base font-bold text-white">
              Display Your Counter Stand
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Let clients scan a QR code while at your shop to enter their details and grant explicit marketing consent.
            </p>
            <div className="pt-1 flex items-center gap-2">
              <button
                onClick={openQrModal}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>Show QR Code</span>
              </button>
            </div>
          </div>

          {/* Retention Segments Teaser */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-900">Follow-up Segments</h4>
              <Link href="/segments" className="text-xs text-emerald-700 hover:underline font-semibold">
                View all →
              </Link>
            </div>
            <p className="text-xs text-slate-500">
              Ready-made groups for honest re-engagement:
            </p>

            <div className="space-y-2">
              <Link
                href="/campaigns?segment=inactive_30d"
                className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-800">Lapsed (30+ Days Away)</p>
                  <p className="text-[11px] text-slate-500">Past clients who haven’t visited</p>
                </div>
                <Send className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                href="/campaigns?segment=frequent_visitors"
                className="p-2.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 transition flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-800">VIP & Regulars (3+ Visits)</p>
                  <p className="text-[11px] text-slate-500">Reward your most loyal customers</p>
                </div>
                <Send className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Shift & Commission Modal */}
      <DailyShiftModal
        isOpen={isDailyShiftOpen}
        onClose={() => setIsDailyShiftOpen(false)}
      />
    </div>
  );
}
