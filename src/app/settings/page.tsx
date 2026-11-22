'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { updateBusiness, createBusiness, resetDemoData, clearBusinessData } from '@/lib/storage';
import { Business, BusinessType } from '@/types';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import {
  ShieldCheck,
  RefreshCw,
  Trash2,
  Plus,
  Check,
  ExternalLink,
  QrCode,
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
    });

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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Business Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage your business profile, customer registration URL, and data configuration.
        </p>
      </div>

      {/* Supabase & RLS Infrastructure Indicator */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" />
              Multi-Tenant Architecture Status
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            {isSupabaseConfigured
              ? 'Connected to Supabase PostgreSQL with Row Level Security (RLS) active.'
              : 'Running in self-contained interactive storage mode with complete Supabase SQL migrations ready in supabase/migrations/20261121_initial_schema.sql.'}
          </p>
        </div>

        <div className="shrink-0">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isSupabaseConfigured
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
            }`}
          >
            {isSupabaseConfigured ? 'Supabase Connected' : 'Local Storage Mode'}
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
