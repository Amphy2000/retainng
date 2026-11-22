'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { getBusinessBySlug, getCustomers, recordSale, saveCustomer } from '@/lib/storage';
import { Business, Customer } from '@/types';
import {
  Sparkles,
  CheckCircle2,
  Phone,
  User,
  Delete,
  Store,
  ArrowRight,
} from 'lucide-react';

function KioskContent() {
  const params = useParams();
  const slug = params?.slug as string;

  const [business, setBusiness] = useState<Business | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Keypad & input state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [promptNewName, setPromptNewName] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');

  // Status message
  const [successData, setSuccessData] = useState<{
    customerName: string;
    isNew: boolean;
  } | null>(null);

  useEffect(() => {
    if (!slug) return;
    const timer = setTimeout(() => {
      const biz = getBusinessBySlug(slug);
      if (biz) {
        setBusiness(biz);
        setCustomers(getCustomers(biz.id));
      }
      setLoading(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <p className="text-slate-400 text-sm">Loading Counter Check-in Kiosk...</p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 text-center">
        <Store className="w-12 h-12 text-slate-500 mb-3" />
        <h1 className="text-xl font-bold">Business Not Found</h1>
        <p className="text-sm text-slate-400 mt-1">Please check the shop kiosk link.</p>
      </div>
    );
  }

  function handleKeypadPress(digit: string) {
    if (phoneNumber.length < 11) {
      setPhoneNumber((prev) => prev + digit);
    }
  }

  function handleBackspace() {
    setPhoneNumber((prev) => prev.slice(0, -1));
  }

  function handleClear() {
    setPhoneNumber('');
    setPromptNewName(false);
  }

  function handleCheckInSubmit() {
    if (!business || phoneNumber.length < 10) return;

    // Check if phone matches existing customer
    const cleanPhone = phoneNumber.trim();
    const existing = customers.find(
      (c) =>
        c.phone.replace(/\D/g, '').endsWith(cleanPhone.replace(/\D/g, '').slice(-10))
    );

    const todayStr = new Date().toISOString().split('T')[0];

    if (existing) {
      // Existing customer - instant check in!
      recordSale(business.id, {
        customer_id: existing.id,
        amount_ngn: 5000, // standard nominal visit record
        visit_date: todayStr,
        service_or_product: 'Counter Kiosk Check-In',
      });

      setSuccessData({
        customerName: existing.full_name,
        isNew: false,
      });

      // Reset after 3.5 seconds
      setTimeout(() => {
        setSuccessData(null);
        setPhoneNumber('');
      }, 3500);
    } else {
      // New customer - prompt for name
      setPromptNewName(true);
    }
  }

  function handleSaveNewCustomerAndCheckIn() {
    if (!business || !newCustomerName.trim() || !phoneNumber.trim()) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const newCust = saveCustomer(business.id, {
      full_name: newCustomerName.trim(),
      phone: phoneNumber.trim(),
      consent_status: 'consented',
      consent_source: 'qr_optin',
      consent_notes: 'Self-registered at counter kiosk',
    });

    recordSale(business.id, {
      customer_id: newCust.id,
      amount_ngn: 5000,
      visit_date: todayStr,
      service_or_product: 'Counter Kiosk Check-In',
    });

    setSuccessData({
      customerName: newCust.full_name,
      isNew: true,
    });

    setPromptNewName(false);
    setNewCustomerName('');

    setTimeout(() => {
      setSuccessData(null);
      setPhoneNumber('');
    }, 3500);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-8 selection:bg-emerald-500">
      {/* Top Branding */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 max-w-lg w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 font-black text-xl flex items-center justify-center shadow-lg">
            ₦
          </div>
          <div>
            <h1 className="font-extrabold text-lg sm:text-xl text-white tracking-tight">
              {business.name}
            </h1>
            <p className="text-xs text-slate-400 capitalize">
              {business.business_type} • {business.city}
            </p>
          </div>
        </div>

        <div className="px-3 py-1 bg-emerald-950/80 border border-emerald-800 rounded-full text-emerald-400 text-[11px] font-bold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Self Check-In</span>
        </div>
      </div>

      {/* Main Kiosk Interaction Card */}
      <div className="max-w-md w-full mx-auto my-auto py-6">
        {successData ? (
          /* Joyful Celebration Flash */
          <div className="bg-emerald-900/40 border-2 border-emerald-500/60 rounded-3xl p-8 text-center space-y-4 animate-in zoom-in-95 duration-200 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-white">
              {successData.isNew ? 'Welcome to the Family!' : 'Welcome Back!'}
            </h2>
            <p className="text-emerald-300 font-bold text-lg">
              {successData.customerName}
            </p>
            <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
              Your visit has been recorded with {business.name}. Enjoy your service today!
            </p>
            <div className="pt-2 text-[11px] text-emerald-400/80 font-medium">
              Ready for next customer in a moment...
            </div>
          </div>
        ) : promptNewName ? (
          /* New Customer First Name Form */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl animate-in fade-in">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-black text-white">First Time Visiting?</h2>
              <p className="text-xs text-slate-400">
                Please enter your name so we can welcome you properly!
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Your Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="e.g. Babajide Adeleke"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full pl-9 pr-3 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    readOnly
                    value={phoneNumber}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-300 font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPromptNewName(false)}
                className="flex-1 py-3 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 rounded-xl"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSaveNewCustomerAndCheckIn}
                disabled={!newCustomerName.trim()}
                className="flex-2 py-3 text-xs font-extrabold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-xl shadow-lg transition flex items-center justify-center gap-1.5"
              >
                <span>Complete Check-In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Giant Touch Dial Pad */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="text-center space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Enter Phone Number
              </h2>
              <p className="text-xs text-slate-400">
                Tap your 11-digit phone number to register today&apos;s visit
              </p>
            </div>

            {/* Phone Display Box */}
            <div className="h-14 bg-slate-950 rounded-2xl border-2 border-slate-800 flex items-center justify-center px-4">
              <span className="font-mono text-xl sm:text-2xl tracking-widest font-extrabold text-emerald-400">
                {phoneNumber || <span className="text-slate-600 font-normal text-base">080X XXX XXXX</span>}
              </span>
            </div>

            {/* Big Keypad (0-9) */}
            <div className="grid grid-cols-3 gap-2.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeypadPress(digit)}
                  className="h-14 text-xl font-black rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:bg-emerald-600 text-white border border-slate-700/80 shadow-xs transition cursor-pointer flex items-center justify-center"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={handleClear}
                className="h-14 text-xs font-bold rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 border border-slate-800 transition cursor-pointer flex items-center justify-center"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="h-14 text-xl font-black rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:bg-emerald-600 text-white border border-slate-700/80 shadow-xs transition cursor-pointer flex items-center justify-center"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleBackspace}
                className="h-14 text-xs font-bold rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 border border-slate-800 transition cursor-pointer flex items-center justify-center"
              >
                <Delete className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleCheckInSubmit}
              disabled={phoneNumber.length < 10}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-30 disabled:pointer-events-none text-slate-950 font-black text-base rounded-2xl shadow-xl transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Tap to Check In</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="text-center text-xs text-slate-500 border-t border-slate-800/60 pt-4 max-w-lg w-full mx-auto">
        Powered by RetainNG • No staff action required
      </div>
    </div>
  );
}

export default function KioskPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading...</div>}>
      <KioskContent />
    </Suspense>
  );
}
