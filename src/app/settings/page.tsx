'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { updateBusiness, createBusiness, resetDemoData, clearBusinessData } from '@/lib/storage';
import { Business, BusinessType, WhatsAppRoutingMode } from '@/types';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import {
  ShieldCheck,
  RefreshCw,
  Trash2,
  Plus,
  Check,
  ExternalLink,
  QrCode,
  MessageCircle,
  Bot,
  Smartphone,
  ArrowRight,
  Send,
} from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { activeBusiness, refreshData, openQrModal } = useApp();

  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('barber');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Lagos');
  const [stateName, setStateName] = useState('Lagos');
  const [timezone, setTimezone] = useState('Africa/Lagos');

  // WhatsApp Fleet & Routing configuration
  const [whatsappRoutingMode, setWhatsappRoutingMode] = useState<WhatsAppRoutingMode>('agency_concierge');
  const [managerAlertPhone, setManagerAlertPhone] = useState('');
  const [conciergePhone, setConciergePhone] = useState('+234 703 267 3310');

  const [isSaved, setIsSaved] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newBizName, setNewBizName] = useState('');
  const [newBizType, setNewBizType] = useState<BusinessType>('salon');

  useEffect(() => {
    if (!activeBusiness) return;
    const timer = setTimeout(() => {
      setName(activeBusiness.name);
      setBusinessType(activeBusiness.business_type);
      setPhone(activeBusiness.phone || '');
      setEmail(activeBusiness.email || '');
      setAddress(activeBusiness.address || '');
      setCity(activeBusiness.city || 'Lagos');
      setStateName(activeBusiness.state || 'Lagos');
      setTimezone(activeBusiness.timezone || 'Africa/Lagos');

      setWhatsappRoutingMode(activeBusiness.whatsapp_routing_mode || 'agency_concierge');
      setManagerAlertPhone(activeBusiness.manager_alert_phone || activeBusiness.phone || '');
      setConciergePhone(activeBusiness.concierge_phone || '+234 703 267 3310');
    }, 0);
    return () => clearTimeout(timer);
  }, [activeBusiness]);

  if (!activeBusiness) return null;

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBusiness) return;

    updateBusiness(activeBusiness.id, {
      name: name.trim(),
      business_type: businessType,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || 'Lagos',
      state: stateName.trim() || 'Lagos',
      timezone,
      whatsapp_routing_mode: whatsappRoutingMode,
      manager_alert_phone: managerAlertPhone.trim() || undefined,
      concierge_phone: conciergePhone.trim() || undefined,
    });

    // Sync manager phone to the server-side pharmacy config (used by WhatsApp webhook)
    // This means zero manual env vars per pharmacy — ever.
    fetch('/api/pharmacy-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: activeBusiness.opt_in_slug,
        pharmacyName: name.trim(),
        managerPhone: managerAlertPhone.trim(),
        conciergePhone: conciergePhone.trim(),
      }),
    }).catch(() => {/* non-critical — config still works from memory */});

    setIsSaved(true);
    refreshData();
    setTimeout(() => setIsSaved(false), 3000);
  }

  function handleCreateNewBusiness(e: React.FormEvent) {
    e.preventDefault();
    if (!newBizName.trim()) return;

    createBusiness({
      name: newBizName.trim(),
      business_type: newBizType,
      city: 'Lagos',
      state: 'Lagos',
      currency: 'NGN',
      timezone: 'Africa/Lagos',
    });

    setIsCreatingNew(false);
    setNewBizName('');
    refreshData();
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Business Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage your business profile, customer registration URL, and data configuration.
        </p>
      </div>

      {/* WhatsApp Bot Live Status */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
              <Bot className="w-4 h-4" />
              WhatsApp AI Concierge — Live Status
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Bot number <strong className="text-white">+234 703 267 3310</strong> is active on Green-API and listening 24/7.
            New patient scans trigger instant manager alerts. Refill keywords trigger AI dispatch. Monthly reports auto-fire on the 1st.
          </p>
        </div>

        <div className="shrink-0">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Bot Online
          </span>
        </div>
      </div>

      {/* Profile Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-900">Business Profile</h3>
            <p className="text-xs text-slate-500">Displayed on customer receipts and the opt-in QR landing page</p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreatingNew(!isCreatingNew)}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Another Business</span>
          </button>
        </div>

        {isCreatingNew && (
          <form
            onSubmit={handleCreateNewBusiness}
            className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3 text-xs"
          >
            <p className="font-bold text-emerald-900">Add a new business profile:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Business Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ikeja Express Car Wash"
                  value={newBizName}
                  onChange={(e) => setNewBizName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Type</label>
                <select
                  value={newBizType}
                  onChange={(e) => setNewBizType(e.target.value as BusinessType)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="pharmacy">💊 Community Pharmacy & Health</option>
                  <option value="clinic">🩺 Medical Clinic & Diagnostics</option>
                  <option value="barber">Barbershop</option>
                  <option value="salon">Hair Salon & Nails</option>
                  <option value="laundry">Laundry & Dry Cleaning</option>
                  <option value="car_wash">Car Wash & Detailing</option>
                  <option value="boutique">Boutique & Fashion</option>
                  <option value="spa_wellness">Spa & Wellness</option>
                  <option value="other">Other SME</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded-lg shadow-xs"
              >
                Create Business
              </button>
            </div>
          </form>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Business Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Business Type *
              </label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="pharmacy">💊 Community Pharmacy & Health</option>
                <option value="clinic">🩺 Medical Clinic & Diagnostics</option>
                <option value="barber">Barbershop & Grooming</option>
                <option value="salon">Hair Salon & Nails</option>
                <option value="laundry">Laundry & Dry Cleaning</option>
                <option value="car_wash">Car Wash & Auto Detailing</option>
                <option value="boutique">Boutique & Fashion Retail</option>
                <option value="spa_wellness">Spa & Beauty Lounge</option>
                <option value="other">Other Service Business</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Business Phone / WhatsApp
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 802 000 0000"
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Business Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@business.ng"
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Street Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Plot 14 Admiralty Way, Lekki Phase 1"
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                City / State
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Lagos"
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Currency
              </label>
              <input
                type="text"
                disabled
                value="NGN (₦) - Nigerian Naira"
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-600"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Timezone
              </label>
              <input
                type="text"
                disabled
                value="Africa/Lagos (GMT+1)"
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-600"
              />
            </div>
          </div>

          {/* Customer Opt-In Link preview */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Customer Opt-in URL & Slug</span>
              <button
                type="button"
                onClick={openQrModal}
                className="text-xs text-emerald-700 font-semibold flex items-center gap-1 hover:underline"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Show Stand QR</span>
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Unique link assigned to this business for customer self-registration:
            </p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono bg-white px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-800 select-all truncate flex-1">
                /opt-in/{activeBusiness.opt_in_slug}
              </code>
              <Link
                href={`/opt-in/${activeBusiness.opt_in_slug}`}
                target="_blank"
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 flex items-center gap-1 shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Form</span>
              </Link>
            </div>
          </div>

          {/* WhatsApp Fleet Architecture & Routing Settings */}
          <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-50/60 via-slate-50 to-teal-50/40 border border-emerald-200/80 rounded-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    WhatsApp Fleet Architecture & Message Routing
                  </h4>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Control whether patient WhatsApp chats are handled by your Agency&apos;s Central AI Bot or routed directly to this store&apos;s counter phone.
                </p>
              </div>
            </div>

            {/* Mode selection radio cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <label
                className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition text-left ${
                  whatsappRoutingMode === 'agency_concierge'
                    ? 'border-emerald-600 bg-white shadow-sm ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white/70 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="routingMode"
                      value="agency_concierge"
                      checked={whatsappRoutingMode === 'agency_concierge'}
                      onChange={() => setWhatsappRoutingMode('agency_concierge')}
                      className="text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <span className="font-bold text-xs sm:text-sm text-slate-900">
                      Agency Central Concierge Bot
                    </span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 rounded-full">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  One agency WhatsApp number powers all client pharmacies. AI handles 24/7 refills, attribution tag <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-emerald-700 text-[11px]">[ref:{activeBusiness.opt_in_slug}]</code> identifies the store, and dispatches instant order alerts to the manager.
                </p>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Zero counter staff burden &bull; Never drops messages</span>
                </div>
              </label>

              <label
                className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition text-left ${
                  whatsappRoutingMode === 'store_direct'
                    ? 'border-emerald-600 bg-white shadow-sm ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white/70 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="routingMode"
                      value="store_direct"
                      checked={whatsappRoutingMode === 'store_direct'}
                      onChange={() => setWhatsappRoutingMode('store_direct')}
                      className="text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <span className="font-bold text-xs sm:text-sm text-slate-900">
                      Store Direct WhatsApp (wa.me)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-slate-100 text-slate-600 rounded-full">
                    Manual
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Patient links and bag slips open direct chats to this pharmacy&apos;s physical counter smartphone. Counter attendants must manually reply, track refills, and log customer visits.
                </p>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-amber-700">
                  <span>⚠️ High risk of missed refills during busy hours</span>
                </div>
              </label>
            </div>

            {/* Dynamic Configuration fields */}
            {whatsappRoutingMode === 'agency_concierge' ? (
              <div className="p-4 bg-white rounded-xl border border-emerald-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Agency Concierge Bot Number (Shared)
                    </label>
                    <div className="relative">
                      <Bot className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" />
                      <input
                        type="text"
                        value={conciergePhone}
                        onChange={(e) => setConciergePhone(e.target.value)}
                        placeholder="+234 803 200 2026"
                        className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      The single WhatsApp bot line operated by your agency for all Kaduna pharmacies.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Pharmacy Manager / Owner Alert Phone
                    </label>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={managerAlertPhone}
                        onChange={(e) => setManagerAlertPhone(e.target.value)}
                        placeholder="+234 803 123 4567"
                        className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      When a patient asks for a refill, the AI pings this number with the customer&apos;s details and order.
                    </p>
                  </div>
                </div>

                {/* Live Dispatch Flow Visualizer */}
                <div className="p-3.5 bg-slate-900 text-slate-200 rounded-xl space-y-2.5">
                  <span className="text-[11px] uppercase tracking-wider font-extrabold text-emerald-400 block">
                    ⚡ Live Concierge Routing Flow
                  </span>
                  
                  <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-xs">
                    <div className="w-full md:w-1/3 bg-slate-800/90 p-2.5 rounded-lg border border-slate-700">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>1. Patient Scans / Chats</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Scans bag slip QR or clicks link. Embeds <span className="font-mono text-emerald-300">[ref:{activeBusiness.opt_in_slug}]</span>
                      </p>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-500 hidden md:block shrink-0" />

                    <div className="w-full md:w-1/3 bg-slate-800/90 p-2.5 rounded-lg border border-slate-700">
                      <div className="flex items-center gap-1.5 text-teal-400 font-semibold mb-1">
                        <Bot className="w-3.5 h-3.5" />
                        <span>2. AI Concierge Bot</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Greets as <strong className="text-white">{activeBusiness.name}</strong>, confirms medication request & delivery address.
                      </p>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-500 hidden md:block shrink-0" />

                    <div className="w-full md:w-1/3 bg-slate-800/90 p-2.5 rounded-lg border border-slate-700">
                      <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
                        <Send className="w-3.5 h-3.5" />
                        <span>3. WhatsApp Alert to Manager</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Pings {managerAlertPhone || 'Manager Phone'} with customer name, phone, and medications ready for dispatch.
                      </p>
                    </div>
                  </div>

                  {/* Sample Alert Message */}
                  <div className="mt-2 p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 leading-relaxed">
                    <div className="text-emerald-400 font-bold mb-1">Sample Manager WhatsApp Alert:</div>
                    🚨 *NEW REFILL ORDER &mdash; {activeBusiness.name}*<br />
                    👤 *Patient:* Alhaji Musa (...4821)<br />
                    💊 *Medications:* Amlodipine 10mg (1 month) &amp; Metformin 500mg<br />
                    📍 *Address:* Barnawa Phase 2, Kaduna<br />
                    ⏱️ *Logged:* 28-day refill clock automatically reset. Pack &amp; call patient.
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Store Counter WhatsApp Number
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 803 123 4567"
                    className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Patients will chat directly with the person holding this phone. No AI autopilot will assist them.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {isSaved ? (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 animate-in fade-in">
                <Check className="w-4 h-4" />
                <span>Profile updated successfully!</span>
              </span>
            ) : (
              <span />
            )}

            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition cursor-pointer"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>

      {/* Demo Data Management */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-3">
        <h3 className="font-bold text-base text-slate-900">Data Management & Demo Mode</h3>
        <p className="text-xs text-slate-500">
          Easily test features using sample Nigerian SMEs, or wipe sample records to begin entering your own genuine customer data.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <span className="font-semibold text-xs text-slate-800 block">Reset Sample Data</span>
            <p className="text-[11px] text-slate-500">
              Restores realistic Nigerian customers (Lekki Barbers, Yaba Glow, SparkleWash Laundry) with visit histories and consent records.
            </p>
            <button
              type="button"
              onClick={() => {
                if (confirm('Reset to default Nigerian demo records?')) {
                  resetDemoData();
                  refreshData();
                  alert('Demo data restored');
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
              <span>Reload Demo Records</span>
            </button>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <span className="font-semibold text-xs text-rose-800 block">Wipe Records for Active Business</span>
            <p className="text-[11px] text-slate-500">
              Clears all customers, visit ledger entries, and campaign drafts for &ldquo;{activeBusiness.name}&rdquo; so you start with 0 records.
            </p>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete all records for ${activeBusiness.name}?`)) {
                  clearBusinessData(activeBusiness.id);
                  refreshData();
                  alert('Business records cleared. Ready for genuine entries!');
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Clear Sample Records</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
