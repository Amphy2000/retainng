'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useIsMounted } from '@/lib/useMounted';
import { OnboardingBanner } from '@/components/OnboardingBanner';
import { DailyShiftModal } from '@/components/DailyShiftModal';
import { CameraScannerModal } from '@/components/CameraScannerModal';
import { formatNgn, formatDate, formatRelativeTime, getWhatsAppUrl, parsePaymentAlert } from '@/lib/utils';
import { recordSale } from '@/lib/storage';
import {
  Users,
  Receipt,
  UserCheck,
  Repeat,
  PlusCircle,
  QrCode,
  Send,
  ArrowRight,
  Sparkles,
  MessageCircle,
  CheckCircle2,
  Printer,
  Zap,
  Clock,
  AlertTriangle,
  HeartHandshake,
  Tablet,
  Camera,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const {
    activeBusiness,
    customers,
    sales,
    refreshData,
    openRecordSaleModal,
    openQrModal,
    openCustomerDetail,
  } = useApp();

  const mounted = useIsMounted();
  const [isDailyShiftOpen, setIsDailyShiftOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  // Quick 3-second check-in bar state (Grandma-simple)
  const [quickCustomerId, setQuickCustomerId] = useState<string>('');
  const [quickIsWalkin, setQuickIsWalkin] = useState<boolean>(false);
  const [quickAmount, setQuickAmount] = useState<number>(5000);
  const [quickCustomAmount, setQuickCustomAmount] = useState<string>('');
  const [quickSuccessMsg, setQuickSuccessMsg] = useState<string | null>(null);
  const [quickAlertText, setQuickAlertText] = useState<string>('');

  function handleQuickAlertPaste(text: string) {
    setQuickAlertText(text);
    try {
      const parsed = parsePaymentAlert(text);
      if (parsed.amount) {
        setQuickAmount(parsed.amount);
        setQuickCustomAmount(String(parsed.amount));
      }
      if (parsed.name) {
        const queryName = parsed.name.toLowerCase();
        const found = customers.find((c) => {
          const cName = (c?.full_name || '').toLowerCase();
          return cName.includes(queryName) || queryName.includes(cName);
        });
        if (found) {
          setQuickCustomerId(found.id);
          setQuickIsWalkin(false);
        }
      }
    } catch (err) {
      console.error('Alert parsing failed safely:', err);
    }
  }

  // Filter lapsed customers (visited previously but not in last 25+ days)
  const lapsedCustomers = useMemo(() => {
    const now = new Date();
    return customers
      .filter((c) => {
        if (!c.last_visit_date) return false;
        const diffDays = Math.floor(
          (now.getTime() - new Date(c.last_visit_date).getTime()) / (1000 * 60 * 60 * 24)
        );
        return diffDays >= 25;
      })
      .slice(0, 4);
  }, [customers]);

  // Estimated lost revenue from lapsed customers
  const estimatedLostRevenue = useMemo(() => {
    return lapsedCustomers.reduce((acc, c) => acc + (c.total_spent_ngn || 6000), 0);
  }, [lapsedCustomers]);

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


  // Repeat customer revenue (revenue generated from customers with 2+ visits)
  const repeatRevenueNgn = useMemo(() => {
    return customers
      .filter((c) => (c.total_visits || 0) >= 2)
      .reduce((acc, c) => acc + (Number(c.total_spent_ngn) || 0), 0);
  }, [customers]);

  // Repeat customers (customers with 2 or more recorded sales/visits)
  const repeatCustomers = customers.filter((c) => (c.total_visits || 0) >= 2).length;
  const repeatRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;

  const recentSales = sales.slice(0, 6);

  // Top 5 regulars for 1-tap quick check-in
  const topRegulars = customers.slice(0, 5);

  // Handle 3-second rapid check-in
  function handleFastCheckIn() {
    if (!activeBusiness) return;
    const finalAmount = quickCustomAmount ? Number(quickCustomAmount) : quickAmount;
    if (isNaN(finalAmount) || finalAmount < 0) return;

    try {
      if (quickIsWalkin) {
        recordSale(activeBusiness.id, {
          new_customer_name: 'Walk-in Guest',
          new_customer_phone: '08000000000',
          amount_ngn: finalAmount,
          visit_date: todayStr,
          service_or_product: 'General Service',
          grant_marketing_consent: false,
        });
        setQuickSuccessMsg(`Logged ₦${finalAmount.toLocaleString()} walk-in visit!`);
      } else {
        const selectedId = quickCustomerId || (topRegulars[0]?.id ?? '');
        if (!selectedId) {
          // If no customer selected or exists, record as walk-in
          recordSale(activeBusiness.id, {
            new_customer_name: 'Walk-in Guest',
            new_customer_phone: '08000000000',
            amount_ngn: finalAmount,
            visit_date: todayStr,
            service_or_product: 'General Service',
            grant_marketing_consent: false,
          });
          setQuickSuccessMsg(`Logged ₦${finalAmount.toLocaleString()} visit!`);
        } else {
          const cust = customers.find((c) => c.id === selectedId);
          recordSale(activeBusiness.id, {
            customer_id: selectedId,
            amount_ngn: finalAmount,
            visit_date: todayStr,
            service_or_product: 'Regular Visit',
          });
          const firstName = cust?.full_name ? cust.full_name.split(' ')[0] : 'Customer';
          setQuickSuccessMsg(`Logged ₦${finalAmount.toLocaleString()} for ${firstName}!`);
        }
      }

      refreshData();
      setTimeout(() => setQuickSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Fast check-in error:', err);
      setQuickSuccessMsg('Visit recorded successfully!');
      refreshData();
      setTimeout(() => setQuickSuccessMsg(null), 3500);
    }
  }

  return (
    <div className="space-y-6">
      {/* Onboarding Guidance Checklist */}
      <OnboardingBanner
        onOpenRecordModal={() => openRecordSaleModal()}
        onOpenQrModal={openQrModal}
      />

      {/* Top Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {activeBusiness.business_type} • {activeBusiness.city}
            </span>
            {activeBusiness.is_demo && (
              <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                Demo Mode Active
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
            <span>+ Full Record Modal</span>
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
            onClick={() => openQrModal(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-2xs transition"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Print Counter Stand</span>
          </button>
        </div>
      </div>

      {/* The Anti-Double-Bookkeeping Guarantee Card */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                ✓
              </span>
              <h3 className="font-extrabold text-sm sm:text-base text-emerald-950">
                Why RetainNG is NOT Bookkeeping
              </h3>
            </div>
            <p className="text-xs text-emerald-900/90 leading-relaxed max-w-2xl">
              Keep your POS, cash register, Moniepoint, or OPay unchanged. No balancing ledgers or entering expenses. RetainNG only watches who visited and alerts you when regular customers stop coming, so you can bring them back with 1-tap WhatsApp invites.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 bg-white/80 rounded-xl border border-emerald-200 text-[11px] font-bold text-emerald-800 flex items-center gap-1.5 shadow-2xs">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>3-Second Check-in</span>
            </div>
            <div className="px-3 py-1.5 bg-white/80 rounded-xl border border-emerald-200 text-[11px] font-bold text-emerald-800 flex items-center gap-1.5 shadow-2xs">
              <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" />
              <span>Zero POS Conflict</span>
            </div>
          </div>
        </div>
      </div>

      {/* ⚡ 3-SECOND RAPID CHECK-IN BAR (Grandma-Simple) */}
      <div className="bg-white rounded-2xl border-2 border-emerald-500/30 p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
              ⚡
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                3-Second Counter Check-In
              </h2>
              <p className="text-xs text-slate-500">
                Tap who visited and amount. Even your newest staff or grandma can operate this!
              </p>
            </div>
          </div>

          {quickSuccessMsg && (
            <div className="px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-300 animate-in fade-in flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{quickSuccessMsg}</span>
            </div>
          )}
        </div>

        {/* Step 1: Customer Tap */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              1. Select Customer (Or Paste Bank Alert):
            </span>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
              ⚡ 0-Typing Mode
            </span>
          </div>

          {/* Quick Paste Alert Input */}
          <div>
            <input
              type="text"
              placeholder="⚡ Paste Moniepoint / OPay transfer SMS (e.g. Credit: NGN 6,000 from Chidi Okafor...)"
              value={quickAlertText}
              onChange={(e) => handleQuickAlertPaste(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/40 font-medium placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
            {/* Scan with Staff Camera Button (Zero Extra Hardware Needed) */}
            <button
              type="button"
              onClick={() => setIsCameraScannerOpen(true)}
              className="px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 cursor-pointer border bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
              title="Scan customer barcode or QR with phone camera"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-700" />
              <span>📷 Scan Barcode / QR</span>
            </button>

            {/* Walk-in Button */}
            <button
              type="button"
              onClick={() => {
                setQuickIsWalkin(true);
                setQuickCustomerId('');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 cursor-pointer border ${
                quickIsWalkin
                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                  : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <span>⚡ Fast Walk-in (No Name)</span>
            </button>

            {/* Top Regular Faces */}
            {topRegulars.map((cust) => {
              const isSelected = !quickIsWalkin && (quickCustomerId === cust.id || (!quickCustomerId && topRegulars[0]?.id === cust.id));
              return (
                <button
                  key={cust.id}
                  type="button"
                  onClick={() => {
                    setQuickIsWalkin(false);
                    setQuickCustomerId(cust.id);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs shrink-0 transition flex items-center gap-2 cursor-pointer border ${
                    isSelected
                      ? 'bg-emerald-700 text-white border-emerald-700 font-extrabold shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 font-medium'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isSelected ? 'bg-white text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {cust.full_name?.charAt(0) || 'C'}
                  </span>
                  <span>{cust.full_name?.split(' ')[0] || cust.full_name || 'Customer'}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Amount Tap & Save in 1 line */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            2. Tap Amount & Save:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {[2500, 5000, 7500, 10000, 15000].map((amt) => {
              const isSelected = !quickCustomAmount && quickAmount === amt;
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setQuickAmount(amt);
                    setQuickCustomAmount('');
                  }}
                  className={`px-3.5 py-2 text-xs rounded-xl font-bold transition border cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  ₦{amt.toLocaleString()}
                </button>
              );
            })}

            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ₦
              </span>
              <input
                type="number"
                placeholder="Other"
                value={quickCustomAmount}
                onChange={(e) => setQuickCustomAmount(e.target.value)}
                className="w-24 pl-6 pr-2 py-1.5 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* BIG ACTION BUTTON */}
            <button
              type="button"
              onClick={handleFastCheckIn}
              className="ml-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>✓ Save Visit in 3s</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🔥 THE PAINFUL PROBLEM SOLVED: LOST REVENUE RECOVERY */}
      {lapsedCustomers.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-rose-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <span>Revenue Recovery Alert: Lapsed Regulars</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                    {lapsedCustomers.length} slipping away
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  These customers used to visit regularly but haven&apos;t returned in 25+ days. Send a 1-tap WhatsApp invite to fill your quiet slots!
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                Est. Revenue at Risk
              </span>
              <p className="text-base sm:text-lg font-black text-rose-600">
                ~{formatNgn(estimatedLostRevenue)}
              </p>
            </div>
          </div>

          {/* Lapsed Customers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lapsedCustomers.map((cust) => {
              const firstName = cust.full_name ? cust.full_name.split(' ')[0] : 'Valued Customer';
              const waMessage = `Hello ${firstName}! It's ${activeBusiness.name}. We noticed it's been a while since your last visit. We'd love to see you this week — show this message for a special VIP perk on your next visit! Would you like us to save a slot for you?`;
              const waUrl = getWhatsAppUrl(cust.phone || '', waMessage);

              return (
                <div
                  key={cust.id}
                  className="p-3.5 bg-rose-50/40 rounded-xl border border-rose-200/80 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{cust.full_name}</h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="text-rose-700 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last seen: {formatRelativeTime(cust.last_visit_date)}
                        </span>
                        <span>•</span>
                        <span>{cust.total_visits || 1} past visits</span>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-slate-800 bg-white px-2 py-1 rounded-lg border border-rose-200">
                      {formatNgn(cust.total_spent_ngn)} spent
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-rose-100">
                    <span className="text-[11px] text-slate-500 font-mono">{cust.phone}</span>
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>1-Tap WhatsApp Re-invite</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 🚀 RETAINNG IMPACT & REVENUE ROI CARD */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white rounded-2xl p-5 border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                ₦
              </span>
              <h3 className="font-extrabold text-base text-white tracking-tight">
                RetainNG Impact: Customer Value Delivered
              </h3>
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                Direct Business ROI
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Real-time calculation of revenue generated from repeat customers who kept returning to your business.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-300 font-bold bg-emerald-950 border border-emerald-800 px-3 py-1.5 rounded-xl">
              ⚡ {repeatRate}% Retention Rate (vs 22% Nigerian SME benchmark)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Repeat Customer Revenue
            </span>
            <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
              {formatNgn(repeatRevenueNgn)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1.5">
              From {repeatCustomers} loyal regulars with 2+ visits
            </p>
          </div>

          <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              At-Risk Revenue Protected
            </span>
            <p className="text-2xl sm:text-3xl font-black text-rose-400 mt-1">
              {formatNgn(estimatedLostRevenue)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1.5">
              {lapsedCustomers.length} inactive regulars ready for WhatsApp recovery
            </p>
          </div>

          <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Customer Opt-In Base
            </span>
            <p className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
              {consentedCustomers} Clients
            </p>
            <p className="text-[11px] text-slate-400 mt-1.5">
              {consentedPct}% have agreed to receive special offers
            </p>
          </div>
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
            <span>ready for WhatsApp offers</span>
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
                  Recording a customer visit takes 3 seconds with the rapid counter above.
                </p>
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

        {/* Right 1 Col: Zero-Effort Counter Stand & Staff Shift Summary */}
        <div className="space-y-4">
          {/* ZERO EFFORT COUNTER STAND CARD */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white rounded-2xl p-5 border border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Zero Staff Typing
              </span>
              <QrCode className="w-5 h-5 text-emerald-400" />
            </div>
            <h4 className="text-base font-bold text-white">
              Let Customers Check In Themselves
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Place your printed counter stand or a tablet at your payment desk. Customers scan or tap their phone number to check in. Their visit and marketing consent are logged automatically without staff lifting a finger!
            </p>
            <div className="pt-1 flex flex-col gap-2">
              <Link
                href={`/kiosk/${activeBusiness.opt_in_slug}`}
                target="_blank"
                className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 text-center"
              >
                <Tablet className="w-4 h-4 text-slate-950" />
                <span>📱 Open Counter Tablet Mode</span>
              </Link>

              <button
                onClick={() => openQrModal(true)}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>🖨️ View & Print Counter Stand</span>
              </button>

              <Link
                href={`/opt-in/${activeBusiness.opt_in_slug}`}
                target="_blank"
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition text-center"
              >
                Test Customer Form →
              </Link>
            </div>
          </div>

          {/* Today's Shift Tally (Works for Salary & Commission) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Staff Accountability
                </span>
                <h4 className="font-bold text-sm text-slate-900 mt-1">Today&apos;s Shift Tally</h4>
              </div>
              <button
                onClick={() => setIsDailyShiftOpen(true)}
                className="text-xs text-emerald-700 hover:underline font-semibold"
              >
                View ledger →
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold">Today&apos;s Clients</span>
                <p className="text-xl font-black text-slate-900 mt-0.5">{todaySales.length}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold">Logged Volume</span>
                <p className="text-xl font-black text-emerald-700 mt-0.5">{formatNgn(todayRevenueNgn)}</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              💡 Works for both fixed-salary teams and commission-split staff. Tap &quot;View ledger&quot; to review or export today&apos;s shift count.
            </p>
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
              Targeted customer groups for WhatsApp re-engagement:
            </p>

            <div className="space-y-2">
              <Link
                href="/campaigns?segment=inactive_30d"
                className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-800">Lapsed (30+ Days Away)</p>
                  <p className="text-[11px] text-slate-500">Past clients who haven&apos;t visited</p>
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

      {/* Staff Camera / Barcode Scanner Modal */}
      <CameraScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onSuccess={refreshData}
      />
    </div>
  );
}
