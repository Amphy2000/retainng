'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { getBusinessBySlug, getCustomers, getSales, recordSale } from '@/lib/storage';
import { Business, Customer, SaleOrVisit } from '@/types';
import { QrCodeModal } from '@/components/QrCodeModal';
import { formatNgn, formatRelativeTime } from '@/lib/utils';
import {
  Sparkles,
  CheckCircle2,
  Phone,
  User,
  Store,
  Printer,
  QrCode,
  Zap,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldCheck,
  Bot,
  Plus,
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

const BIZ_SERVICES: Record<string, string[]> = {
  barber: ['Haircut & Beard', 'Fade Cut', 'VIP Grooming', 'Home Service'],
  salon: ['Braids & Weave', 'Wig Install', 'Wash & Blowdry', 'Nails & Pedicure'],
  laundry: ['Dry Cleaning', 'Wash & Fold', 'Native Attire', 'Bedding / Duvet'],
  car_wash: ['Exterior Wash', 'Interior Steam', 'Engine Polish', 'Full VIP Detail'],
  pharmacy: [
    '💊 Monthly Refill (BP, Diabetes, Routine)',
    '🌡️ Acute Care (Malaria, Antibiotics, Pain)',
    '👶 Family & OTC (Vitamins, Baby, First Aid)',
    '🛵 Home Delivery Order',
  ],
  clinic: ['Doctor Consult', 'Routine Checkup', 'Lab Test', 'Follow-up Visit'],
  other: ['Standard Service', 'Product Purchase', 'VIP Package', 'Consultation'],
};

function PortalInner() {
  const params = useParams();
  const slug = params?.slug as string;

  const [business, setBusiness] = useState<Business | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<SaleOrVisit[]>([]);
  const [loading, setLoading] = useState(true);

  // Check-in input states
  const [custInput, setCustInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [isNewCust, setIsNewCust] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // QR Modal
  const [qrOpen, setQrOpen] = useState(false);
  const [printMode, setPrintMode] = useState(false);

  function reloadData(bizId: string) {
    setCustomers(getCustomers(bizId));
    setSales(getSales(bizId));
  }

  useEffect(() => {
    if (!slug) return;
    const timer = setTimeout(() => {
      const biz = getBusinessBySlug(slug);
      if (biz) {
        setBusiness(biz);
        reloadData(biz.id);
      }
      setLoading(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [slug]);

  // Estimated stats
  const stats = useMemo(() => {
    const totalCusts = customers.length;
    const now = new Date();
    const activeCusts = customers.filter(c => {
      if (!c.last_visit_date) return false;
      const diff = Math.floor((now.getTime() - new Date(c.last_visit_date).getTime()) / 86400000);
      return diff <= 30;
    }).length;

    const recoveredCount = customers.filter(c => (c.total_visits || 0) >= 2).length;
    const avgTicket = business?.business_type === 'pharmacy' ? 12000 : business?.business_type === 'barber' ? 6000 : 8000;
    const estimatedValue = recoveredCount * avgTicket;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayVisits = sales.filter(s => s.visit_date === todayStr);

    return { totalCusts, activeCusts, recoveredCount, estimatedValue, todayVisitsCount: todayVisits.length };
  }, [customers, sales, business]);

  const serviceChips = BIZ_SERVICES[business?.business_type || 'other'] || BIZ_SERVICES.other;
  const recentVisits = sales.slice(0, 5);

  function handleInstantPatientCheckin(patient: Customer, defaultService?: string) {
    if (!business) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const service = defaultService || patient.tags?.[0] || 'Regular Visit';
    try {
      recordSale(business.id, {
        customer_id: patient.id,
        amount_ngn: 0,
        visit_date: todayStr,
        service_or_product: service,
      });
      setSuccessToast(`✓ ${patient.full_name} checked in! (${service})`);
      reloadData(business.id);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error(err);
    }
  }

  function handleQuickCheckin() {
    if (!business) return;
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      if (isNewCust) {
        if (!custInput.trim() || !phoneInput.trim()) {
          alert('Please enter both name and phone number for the new customer');
          return;
        }
        recordSale(business.id, {
          new_customer_name: custInput.trim(),
          new_customer_phone: phoneInput.trim(),
          amount_ngn: 0, // No price required!
          visit_date: todayStr,
          service_or_product: selectedService || 'Regular Visit',
          grant_marketing_consent: true,
        });
        setSuccessToast(`✓ New customer ${custInput.trim()} checked in!`);
      } else {
        const found = customers.find(c => c.id === custInput || c.full_name?.toLowerCase() === custInput.toLowerCase());
        if (found) {
          recordSale(business.id, {
            customer_id: found.id,
            amount_ngn: 0,
            visit_date: todayStr,
            service_or_product: selectedService || 'Regular Visit',
          });
          setSuccessToast(`✓ ${found.full_name.split(' ')[0]} checked in!`);
        } else {
          // Walk-in checkin
          recordSale(business.id, {
            new_customer_name: custInput.trim() || 'Walk-in Guest',
            new_customer_phone: phoneInput.trim() || '08000000000',
            amount_ngn: 0,
            visit_date: todayStr,
            service_or_product: selectedService || 'Walk-in Visit',
            grant_marketing_consent: false,
          });
          setSuccessToast(`✓ Visit recorded!`);
        }
      }

      reloadData(business.id);
      setCustInput('');
      setPhoneInput('');
      setSelectedService('');
      setIsNewCust(false);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Could not record visit');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-slate-400 text-sm">Loading Store Portal...</div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center max-w-sm">
          <Store className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h2 className="text-base font-bold text-slate-800">Business Not Found</h2>
          <p className="text-xs text-slate-500 mt-1">Please verify your store portal link.</p>
        </div>
      </div>
    );
  }

  const icon = BIZ_ICONS[business.business_type] || '🏪';

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 pb-12">
      {/* ━━━ OWNER TOP BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header className="bg-slate-950 text-white border-b border-slate-800 px-4 py-3.5 sticky top-0 z-20 shadow-md">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{icon}</span>
            <div>
              <div className="font-extrabold text-sm text-white tracking-tight leading-tight">{business.name}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                  RetainNG AI Autopilot
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              Connected
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-5 space-y-4">

        {/* Success Alert */}
        {successToast && (
          <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg flex items-center gap-2 text-xs font-black animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* ━━━ GRANDMA-SIMPLE CHECK-IN CARD ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 leading-none">Quick Customer Check-in</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Takes 2 seconds • Zero price/POS entry needed</p>
              </div>
            </div>

            <button
              onClick={() => setIsNewCust(!isNewCust)}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition"
            >
              {isNewCust ? 'Select Regular' : '+ New Customer'}
            </button>
          </div>

          {!isNewCust ? (
            <div className="space-y-3">
              {/* ⚡ 1-Tap Instant Check-In Buttons */}
              {customers.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>1-Tap Instant Check-in (0.5s)</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Click name to check in</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {customers.slice(0, 4).map((c) => {
                      const tag = c.tags?.[0] || 'Regular Visit';
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleInstantPatientCheckin(c)}
                          className="p-2.5 rounded-2xl bg-slate-50 hover:bg-emerald-50 active:bg-emerald-100 border border-slate-200 hover:border-emerald-400 text-left transition group cursor-pointer shadow-2xs"
                        >
                          <div className="text-xs font-black text-slate-900 group-hover:text-emerald-900 truncate">
                            {c.full_name}
                          </div>
                          <div className="text-[10px] text-slate-500 group-hover:text-emerald-700 truncate mt-0.5 font-medium">
                            {tag}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Or Look Up Another Customer
                </label>
                <select
                  value={custInput}
                  onChange={(e) => setCustInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-2xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Choose Customer or Walk-in --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in">
              <div className="text-xs font-bold text-slate-800">Add New Customer (Saved Forever)</div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Customer Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Babajide Adeleke"
                  value={custInput}
                  onChange={(e) => setCustInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">WhatsApp Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 0802 345 6789"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Quick Service Tags (Optional) */}
          <div>
            <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1.5">
              Service / Reason (Optional)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {serviceChips.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedService(selectedService === s ? '' : s)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition cursor-pointer ${
                    selectedService === s
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Big Green Check-in CTA */}
          <button
            onClick={handleQuickCheckin}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Check In Customer</span>
          </button>
        </div>

        {/* ━━━ COUNTER STAND & QR BUTTONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-5 border border-slate-800 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-400" />
              <h3 className="font-black text-sm text-white">Your Counter Stand &amp; Barcode</h3>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">
              1-Tap WhatsApp
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Put this stand on your counter. When customers scan it with their phone camera, their WhatsApp opens with a 1-tap check-in message. You never have to type anything!
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => { setPrintMode(true); setQrOpen(true); }}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print Counter Card</span>
            </button>
            <button
              onClick={() => { setPrintMode(false); setQrOpen(true); }}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
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
              <div className="text-xl sm:text-2xl font-black text-sky-700">0 hrs</div>
              <div className="text-[11px] font-bold text-sky-900 mt-0.5">Your Marketing Time</div>
              <div className="text-[10px] text-sky-600">100% agency handled</div>
            </div>
          </div>
        </div>

        {/* ━━━ RECENT CHECK-INS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900">Recent Customer Visits</h3>
            <span className="text-[11px] text-slate-500 font-semibold">{recentVisits.length} recorded</span>
          </div>

          {recentVisits.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              No visits recorded yet today. Check in your first customer above!
            </div>
          ) : (
            <div className="space-y-2">
              {recentVisits.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                      {v.customer_name?.charAt(0) || 'C'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{v.customer_name}</div>
                      <div className="text-[10px] text-slate-500">{v.service_or_product || 'Regular Visit'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {formatRelativeTime(v.created_at)}
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
