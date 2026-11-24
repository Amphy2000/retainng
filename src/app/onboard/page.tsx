'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBusiness } from '@/lib/storage';
import { BusinessType } from '@/types';
import { RetainNgLogo } from '@/components/RetainNgLogo';
import {
  Sparkles,
  Bot,
  ShieldCheck,
  CheckCircle2,
  Printer,
  ArrowRight,
  Building2,
  Phone,
  MapPin,
  Mail,
  Zap,
} from 'lucide-react';

export default function SelfOnboardingPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('pharmacy');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Kaduna');
  const [stateName, setStateName] = useState('Kaduna');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your business or pharmacy name.');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter your WhatsApp phone number.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const now = new Date();
      const trialExpiry = new Date(now);
      trialExpiry.setDate(trialExpiry.getDate() + 14);
      const formattedRenewal = trialExpiry.toISOString().split('T')[0];

      // Clean phone number format
      let formattedPhone = phone.trim().replace(/[\s-]/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+234' + formattedPhone.slice(1);
      } else if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+234' + formattedPhone;
      }

      // Create business via storage (auto-syncs to Supabase)
      const newBiz = createBusiness({
        name: name.trim(),
        business_type: businessType,
        phone: formattedPhone,
        email: email.trim() || undefined,
        city: city.trim() || 'Kaduna',
        state: stateName.trim() || 'Kaduna',
        currency: 'NGN',
        timezone: 'Africa/Lagos',
        whatsapp_routing_mode: 'agency_concierge',
        manager_alert_phone: formattedPhone,
        monthly_retainer_ngn: 25000,
        subscription_status: 'trial',
        subscription_renewal_date: formattedRenewal,
      });

      // Notify owner on WhatsApp if config API is available
      try {
        await fetch('/api/pharmacy-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: newBiz.opt_in_slug,
            pharmacyName: newBiz.name,
            managerPhone: formattedPhone,
            conciergePhone: formattedPhone,
          }),
        });
      } catch (err) {
        console.warn('Pharmacy config alert notice:', err);
      }

      // Redirect directly to merchant portal with free bag slips ready
      router.push(`/portal/${newBiz.opt_in_slug}`);
    } catch (err) {
      console.error('Self-onboarding error:', err);
      setError('An error occurred during onboarding. Please try again or contact support.');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/onboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-emerald-500/30 overflow-hidden flex items-center justify-center shadow-md shadow-emerald-950/50">
              <RetainNgLogo className="w-7 h-7" />
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-white flex items-center gap-1">
                <span>Retain</span>
                <span className="text-emerald-400">NG</span>
              </div>
              <div className="text-[9px] text-emerald-500/80 font-bold uppercase tracking-widest">
                AI Retention Agency
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <a
              href="https://wa.me/2349169153129?text=Hello%20RetainNG!%20I%20want%20to%20onboard%20my%20pharmacy."
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition"
            >
              <span>💬 WhatsApp Partner Support</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>14-Day Free Partner Pilot • Zero Setup Fee</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Activate WhatsApp AI Retention <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              For Your Pharmacy or Store
            </span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Stop losing routine prescription patients to competitors. Set up autonomous 28-day WhatsApp refills, local dialect voice notes (Hausa/Yoruba/Igbo), and 1-tap dispatch in 60 seconds.
          </p>
        </div>

        {/* 3 Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-10 text-xs">
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              ⚡
            </div>
            <div className="font-bold text-white text-sm">1-Tap Counter Slips</div>
            <div className="text-slate-400 leading-relaxed">
              Print our 4-in-1 slips on any normal printer. Staff simply drops them into medicine bags. Zero typing required.
            </div>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
              🗣️
            </div>
            <div className="font-bold text-white text-sm">Local Dialect Voice Notes</div>
            <div className="text-slate-400 leading-relaxed">
              Speaks fluent Hausa, Yoruba, Igbo, and English with voice notes for elderly patients who cannot read text.
            </div>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
              🛵
            </div>
            <div className="font-bold text-white text-sm">1-Tap Manager Dispatch</div>
            <div className="text-slate-400 leading-relaxed">
              Manager replies 1 for Counter Ready or 2 for Dispatch. Patient receives immediate delivery updates.
            </div>
          </div>
        </div>

        {/* Onboarding Form Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-xl mx-auto space-y-6 relative z-10">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white">Store Details</h2>
              <p className="text-xs text-slate-400 mt-1">
                Fill in your pharmacy details below. Your customized QR slips and partner portal will be generated instantly.
              </p>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="font-bold text-slate-200 block mb-1.5">
                  Business / Pharmacy Name *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Danfodio Pharmacy & Stores"
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-800 bg-slate-950 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-200 block mb-1.5">
                    Category *
                  </label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                    className="w-full px-3.5 py-3 rounded-xl border border-slate-800 bg-slate-950 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition cursor-pointer"
                  >
                    <option value="pharmacy">💊 Pharmacy & Chemist</option>
                    <option value="clinic">🩺 Medical Clinic & Diagnostics</option>
                    <option value="barber">💈 Barbershop & Grooming</option>
                    <option value="salon">💅 Hair Salon & Beauty Lounge</option>
                    <option value="laundry">🧺 Laundry & Dry Cleaning</option>
                    <option value="other">🏪 Other Retail / Service</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-200 block mb-1.5">
                    Manager WhatsApp Phone *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0803 000 0000"
                      className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-800 bg-slate-950 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-200 block mb-1.5">
                    City *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Kaduna"
                      className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-800 bg-slate-950 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-200 block mb-1.5">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="Kaduna State"
                    className="w-full px-3.5 py-3 rounded-xl border border-slate-800 bg-slate-950 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-200 block mb-1.5">
                  Business Email (Optional)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@pharmacy.ng"
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-800 bg-slate-950 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <span>Provisioning Store AI...</span>
                  ) : (
                    <>
                      <span>Launch 14-Day Free Pilot &amp; Get Bag Slips</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="pt-2 text-center text-slate-500 text-[11px] space-y-1">
                <div className="flex items-center justify-center gap-2 text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>No credit card required</span>
                  <span>•</span>
                  <span>Free 14-day full autonomous pilot</span>
                  <span>•</span>
                  <span>Instant PDF counter slips</span>
                </div>
                <div>Questions? Call our founder line directly at +234 916 915 3129</div>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
