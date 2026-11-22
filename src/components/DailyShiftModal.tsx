'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatNgn, formatDate } from '@/lib/utils';
import {
  X,
  Share2,
  Receipt,
  Sparkles,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function DailyShiftModal({ isOpen, onClose }: Props) {
  const { activeBusiness, sales } = useApp();
  const [commissionRate, setCommissionRate] = useState<number>(40); // default 40% split standard in Nigerian salons/barbers

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filter sales recorded for today
  const todaySales = useMemo(() => {
    return sales.filter((s) => s.visit_date === todayStr);
  }, [sales, todayStr]);

  const todayTotalRevenue = useMemo(() => {
    return todaySales.reduce((acc, s) => acc + (Number(s.amount_ngn) || 0), 0);
  }, [todaySales]);

  const staffCommission = useMemo(() => {
    return Math.round(todayTotalRevenue * (commissionRate / 100));
  }, [todayTotalRevenue, commissionRate]);

  const houseBalance = todayTotalRevenue - staffCommission;

  if (!isOpen || !activeBusiness) return null;

  function handleShareWhatsApp() {
    if (!activeBusiness) return;
    const msg = `💈 *${activeBusiness.name}* - Daily Shift Tally (${formatDate(todayStr)})
━━━━━━━━━━━━━━━━━━━━
👥 Total Clients Served: ${todaySales.length}
💰 Total Revenue: ${formatNgn(todayTotalRevenue)}
✂️ Staff Split (${commissionRate}%): ${formatNgn(staffCommission)}
🏢 House / Owner Split (${100 - commissionRate}%): ${formatNgn(houseBalance)}
━━━━━━━━━━━━━━━━━━━━
_Verified & tracked via RetainNG_`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-black flex items-center justify-center shadow-md text-base">
              ₦
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Daily Shift & Commission Ledger</h3>
              <p className="text-xs text-slate-400">{activeBusiness.name} • Today: {formatDate(todayStr)}</p>
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
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Motivation Banner */}
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 leading-relaxed flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong>Staff Earnings Guarantee:</strong> Every visit recorded today is tallied below. Staff and owners can verify today&apos;s commission split before cash handover at closing.
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Clients Served Today</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{todaySales.length}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Recorded visits</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Revenue Today</span>
              <p className="text-2xl font-black text-emerald-700 mt-1">{formatNgn(todayTotalRevenue)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Cash, POS, & Transfer</p>
            </div>
          </div>

          {/* Commission Split Selector */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-400">
                Staff Commission Rate
              </span>
              <span className="text-sm font-extrabold text-amber-400">{commissionRate}%</span>
            </div>

            <div className="flex gap-2">
              {[30, 40, 50].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setCommissionRate(rate)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition ${
                    commissionRate === rate
                      ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {rate}% Split
                </button>
              ))}
            </div>

            {/* Split Breakdown */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs">
              <div>
                <p className="text-slate-400 text-[11px]">Staff Payout ({commissionRate}%):</p>
                <p className="text-lg font-black text-amber-400 mt-0.5">
                  {formatNgn(staffCommission)}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">House / Shop Take ({100 - commissionRate}%):</p>
                <p className="text-lg font-black text-slate-200 mt-0.5">
                  {formatNgn(houseBalance)}
                </p>
              </div>
            </div>
          </div>

          {/* Today's Client List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Today&apos;s Client Log</span>
              <span className="text-[11px] text-slate-500">{todaySales.length} recorded</span>
            </div>

            {todaySales.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl">
                <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs text-slate-500">No visits recorded yet today.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Tap &ldquo;+ Record Sale&rdquo; to start logging today&apos;s customers.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto border border-slate-200 rounded-xl bg-white">
                {todaySales.map((sale) => (
                  <div key={sale.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                    <div>
                      <p className="font-bold text-slate-800">{sale.customer_name || 'Customer'}</p>
                      <p className="text-[11px] text-slate-500">{sale.service_or_product || 'General Service'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-700">{formatNgn(sale.amount_ngn)}</p>
                      <p className="text-[10px] text-slate-400">Commission: {formatNgn(Math.round((sale.amount_ngn * commissionRate) / 100))}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition"
          >
            Close
          </button>

          <button
            onClick={handleShareWhatsApp}
            disabled={todaySales.length === 0}
            className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Send Shift Tally via WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}
