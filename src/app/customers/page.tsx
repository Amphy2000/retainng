'use client';

import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';

export default function CustomersPage() {
  const { activeBusiness } = useApp();

  const [search, setSearch] = useState('');
  const [selectedBizFilter, setSelectedBizFilter] = useState<string>('all');

  // Load all businesses
  const allBusinesses = useMemo(() => getBusinesses(), []);

  // Compute customers across selected store or all stores
  const currentPool = useMemo(() => {
    if (selectedBizFilter === 'all') {
      const all: (ReturnType<typeof getCustomers>[0] & { business_name?: string })[] = [];
      allBusinesses.forEach((b) => {
        getCustomers(b.id).forEach((c) => all.push({ ...c, business_name: b.name }));
      });
      return all;
    }
    const b = allBusinesses.find((x) => x.id === selectedBizFilter);
    return getCustomers(selectedBizFilter).map((c) => ({
      ...c,
      business_name: b?.name || '',
    }));
  }, [selectedBizFilter, allBusinesses]);

  // Filtered list
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

  // Categorise by medication type stored in tags
  const countChronic = currentPool.filter((c) =>
    (c.tags || []).some((t) => t?.toLowerCase().includes('chronic'))
  ).length;
  const countAcute = currentPool.filter((c) =>
    (c.tags || []).some((t) => t?.toLowerCase().includes('acute'))
  ).length;
  const countFamily = currentPool.filter((c) =>
    (c.tags || []).some((t) => t?.toLowerCase().includes('family'))
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Clients & Bag Slips
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Patients appear here automatically as they scan prescription bag slip QR codes — zero manual entry.
          </p>
        </div>
      </div>

      {/* How-it-works info strip */}
      <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl text-xs text-emerald-900 flex items-start gap-2.5">
        <QrCode className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <strong>100% automated onboarding:</strong> When a patient scans the QR on their prescription bag, they are automatically registered here and the AI concierge handles all follow-up reminders. No staff action needed.
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-0.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Patients</p>
          <p className="text-2xl font-black text-slate-900">{currentPool.length}</p>
          <p className="text-[10px] text-slate-500">across fleet</p>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-0.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chronic Care</p>
          <p className="text-2xl font-black text-emerald-600">{countChronic}</p>
          <p className="text-[10px] text-slate-500">25-day reminders active</p>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-0.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Acute / OTC</p>
          <p className="text-2xl font-black text-amber-600">{countAcute}</p>
          <p className="text-[10px] text-slate-500">4-day check-ins</p>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-0.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Family / Vitamins</p>
          <p className="text-2xl font-black text-blue-600">{countFamily}</p>
          <p className="text-[10px] text-slate-500">monthly wellness nudge</p>
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
            <h3 className="text-base font-bold text-slate-800">No patients yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {search
                ? 'No results for that search. Try a different name or phone number.'
                : 'Patients appear here automatically as they scan the prescription bag slip QR code. Print the 4-in-1 bag slips from the Agency Radar page to get started.'}
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <div className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl">
                <Zap className="w-3.5 h-3.5" />
                Fully Automated — Zero manual entry needed
              </div>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredCustomers.map((cust) => (
              <div
                key={cust.id}
                className="p-4 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Left: Patient Info */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 border border-emerald-200 mt-0.5">
                    {cust.full_name?.charAt(0)?.toUpperCase() || 'P'}
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
                        <span className="text-[11px] text-slate-500">📍 {cust.address || cust.notes}</span>
                      )}
                    </div>

                    {/* Medication category tags */}
                    {cust.tags && cust.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {cust.tags.map((t) => {
                          const isCategory =
                            t?.toLowerCase().includes('chronic') ||
                            t?.toLowerCase().includes('acute') ||
                            t?.toLowerCase().includes('family');
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
                    {cust.phone && activeBusiness && (
                      <a
                        href={getWhatsAppUrl(
                          cust.phone,
                          `Hello ${cust.full_name ? cust.full_name.split(' ')[0] : 'there'}! Your prescription refill reminder from ${activeBusiness.name}. Reply here to place your order and we will arrange delivery.`
                        )}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
