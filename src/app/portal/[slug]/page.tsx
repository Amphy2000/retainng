'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getBusinessBySlug, getCustomers, getSales, syncFleetFromCloud } from '@/lib/storage';
import { Business, Customer, SaleOrVisit } from '@/types';
import { QrCodeModal } from '@/components/QrCodeModal';
import { RetainNgLogo } from '@/components/RetainNgLogo';
import { formatNgn, formatRelativeTime } from '@/lib/utils';
import {
  Printer,
  QrCode,
  Bot,
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

function PortalInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;

  const isPrintParam = searchParams.get('print') === '1' || searchParams.get('print') === 'true';
  const [business, setBusiness] = useState<Business | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<SaleOrVisit[]>([]);
  const [loading, setLoading] = useState(true);

  // QR Modal
  const [qrOpen, setQrOpen] = useState(isPrintParam);
  const [printMode, setPrintMode] = useState(isPrintParam);

  function reloadData(bizId: string) {
    setCustomers(getCustomers(bizId));
    setSales(getSales(bizId));
  }

  // Exact timestamp formatter (e.g. "Today • 12:02 PM" or "Nov 24 • 12:02 PM")
  function formatExactDateTime(isoString?: string): string {
    if (!isoString) return 'Just now';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Recently';
    const now = new Date();
    const isToday = now.toDateString() === d.toDateString();
    const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (isToday) {
      return `Today • ${timeStr}`;
    }
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (yesterday.toDateString() === d.toDateString()) {
      return `Yesterday • ${timeStr}`;
    }
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${dateStr} • ${timeStr}`;
  }

  // Handle URL query for direct print mode (?print=1 or ?print=true)
  useEffect(() => {
    const shouldPrint = searchParams.get('print') === '1' || searchParams.get('print') === 'true';
    if (shouldPrint) {
      setPrintMode(true);
      setQrOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!slug) return;
    // Initial fetch from local storage
    const biz = getBusinessBySlug(slug);
    if (biz) {
      setBusiness(biz);
      reloadData(biz.id);
      setLoading(false);
    }

    // Authoritative fetch from Supabase Cloud to resolve newly onboarded partners immediately
    syncFleetFromCloud().then(() => {
      const freshBiz = getBusinessBySlug(slug);
      if (freshBiz) {
        setBusiness(freshBiz);
        reloadData(freshBiz.id);
      }
      setLoading(false);
    });

    const handleSync = () => {
      const freshBiz = getBusinessBySlug(slug);
      if (freshBiz) {
        setBusiness(freshBiz);
        reloadData(freshBiz.id);
      }
      setLoading(false);
    };
    window.addEventListener('retainng_fleet_synced', handleSync);
    return () => window.removeEventListener('retainng_fleet_synced', handleSync);
  }, [slug]);

  // Estimated stats
  const stats = useMemo(() => {
    const totalCusts = customers.length;
    const now = new Date();
    const todayCusts = customers.filter(c => {
      const cDate = c.created_at || c.consent_date;
      return cDate && new Date(cDate).toDateString() === now.toDateString();
    }).length;

    const activeCusts = customers.filter(c => {
      if (!c.last_visit_date) return false;
      const diff = Math.floor((now.getTime() - new Date(c.last_visit_date).getTime()) / 86400000);
      return diff <= 30;
    }).length;

    const recoveredCount = customers.filter(c => (c.total_visits || 0) >= 2).length;
    const avgTicket = business?.business_type === 'pharmacy' ? 12000 : business?.business_type === 'barber' ? 6000 : 8000;
    const estimatedValue = recoveredCount * avgTicket;

    return { totalCusts, todayCusts, activeCusts, recoveredCount, estimatedValue };
  }, [customers, business]);

  const recentVisits = useMemo(() => {
    const list: Array<{
      id: string;
      customer_name: string;
      service_or_product: string;
      created_at: string;
      badgeText: string;
      badgeColor: 'emerald' | 'blue';
    }> = [];

    sales.forEach((s) => {
      list.push({
        id: s.id,
        customer_name: s.customer_name || 'Customer',
        service_or_product: s.service_or_product || (business?.business_type === 'pharmacy' ? 'Prescription Refill' : 'Service Check-in'),
        created_at: s.created_at || s.visit_date,
        badgeText: s.amount_ngn > 0 ? 'Fulfilled' : 'Check-in',
        badgeColor: 'emerald',
      });
    });

    customers.forEach((c) => {
      const hasSale = sales.some(
        (s) =>
          s.customer_id === c.id ||
          (s.customer_phone && c.phone && s.customer_phone.replace(/[\s+-]/g, '') === c.phone.replace(/[\s+-]/g, ''))
      );
      if (!hasSale) {
        list.push({
          id: `onboard_${c.id}`,
          customer_name: c.full_name || 'Customer',
          service_or_product: c.tags?.[0] ? `${c.tags[0]} Onboarding` : 'Bag Slip QR Registration',
          created_at: c.created_at || c.consent_date || new Date().toISOString(),
          badgeText: 'New Client',
          badgeColor: 'blue',
        });
      }
    });

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);
  }, [sales, customers, business]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-xs">
        Loading RetainNG Portal...
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl p-6 text-center text-white max-w-sm space-y-3">
          <p className="text-sm font-bold">Business not found</p>
          <p className="text-xs text-slate-400">Could not find a store with slug &quot;{slug}&quot;</p>
        </div>
      </div>
    );
  }

  const icon = BIZ_ICONS[business.business_type] || '🏪';

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-12">
      {/* ━━━ TOP CLIENT BRAND HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header className="bg-slate-950 text-white border-b border-slate-800 px-4 py-3 sticky top-0 z-20 shadow-md">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0">{icon}</span>
            <div className="min-w-0">
              <h1 className="font-black text-sm text-white truncate leading-tight">
                {business.name}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                  RetainNG AI Autopilot
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 rounded-lg bg-slate-900 border border-emerald-500/30 overflow-hidden flex items-center justify-center">
              <RetainNgLogo className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              Connected
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-5 space-y-4">
        {/* ━━━ RETENTION CONCIERGE & BAG SLIPS HUB ━━━━━━━━━━━━━━━━━━━ */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <QrCode className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-black text-sm text-white">Prescription Bag Slips &amp; QR Concierge</h3>
                <p className="text-[11px] text-slate-400">Zero data entry • 100% automated customer refill retention</p>
              </div>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
              AI Autopilot Active
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Drop these 4-in-1 slips into customer bags. When customers scan, their phone links to your store WhatsApp. Our AI concierge automatically reminds them before their medication runs out and routes their refill requests straight to your dispensary.
          </p>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={() => { setPrintMode(true); setQrOpen(true); }}
              className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>Print 4-in-1 Bag Slips</span>
            </button>
            <button
              onClick={() => { setPrintMode(false); setQrOpen(true); }}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>Show QR on Screen</span>
            </button>
          </div>
        </div>

        {/* ━━━ OWNER'S MONTHLY REPORT CARD ("WHAT RETRO DOING FOR YOU") ━━ */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-600" />
              <h3 className="font-black text-sm text-slate-900">This Month&apos;s AI Agency Performance</h3>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Automated
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3">
              <div className="text-xl sm:text-2xl font-black text-emerald-700">{stats.recoveredCount}</div>
              <div className="text-[11px] font-bold text-emerald-900 mt-0.5">Repeat Customers</div>
              <div className="text-[10px] text-emerald-600">Kept coming back</div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3">
              <div className="text-xl sm:text-2xl font-black text-amber-700">{formatNgn(stats.estimatedValue)}</div>
              <div className="text-[11px] font-bold text-amber-900 mt-0.5">Estimated Revenue</div>
              <div className="text-[10px] text-amber-600">Protected by AI marketing</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
              <div className="text-xl sm:text-2xl font-black text-slate-800">{stats.totalCusts}</div>
              <div className="text-[11px] font-bold text-slate-700 mt-0.5">Registered Regulars</div>
              <div className="text-[10px] text-slate-500">In your store VIP club</div>
            </div>

            <div className="bg-sky-50 border border-sky-100 rounded-2xl p-3">
              <div className="text-xl sm:text-2xl font-black text-sky-700">
                {stats.todayCusts > 0 ? `+${stats.todayCusts}` : stats.totalCusts}
              </div>
              <div className="text-[11px] font-bold text-sky-900 mt-0.5">
                {stats.todayCusts > 0 ? 'Joined Today' : 'Total Client Base'}
              </div>
              <div className="text-[10px] text-sky-600">
                {stats.todayCusts > 0 ? 'via Bag Slip QR' : '100% Bag Slip QR'}
              </div>
            </div>
          </div>
        </div>

        {/* ━━━ RECENT REFILL ALERTS & LINKED PATIENTS ━━━━━━━━━━━━━━━━━━━ */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900">Recent Customer Activity</h3>
            <span className="text-[11px] text-slate-500 font-semibold">{recentVisits.length} recorded</span>
          </div>

          {recentVisits.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              No recent customer activity. New scans via bag slips will automatically appear here!
            </div>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {recentVisits.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100/60 transition">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {v.customer_name?.charAt(0) || 'C'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{v.customer_name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{v.service_or_product || 'Regular Refill'}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block ${
                        v.badgeColor === 'blue'
                          ? 'text-blue-700 bg-blue-100 border border-blue-200'
                          : 'text-emerald-700 bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      {v.badgeText}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
                      {formatExactDateTime(v.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* QR Code Modal for Stand */}
      <QrCodeModal
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        initialShowPrintCard={printMode}
        business={business}
      />
    </div>
  );
}

export default function BusinessOwnerPortalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-400">Loading portal...</div>}>
      <PortalInner />
    </Suspense>
  );
}
