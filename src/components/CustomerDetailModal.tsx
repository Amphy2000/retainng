'use client';

import React, { useState, useEffect } from 'react';
import { Customer, SaleOrVisit, CustomerConsentRecord, ConsentStatus } from '@/types';
import { getCustomer, saveCustomer, deleteCustomer, deleteSale, getActiveBusiness } from '@/lib/storage';
import { ConsentBadge } from './ConsentBadge';
import { formatNgn, formatDate, formatRelativeTime } from '@/lib/utils';
import {
  X,
  Receipt,
  ShieldCheck,
  Tag,
  Edit2,
  Trash2,
  Plus,
  Check,
} from 'lucide-react';

interface Props {
  customerId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onRecordVisitForCustomer: (customerId: string) => void;
}

export function CustomerDetailModal({
  customerId,
  isOpen,
  onClose,
  onUpdated,
  onRecordVisitForCustomer,
}: Props) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<SaleOrVisit[]>([]);
  const [consentRecords, setConsentRecords] = useState<CustomerConsentRecord[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editConsentStatus, setEditConsentStatus] = useState<ConsentStatus>('unconfirmed');
  const [consentChangeReason, setConsentChangeReason] = useState('');

  const [activeTab, setActiveTab] = useState<'visits' | 'consent' | 'notes'>('visits');

  function reload() {
    if (!customerId) return;
    const biz = getActiveBusiness();
    const data = getCustomer(biz.id, customerId);
    if (data.customer) {
      setCustomer(data.customer);
      setSales(data.sales);
      setConsentRecords(data.consentRecords);

      setEditName(data.customer.full_name);
      setEditPhone(data.customer.phone);
      setEditEmail(data.customer.email || '');
      setEditNotes(data.customer.notes || '');
      setEditTags(data.customer.tags.join(', '));
      setEditConsentStatus(data.customer.consent_status);
    }
  }

  useEffect(() => {
    if (!isOpen || !customerId) return;
    const timer = setTimeout(() => {
      reload();
      setIsEditing(false);
      setActiveTab('visits');
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen, customerId]);

  if (!isOpen || !customer) return null;

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!customer) return;
    const biz = getActiveBusiness();

    const tagArray = editTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    saveCustomer(biz.id, {
      id: customer.id,
      full_name: editName,
      phone: editPhone,
      email: editEmail || undefined,
      notes: editNotes || undefined,
      tags: tagArray,
      consent_status: editConsentStatus,
      consent_notes: consentChangeReason.trim() || undefined,
    });

    setIsEditing(false);
    setConsentChangeReason('');
    reload();
    onUpdated();
  }

  function handleDeleteCustomer() {
    if (!customer) return;
    if (confirm(`Are you sure you want to delete ${customer.full_name}? All associated visit records will also be removed.`)) {
      const biz = getActiveBusiness();
      deleteCustomer(biz.id, customer.id);
      onUpdated();
      onClose();
    }
  }

  function handleDeleteSale(saleId: string) {
    if (confirm('Delete this visit/sale record?')) {
      deleteSale(saleId);
      reload();
      onUpdated();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-base border border-emerald-500/30">
              {customer.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">{customer.full_name}</h3>
                <ConsentBadge status={customer.consent_status} size="sm" />
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>{customer.phone}</span>
                {customer.email && <span>• {customer.email}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Edit Form or Normal View */}
        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="p-5 overflow-y-auto space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Editing Customer Profile
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Email (Optional)</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Tags (Comma-separated)</label>
              <input
                type="text"
                placeholder="VIP, Weekend, Braids, Student"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Consent Status Picker */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="text-xs font-bold text-slate-800 block">
                Marketing Consent Status
              </label>
              <select
                value={editConsentStatus}
                onChange={(e) => setEditConsentStatus(e.target.value as ConsentStatus)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="consented">Consented (Agreed to receive SMS/WhatsApp)</option>
                <option value="unconfirmed">Unconfirmed (No marketing consent)</option>
                <option value="opted_out">Opted Out (Explicitly requested no messages)</option>
              </select>

              <input
                type="text"
                placeholder="Reason or source of consent change (optional note for audit trail)"
                value={consentChangeReason}
                onChange={(e) => setConsentChangeReason(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Internal Notes</label>
              <textarea
                rows={2}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Preferences, favorite barber/stylist, special instructions..."
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleDeleteCustomer}
                className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Customer</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
            {/* Quick Stat Pill Bar */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
              <div>
                <p className="text-[11px] text-slate-500 font-medium">Recorded Visits</p>
                <p className="text-base font-bold text-slate-900">{customer.total_visits || sales.length}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-medium">Total Spent</p>
                <p className="text-base font-bold text-emerald-700">{formatNgn(customer.total_spent_ngn)}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-medium">Last Visit</p>
                <p className="text-xs font-semibold text-slate-800 mt-1">
                  {formatRelativeTime(customer.last_visit_date)}
                </p>
              </div>
            </div>

            {/* Tags & Consent Details */}
            <div className="space-y-2">
              {customer.tags && customer.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Tags:
                  </span>
                  {customer.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {customer.notes && (
                <div className="p-2.5 bg-amber-50/70 border border-amber-200/70 rounded-lg text-xs text-amber-900">
                  <span className="font-semibold">Notes:</span> {customer.notes}
                </div>
              )}
            </div>

            {/* Tabs for Navigation */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setActiveTab('visits')}
                className={`pb-2 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
                  activeTab === 'visits'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Visit Records ({sales.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('consent')}
                className={`pb-2 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
                  activeTab === 'consent'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Consent Audit ({consentRecords.length})</span>
              </button>
            </div>

            {/* TAB CONTENT: VISITS */}
            {activeTab === 'visits' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Recorded sales & service visits</span>
                  <button
                    onClick={() => {
                      onClose();
                      onRecordVisitForCustomer(customer.id);
                    }}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Record Visit</span>
                  </button>
                </div>

                {sales.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl">
                    <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs text-slate-600 font-medium">No visits recorded yet for {customer.full_name}</p>
                    <button
                      onClick={() => {
                        onClose();
                        onRecordVisitForCustomer(customer.id);
                      }}
                      className="mt-2 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 font-medium"
                    >
                      Record First Visit
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {sales.map((sale) => (
                      <div
                        key={sale.id}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:border-slate-300 transition"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{formatNgn(sale.amount_ngn)}</span>
                            <span className="text-xs text-slate-500">• {formatDate(sale.visit_date)}</span>
                          </div>
                          <p className="text-xs text-slate-700 mt-0.5">
                            {sale.service_or_product || 'Standard Service'}
                          </p>
                          {sale.notes && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{sale.notes}</p>
                          )}
                        </div>

                        <button
                          onClick={() => handleDeleteSale(sale.id)}
                          title="Delete mistaken entry"
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: CONSENT AUDIT */}
            {activeTab === 'consent' && (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Current Status:</span>
                    <ConsentBadge status={customer.consent_status} />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Source: <strong className="capitalize">{customer.consent_source || 'manual_entry'}</strong> • Recorded on{' '}
                    {formatDate(customer.consent_date || customer.created_at)}
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-700">Audit Trail History</span>
                  {consentRecords.length === 0 ? (
                    <p className="text-xs text-slate-400">No consent history logged.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto">
                      {consentRecords.map((cr) => (
                        <div
                          key={cr.id}
                          className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs space-y-0.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold capitalize text-slate-800">
                              Status: {cr.status}
                            </span>
                            <span className="text-[11px] text-slate-400">{formatDate(cr.created_at)}</span>
                          </div>
                          <p className="text-[11px] text-slate-600">
                            Source: <code className="bg-slate-100 px-1 py-0.2 rounded text-[10px]">{cr.source}</code>
                          </p>
                          {cr.notes && (
                            <p className="text-[11px] text-slate-500 italic">&ldquo;{cr.notes}&rdquo;</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Registered: {formatDate(customer.created_at)}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
