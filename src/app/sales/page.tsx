'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { SaleOrVisit } from '@/types';
import { updateSale, deleteSale } from '@/lib/storage';
import { formatNgn, formatDate } from '@/lib/utils';
import {
  Receipt,
  Search,
  PlusCircle,
  Trash2,
  Edit2,
  X,
  Info,
} from 'lucide-react';

export default function SalesPage() {
  const {
    sales,
    refreshData,
    openRecordSaleModal,
    openCustomerDetail,
  } = useApp();

  const [search, setSearch] = useState('');
  const [editingSale, setEditingSale] = useState<SaleOrVisit | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editService, setEditService] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const filteredSales = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return sales;
    return sales.filter(
      (s) =>
        s.customer_name?.toLowerCase().includes(q) ||
        s.customer_phone?.includes(q) ||
        s.service_or_product?.toLowerCase().includes(q) ||
        s.notes?.toLowerCase().includes(q)
    );
  }, [sales, search]);

  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + (Number(s.amount_ngn) || 0), 0);
  }, [filteredSales]);

  function handleStartEdit(sale: SaleOrVisit) {
    setEditingSale(sale);
    setEditAmount(String(sale.amount_ngn));
    setEditService(sale.service_or_product || '');
    setEditDate(sale.visit_date);
    setEditNotes(sale.notes || '');
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSale) return;

    updateSale(editingSale.id, {
      amount_ngn: Number(editAmount) || 0,
      service_or_product: editService.trim() || undefined,
      visit_date: editDate,
      notes: editNotes.trim() || undefined,
    });

    setEditingSale(null);
    refreshData();
  }

  function handleDelete(saleId: string) {
    if (confirm('Are you sure you want to delete this recorded visit?')) {
      deleteSale(saleId);
      refreshData();
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Visits & Sales Log
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manual visit records used to measure customer retention and visit frequency.
          </p>
        </div>

        <button
          onClick={() => openRecordSaleModal()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-md transition cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Record Sale / Visit</span>
        </button>
      </div>

      {/* Honest Automation Notice */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-600">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <span>
          <strong>Low-effort manual ledger:</strong> These records exist to track repeat visit patterns. If staff made an error in the amount or customer, you can edit or delete entries below at any time.
        </span>
      </div>

      {/* Stats & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase">Total Logged Visits</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{filteredSales.length}</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase">Recorded Sales Total</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{formatNgn(totalRevenue)}</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer or service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Sales List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredSales.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No visits recorded</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tap below to record your first visit. Takes seconds on a phone without bookkeeping stress.
            </p>
            <button
              onClick={() => openRecordSaleModal()}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
            >
              Record First Visit
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredSales.map((sale) => (
              <div
                key={sale.id}
                className="p-4 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0 border border-emerald-200 mt-0.5">
                    ₦
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openCustomerDetail(sale.customer_id)}
                        className="font-bold text-sm text-slate-900 hover:text-emerald-700 truncate text-left underline-offset-2 hover:underline"
                      >
                        {sale.customer_name || 'Customer'}
                      </button>
                      <span className="text-xs text-slate-400">• {formatDate(sale.visit_date)}</span>
                    </div>

                    <p className="text-xs text-slate-700 mt-0.5 font-medium">
                      {sale.service_or_product || 'Service / Product'}
                    </p>

                    {sale.notes && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Note: {sale.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Amount & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <p className="text-base font-extrabold text-slate-900">
                      {formatNgn(sale.amount_ngn)}
                    </p>
                    <span className="text-[10px] text-slate-400 uppercase font-medium">
                      Manual Record
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(sale)}
                      title="Edit this record"
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(sale.id)}
                      title="Delete record"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Sale Modal */}
      {editingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Edit Visit / Sale Record</h3>
              <button
                onClick={() => setEditingSale(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Customer</label>
                <input
                  type="text"
                  disabled
                  value={editingSale.customer_name || 'Customer'}
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Amount (₦ NGN) *</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                  required
                  min="0"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Service or Item</label>
                <input
                  type="text"
                  value={editService}
                  onChange={(e) => setEditService(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Payment note</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. Card POS or Cash"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-white bg-emerald-600 hover:bg-emerald-700 font-bold rounded-lg shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
