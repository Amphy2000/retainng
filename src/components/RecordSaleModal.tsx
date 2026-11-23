'use client';

import React, { useState, useEffect } from 'react';
import { Customer, Business } from '@/types';
import { getCustomers, getActiveBusiness, recordSale } from '@/lib/storage';
import { parsePaymentAlert } from '@/lib/utils';
import { X, Check, Plus, Receipt, AlertCircle, Sparkles, ClipboardPaste } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedCustomerId?: string;
}

export function RecordSaleModal({ isOpen, onClose, onSuccess, preselectedCustomerId }: Props) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);

  // Form states
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [grantConsent, setGrantConsent] = useState(false);

  const [amount, setAmount] = useState<string>('');
  const [service, setService] = useState('');
  const [notes, setNotes] = useState('');
  const [visitDate, setVisitDate] = useState<string>('');
  const [alertText, setAlertText] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleParseAlert(text: string) {
    setAlertText(text);
    const parsed = parsePaymentAlert(text);
    if (parsed.amount) {
      setAmount(String(parsed.amount));
    }
    if (parsed.name) {
      const q = parsed.name.toLowerCase();
      const found = customers.find((c) => {
        const cName = (c.full_name || '').toLowerCase();
        return cName.includes(q) || q.includes(cName);
      });
      if (found) {
        setSelectedCustomerId(found.id);
        setIsAddingNewCustomer(false);
      } else {
        setIsAddingNewCustomer(true);
        setNewCustName(parsed.name);
        setNewCustPhone('08000000000');
        setGrantConsent(false);
      }
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setVisitDate(new Date().toISOString().split('T')[0]);
      const biz = getActiveBusiness();
      setBusiness(biz);
      const custList = getCustomers(biz.id);
      setCustomers(custList);

      if (preselectedCustomerId) {
        setSelectedCustomerId(preselectedCustomerId);
        setIsAddingNewCustomer(false);
      } else if (custList.length > 0) {
        setSelectedCustomerId(custList[0].id);
        setIsAddingNewCustomer(false);
      } else {
        setIsAddingNewCustomer(true);
      }

      setError(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen, preselectedCustomerId]);

  if (!isOpen) return null;

  // Preset chips depending on business type
  const quickServices =
    business?.business_type === 'barber'
      ? ['Haircut & Beard Shape', 'Signature Fade', 'Executive Shave & Facial', 'Home Visit Cut']
      : business?.business_type === 'salon'
      ? ['Braids & Styling', 'Wash & Blow Dry', 'Gel Nails & Pedicure', 'Lace Wig Install']
      : business?.business_type === 'laundry'
      ? ['3-Piece Suit Dry Clean', 'Native Attire Wash & Iron', 'Bedding & Duvet Set', 'Express Laundry (5kg)']
      : business?.business_type === 'car_wash'
      ? ['Full Exterior Wash', 'Interior Steam Detailing', 'Engine Wash & Polish', 'VIP Complete Treatment']
      : ['Product Purchase', 'Standard Service', 'Consultation', 'Custom Package'];

  const quickAmounts = [2500, 5000, 7500, 10000, 15000];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Amount is completely optional — RetainNG is a retention engine, not a POS
    const numAmount = amount.trim() ? Number(amount) : 0;
    if (isNaN(numAmount) || numAmount < 0) {
      setError('Please enter a valid amount or leave it blank');
      return;
    }

    if (isAddingNewCustomer) {
      if (!newCustName.trim()) {
        setError('Please enter the customer’s name');
        return;
      }
      if (!newCustPhone.trim()) {
        setError('Please enter the customer’s phone number');
        return;
      }
    } else if (!selectedCustomerId) {
      setError('Please select an existing customer or toggle to add a new one');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!business) return;

      recordSale(business.id, {
        customer_id: isAddingNewCustomer ? undefined : selectedCustomerId,
        new_customer_name: isAddingNewCustomer ? newCustName.trim() : undefined,
        new_customer_phone: isAddingNewCustomer ? newCustPhone.trim() : undefined,
        amount_ngn: numAmount,
        visit_date: visitDate,
        service_or_product: service.trim() || undefined,
        notes: notes.trim() || undefined,
        grant_marketing_consent: isAddingNewCustomer ? grantConsent : undefined,
      });

      // Reset
      setAmount('');
      setService('');
      setNotes('');
      setNewCustName('');
      setNewCustPhone('');
      setGrantConsent(false);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record sale');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Record a Sale or Visit</h3>
              <p className="text-xs text-slate-400">Takes seconds • Mobile-first manual entry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Smart 1-Second Logger: Paste Bank Transfer / POS Alert */}
          <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>⚡ Auto-Fill: Paste Moniepoint / OPay Transfer SMS</span>
              </span>
              <ClipboardPaste className="w-3.5 h-3.5 text-emerald-700" />
            </div>
            <input
              type="text"
              placeholder="Paste alert text (e.g. Credit: NGN 6,000 from Chidi Okafor...)"
              value={alertText}
              onChange={(e) => handleParseAlert(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>

          {/* Quick Regulars Bar */}
          {customers.length > 0 && (
            <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>⚡ 1-Tap Regular Customer:</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNewCustomer(true);
                    setNewCustName('Walk-in Guest');
                    setNewCustPhone('08000000000');
                    setGrantConsent(false);
                  }}
                  className="text-amber-700 hover:text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]"
                >
                  ⚡ Fast Walk-in (No Name)
                </button>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {customers.slice(0, 5).map((cust) => {
                  const isSelected = !isAddingNewCustomer && selectedCustomerId === cust.id;
                  return (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => {
                        setIsAddingNewCustomer(false);
                        setSelectedCustomerId(cust.id);
                      }}
                      className={`px-2.5 py-1 text-xs rounded-lg border shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 font-medium'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] flex items-center justify-center font-bold">
                        {cust.full_name?.charAt(0) || 'C'}
                      </span>
                      <span>{cust.full_name?.split(' ')[0] || cust.full_name || 'Customer'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Customer Selection Mode */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Customer
              </label>
              <button
                type="button"
                onClick={() => setIsAddingNewCustomer(!isAddingNewCustomer)}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1 hover:underline"
              >
                {isAddingNewCustomer ? (
                  <span>Choose from existing customers</span>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Quick add new customer</span>
                  </>
                )}
              </button>
            </div>

            {!isAddingNewCustomer ? (
              <div className="relative">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.phone}) {c.consent_status === 'consented' ? '✓ Consented' : '• Unconfirmed'}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <p className="text-xs text-slate-600">
                  Enter details once; this customer will be saved to your database automatically.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Babajide Adeleke"
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                      required={isAddingNewCustomer}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      placeholder="e.g. 0802 345 6789"
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                      required={isAddingNewCustomer}
                    />
                  </div>
                </div>

                {/* Consent Checkbox */}
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={grantConsent}
                      onChange={(e) => setGrantConsent(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-800">
                        Customer agreed to receive marketing messages
                      </span>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Leave unchecked if they only provided their number for this receipt or visit. We never assume consent without explicit permission.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Amount (NGN) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Amount (₦ NGN)
              </label>
              <span className="text-[11px] text-slate-400 font-normal">Optional · Zero POS conflict</span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-base">
                ₦
              </span>
              <input
                type="number"
                placeholder="Leave blank or enter amount (e.g. 5000)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 text-sm sm:text-base font-bold rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                min="0"
                step="100"
              />
            </div>

            {/* Quick Amount Chips */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
              <span className="text-[11px] text-slate-400 font-medium shrink-0">Quick tap:</span>
              {quickAmounts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(q))}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 border border-slate-200 transition shrink-0"
                >
                  ₦{q.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Service / Product */}
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
              Service or Item (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Signature Cut & Beard Oil"
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            {/* Quick Service Suggestions */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickServices.map((qs) => (
                <button
                  key={qs}
                  type="button"
                  onClick={() => setService(qs)}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-slate-50 hover:bg-slate-200 text-slate-600 border border-slate-200 transition"
                >
                  {qs}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Note in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                Date
              </label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                Payment note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Moniepoint POS or Cash"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Honest Automation notice */}
          <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed">
            💡 <strong>Honest record:</strong> This entry is stored in your business retention database to track repeat customer frequency. It does not alter your physical POS or send unsolicited messages.
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
