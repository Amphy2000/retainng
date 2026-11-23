'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { getBusinesses, getCustomers } from '@/lib/storage';
import { formatNgn, formatRelativeTime, getWhatsAppUrl } from '@/lib/utils';
import {
  Users,
  Search,
  Phone,
  MessageCircle,
  Building2,
  QrCode,
  X,
  Zap,
  Sparkles,
  Scissors,
  Pill,
  Shirt,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

export default function CustomersPage() {
  const { activeBusiness } = useApp();

  const [search, setSearch] = useState('');
  const [selectedBizFilter, setSelectedBizFilter] = useState<string>('all');
  const [syncVersion, setSyncVersion] = useState(0);

  useEffect(() => {
    const handleSync = () => setSyncVersion((v) => v + 1);
    window.addEventListener('retainng_fleet_synced', handleSync);
    return () => window.removeEventListener('retainng_fleet_synced', handleSync);
  }, []);

  // Load all businesses
  const allBusinesses = useMemo(() => getBusinesses(), [syncVersion]);

  // Selected business object
  const selectedBizObj = useMemo(() => {
    if (selectedBizFilter === 'all') return null;
    return allBusinesses.find((b) => b.id === selectedBizFilter) || null;
  }, [allBusinesses, selectedBizFilter]);

  const bizType = selectedBizObj?.business_type;
  const isPharmacy = bizType === 'pharmacy';
  const isBarberSalon = bizType === 'barber' || bizType === 'salon';
  const isLaundry = bizType === 'laundry';

  // Compute customers across selected store or all stores
  const currentPool = useMemo(() => {
    if (selectedBizFilter === 'all') {
      const all: (ReturnType<typeof getCustomers>[0] & { business_name?: string; business_type?: string })[] = [];
      allBusinesses.forEach((b) => {
        getCustomers(b.id).forEach((c) =>
          all.push({ ...c, business_name: b.name, business_type: b.business_type })
        );
      });
      return all;
    }
    return getCustomers(selectedBizFilter).map((c) => ({
      ...c,
      business_name: selectedBizObj?.name || '',
      business_type: selectedBizObj?.business_type,
    }));
  }, [selectedBizFilter, allBusinesses, selectedBizObj]);

  // Filtered list by search
  const filteredCustomers = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return currentPool;
    return currentPool.filter(
      (c) =>
        (c.full_name || '').toLowerCase().includes(query) ||
        (c.phone || '').includes(query) ||
        (c.tags || []).some((t) => (t || '').toLowerCase().includes(query))
    );
  }, [currentPool, search]);

  // Compute breakdown stats dynamically
  const stats = useMemo(() => {
    const total = currentPool.length;

    if (isPharmacy) {
      const countChronic = currentPool.filter((c) =>
        (c.tags || []).some((t) => t?.toLowerCase().includes('chronic'))
      ).length;
      const countAcute = currentPool.filter((c) =>
        (c.tags || []).some((t) => t?.toLowerCase().includes('acute'))
      ).length;
      const countFamily = currentPool.filter((c) =>
        (c.tags || []).some((t) => t?.toLowerCase().includes('family') || t?.toLowerCase().includes('otc'))
      ).length;
      return {
        card1: { title: 'Total Patients', value: total, sub: 'registered at pharmacy' },
        card2: { title: 'Chronic Care', value: countChronic, sub: '25-day reminders active', color: 'text-emerald-600' },
        card3: { title: 'Acute / OTC', value: countAcute, sub: '4-day check-ins', color: 'text-amber-600' },
        card4: { title: 'Family / OTC', value: countFamily, sub: 'monthly wellness nudge', color: 'text-blue-600' },
      };
    }

    if (isBarberSalon) {
      const countRegulars = currentPool.filter((c) => (c.total_visits || 0) >= 2).length;
      const countVIP = currentPool.filter((c) =>
        (c.tags || []).some((t) => t?.toLowerCase().includes('vip')) || (c.total_visits || 0) >= 3
      ).length;
      const countNew = currentPool.filter((c) => (c.total_visits || 0) <= 1).length;
      return {
        card1: { title: 'Total Clients', value: total, sub: 'grooming clients' },
        card2: { title: 'Fortnightly Regulars', value: countRegulars, sub: '14-day grooming cycle', color: 'text-emerald-600' },
        card3: { title: 'Due for Fresh Cut', value: countNew, sub: 'return alerts ready', color: 'text-amber-600' },
        card4: { title: 'VIP Regulars', value: countVIP, sub: 'top repeat spenders', color: 'text-blue-600' },
      };
    }

    if (isLaundry) {
      const countRegulars = currentPool.filter((c) => (c.total_visits || 0) >= 2).length;
      const countCommercial = currentPool.filter((c) =>
        (c.tags || []).some((t) => t?.toLowerCase().includes('commercial') || t?.toLowerCase().includes('vip'))
      ).length;
      const countNew = currentPool.filter((c) => (c.total_visits || 0) <= 1).length;
      return {
        card1: { title: 'Total Clients', value: total, sub: 'laundry customers' },
        card2: { title: 'Weekly Regulars', value: countRegulars, sub: '7-10 day wash cycle', color: 'text-emerald-600' },
        card3: { title: 'Pick-Up Due', value: countNew, sub: 'wash cycle reminder', color: 'text-amber-600' },
        card4: { title: 'VIP / Commercial', value: countCommercial, sub: 'high volume accounts', color: 'text-blue-600' },
      };
    }

    // Default: Universal Fleet View
    const countRegulars = currentPool.filter((c) => (c.total_visits || 0) >= 2).length;
    const countVIP = currentPool.filter((c) =>
      (c.tags || []).some((t) => t?.toLowerCase().includes('vip')) || (c.total_visits || 0) >= 3
    ).length;
    const countNew = currentPool.filter((c) => (c.total_visits || 0) <= 1).length;

    return {
      card1: { title: 'Total Retained Clients', value: total, sub: 'across agency fleet' },
      card2: { title: 'Active Regulars', value: countRegulars, sub: 'recurring repeat buyers', color: 'text-emerald-600' },
      card3: { title: 'Follow-ups Queued', value: countNew, sub: 'AI reminders ready', color: 'text-amber-600' },
      card4: { title: 'VIP Members', value: countVIP, sub: 'highest lifetime value', color: 'text-blue-600' },
    };
  }, [currentPool, isPharmacy, isBarberSalon, isLaundry]);

  // Context-aware titles and banners
  const headerTitle = isPharmacy
    ? 'Patients & Prescription Bag Slips'
    : isBarberSalon
    ? 'Clients & Station Stand Cards'
    : isLaundry
    ? 'Customers & Laundry Bag Slips'
    : 'Clients & Touchpoint Slips';

  const headerSubtitle = isPharmacy
    ? 'Patients appear here automatically as they scan prescription bag slip QR codes — zero manual staff entry.'
    : isBarberSalon
    ? 'Clients appear here automatically as they scan mirror stand cards or receipt QR codes — zero manual staff entry.'
    : isLaundry
    ? 'Customers appear here automatically as they scan laundry bag slips or counter QR codes — zero manual staff entry.'
    : 'Customers appear here automatically as they scan bag slips, station stand cards, or receipt QR codes — zero manual staff entry.';

  const onboardingBanner = isPharmacy
    ? '100% automated onboarding: When a patient scans the QR on their prescription bag, they are registered here and the AI concierge handles all refill reminders. Zero cashier effort.'
    : isBarberSalon
    ? '100% automated onboarding: When a client scans the QR at the grooming mirror, the AI concierge learns their cut cadence and sends timely return invites before they get shaggy.'
    : isLaundry
    ? '100% automated onboarding: When a customer drops their garments and scans the slip, the AI concierge handles pickup alerts and weekly wash cycle reminders.'
    : '100% automated onboarding: When a customer scans the QR code at any partner store, they are automatically registered here and the AI concierge handles all follow-up reminders.';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {headerTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {headerSubtitle}
          </p>
        </div>
      </div>

      {/* How-it-works info strip */}
      <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl text-xs text-emerald-900 flex items-start gap-2.5">
        <QrCode className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <strong>Automatic touchpoint onboarding:</strong> {onboardingBanner}
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-0.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stats.card1.title}</p>
          <p className="text-2xl font-black text-slate-900">{stats.card1.value}</p>
          <p className="text-[10px] text-slate-500">{stats.card1.sub}</p>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-0.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stats.card2.title}</p>
          <p className={`text-2xl font-black ${stats.card2.color}`}>{stats.card2.value}</p>
          <p className="text-[10px] text-slate-500">{stats.card2.sub}</p>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-0.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stats.card3.title}</p>
          <p className={`text-2xl font-black ${stats.card3.color}`}>{stats.card3.value}</p>
          <p className="text-[10px] text-slate-500">{stats.card3.sub}</p>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-0.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stats.card4.title}</p>
          <p className={`text-2xl font-black ${stats.card4.color}`}>{stats.card4.value}</p>
          <p className="text-[10px] text-slate-500">{stats.card4.sub}</p>
        </div>
      </div>

      {/* Store filter + Search */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        {/* Fleet Business Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-800">Filter by Store:</span>
          </div>
          <select
            value={selectedBizFilter}
            onChange={(e) => setSelectedBizFilter(e.target.value)}
            className="text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-64 cursor-pointer"
          >
            <option value="all">🌍 All Stores (Agency Fleet Total)</option>
            {allBusinesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone, or tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No customers found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {search
                ? 'No results for that search. Try a different name or phone number.'
                : 'Customers appear here automatically as they scan the QR code. Print the touchpoint slips or stand cards from the Agency Radar to get started.'}
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <div className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl">
                <Zap className="w-3.5 h-3.5" />
                Fully Automated — Zero manual data entry needed
              </div>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredCustomers.map((cust) => {
              const isCustPharmacy = cust.business_type === 'pharmacy';
              const isCustBarber = cust.business_type === 'barber' || cust.business_type === 'salon';
              const isCustLaundry = cust.business_type === 'laundry';

              const firstName = cust.full_name ? cust.full_name.split(' ')[0] : 'there';
              const whatsAppMessage = isCustPharmacy
                ? `Hello ${firstName}! Your prescription refill reminder from ${cust.business_name || 'your pharmacy'}. Reply here to place your order and we will arrange delivery.`
                : isCustBarber
                ? `Hello ${firstName}! Checking in from ${cust.business_name || 'your barbershop'}. Ready for a fresh cut or styling this week? Reply here to pick your time!`
                : isCustLaundry
                ? `Hello ${firstName}! It's ${cust.business_name || 'your laundry service'}. Let us handle your fresh laundry this week — reply here to arrange pickup!`
                : `Hello ${firstName}! Checking in from ${cust.business_name || 'us'}. We'd love to see you again soon — reply here anytime!`;

              return (
                <div
                  key={cust.id}
                  className="p-4 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  {/* Left: Client Info */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`w-10 h-10 rounded-full font-bold flex items-center justify-center shrink-0 border mt-0.5 ${
                        isCustPharmacy
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          : isCustBarber
                          ? 'bg-blue-100 text-blue-700 border-blue-200'
                          : isCustLaundry
                          ? 'bg-amber-100 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {cust.full_name?.charAt(0)?.toUpperCase() || 'C'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm sm:text-base text-slate-900">
                          {cust.full_name}
                        </span>
                        {cust.business_name && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            @ {cust.business_name}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1 font-mono text-[11px] text-slate-600">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {cust.phone}
                        </span>
                        {(cust.address || cust.notes) && (
                          <span className="text-[11px] text-slate-500">
                            📍 {cust.address || cust.notes}
                          </span>
                        )}
                      </div>

                      {/* Tags */}
                      {cust.tags && cust.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {cust.tags.map((t) => {
                            const isCategory =
                              t?.toLowerCase().includes('chronic') ||
                              t?.toLowerCase().includes('acute') ||
                              t?.toLowerCase().includes('vip') ||
                              t?.toLowerCase().includes('fade');
                            return (
                              <span
                                key={t}
                                className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                  isCategory
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {t}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Stats + Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-bold text-slate-900">
                        {cust.total_visits || 0} visits • {formatNgn(cust.total_spent_ngn)}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Last: {formatRelativeTime(cust.last_visit_date)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {cust.phone && (
                        <a
                          href={getWhatsAppUrl(cust.phone, whatsAppMessage)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Send WhatsApp reminder"
                          className="px-2.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1 transition shadow-sm"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
