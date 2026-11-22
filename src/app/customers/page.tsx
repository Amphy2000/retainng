'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { ConsentStatus } from '@/types';
import { saveCustomer } from '@/lib/storage';
import { ConsentBadge } from '@/components/ConsentBadge';
import { CsvImportModal } from '@/components/CsvImportModal';
import { formatNgn, formatRelativeTime, getWhatsAppUrl } from '@/lib/utils';
import {
  Users,
  Search,
  UserPlus,
  UploadCloud,
  QrCode,
  Receipt,
  Phone,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  MessageCircle,
} from 'lucide-react';

export default function CustomersPage() {
  const {
    activeBusiness,
    customers,
    refreshData,
    openRecordSaleModal,
    openQrModal,
    openCustomerDetail,
  } = useApp();

  const [search, setSearch] = useState('');
  const [filterConsent, setFilterConsent] = useState<'all' | 'consented' | 'unconfirmed' | 'opted_out'>('all');
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);

  // Add Customer Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>('unconfirmed');
  const [consentNotes, setConsentNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Filtered List
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Search match
      const query = search.toLowerCase().trim();
      const matchSearch =
        !query ||
        (c.full_name || '').toLowerCase().includes(query) ||
        (c.phone || '').includes(query) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.tags || []).some((t) => (t || '').toLowerCase().includes(query));

      // Consent filter
      const matchConsent = filterConsent === 'all' || c.consent_status === filterConsent;

      return matchSearch && matchConsent;
    });
  }, [customers, search, filterConsent]);

  // Counts for quick tabs
  const countAll = customers.length;
  const countConsented = customers.filter((c) => c.consent_status === 'consented').length;
  const countUnconfirmed = customers.filter((c) => c.consent_status === 'unconfirmed').length;
  const countOptedOut = customers.filter((c) => c.consent_status === 'opted_out').length;

  function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Please enter full name');
      return;
    }
    if (!phone.trim()) {
      setFormError('Please enter phone number');
      return;
    }

    if (!activeBusiness) return;

    try {
      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      saveCustomer(activeBusiness.id, {
        full_name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        tags: tagList,
        notes: notes.trim() || undefined,
        consent_status: consentStatus,
        consent_source: consentStatus === 'consented' ? 'in_store_verbal' : 'manual_entry',
        consent_notes: consentNotes.trim() || undefined,
      });

      // Reset
      setName('');
      setPhone('');
      setEmail('');
      setTags('');
      setNotes('');
      setConsentStatus('unconfirmed');
      setConsentNotes('');
      setFormError(null);
      setIsAddCustomerOpen(false);
      refreshData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save customer');
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Customer Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage customer records, visit frequency, and verifiable marketing consent.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition"
          >
            <UploadCloud className="w-4 h-4 text-slate-600" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={openQrModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition"
          >
            <QrCode className="w-4 h-4 text-emerald-600" />
            <span>Opt-In QR</span>
          </button>

          <button
            onClick={() => setIsAddCustomerOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-md transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Consent Principle Card */}
      <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-950 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <strong>Consent-first policy:</strong> Storing a customer&apos;s phone number lets you record their visits, but they are only marked as <strong>Consented</strong> when they give explicit permission (via Counter QR, verbal check, or web form). Customers without consent are safely kept as <strong>Unconfirmed</strong> and will never receive marketing drafts.
        </div>
      </div>

      {/* Search & Consent Filter Tabs */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
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

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterConsent('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition ${
                filterConsent === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({countAll})
            </button>
            <button
              onClick={() => setFilterConsent('consented')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition flex items-center gap-1 ${
                filterConsent === 'consented'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Consented ({countConsented})</span>
            </button>
            <button
              onClick={() => setFilterConsent('unconfirmed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition flex items-center gap-1 ${
                filterConsent === 'unconfirmed'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <AlertCircle className="w-3 h-3" />
              <span>Unconfirmed ({countUnconfirmed})</span>
            </button>
            <button
              onClick={() => setFilterConsent('opted_out')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition flex items-center gap-1 ${
                filterConsent === 'opted_out'
                  ? 'bg-rose-700 text-white'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              <XCircle className="w-3 h-3" />
              <span>Opted Out ({countOptedOut})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customer List / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No customers found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {search || filterConsent !== 'all'
                ? 'Try adjusting your search keywords or consent filter.'
                : 'Your customer directory is empty. Add a customer manually, import an existing CSV file, or have customers scan your counter QR code.'}
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setIsAddCustomerOpen(true)}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
              >
                Add Customer
              </button>
              <button
                onClick={() => setIsCsvModalOpen(true)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Upload CSV
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredCustomers.map((cust) => (
              <div
                key={cust.id}
                className="p-4 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Left: Customer Info */}
                <div
                  className="flex items-start gap-3 cursor-pointer min-w-0 flex-1"
                  onClick={() => openCustomerDetail(cust.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0 border border-slate-200 mt-0.5">
                    {cust.full_name?.charAt(0)?.toUpperCase() || 'C'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm sm:text-base text-slate-900 hover:text-emerald-700 transition">
                        {cust.full_name}
                      </span>
                      <ConsentBadge status={cust.consent_status} size="sm" />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1 font-mono text-[11px] text-slate-600">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {cust.phone}
                      </span>
                      {cust.email && <span>• {cust.email}</span>}
                    </div>

                    {/* Tags */}
                    {cust.tags && cust.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {cust.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Visit Statistics & Actions */}
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
                    {cust.consent_status === 'consented' && activeBusiness && (
                      <a
                        href={getWhatsAppUrl(
                          cust.phone || '',
                          `Hello ${cust.full_name ? cust.full_name.split(' ')[0] : 'Friend'}! It's ${activeBusiness.name}. We'd love to see you again soon — reply to book your preferred slot this week!`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Send WhatsApp re-invite"
                        className="px-2.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1 transition shadow-2xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>
                    )}
                    <button
                      onClick={() => openRecordSaleModal(cust.id)}
                      title="Record a visit for this customer"
                      className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center gap-1 transition"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>+ Visit</span>
                    </button>
                    <button
                      onClick={() => openCustomerDetail(cust.id)}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Add New Customer</h3>
                  <p className="text-xs text-slate-400">Record profile and explicit consent permission</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddCustomerOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-5 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Babajide Adeleke"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="e.g. 0802 345 6789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Email (Optional)</label>
                <input
                  type="email"
                  placeholder="e.g. customer@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. VIP, Weekend, Fade Cut"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Marketing Consent Selector */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  Marketing Consent Status *
                </label>
                <select
                  value={consentStatus}
                  onChange={(e) => setConsentStatus(e.target.value as ConsentStatus)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="unconfirmed">Unconfirmed (No marketing permission yet)</option>
                  <option value="consented">Consented (Agreed verbally or in writing)</option>
                  <option value="opted_out">Opted Out (Do not send marketing)</option>
                </select>

                {consentStatus === 'consented' && (
                  <input
                    type="text"
                    placeholder="Consent notes (e.g. 'Agreed at checkout on 21 Nov')"
                    value={consentNotes}
                    onChange={(e) => setConsentNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Notes / Preferences</label>
                <textarea
                  rows={2}
                  placeholder="Style preferences, preferred times, favorite stylist..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onSuccess={refreshData}
      />
    </div>
  );
}
