'use client';

import React, { useState, useEffect } from 'react';
import { getBusinesses, getActiveBusiness, setActiveBusiness, resetDemoData, clearBusinessData } from '@/lib/storage';
import { Business } from '@/types';
import { RefreshCw, Trash2, ChevronDown, Check, Sparkles, Store } from 'lucide-react';

interface Props {
  onBusinessChanged?: () => void;
}

export function DemoSwitcher({ onBusinessChanged }: Props) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBiz, setActiveBiz] = useState<Business | null>(null);
  const [open, setOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  function refresh() {
    const list = getBusinesses();
    const current = getActiveBusiness();
    setBusinesses(list);
    setActiveBiz(current);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  function handleSelect(id: string) {
    setActiveBusiness(id);
    refresh();
    setOpen(false);
    showToast('Switched business');
    onBusinessChanged?.();
  }

  function handleReset() {
    if (confirm('Reset sample demo data back to defaults?')) {
      resetDemoData();
      refresh();
      showToast('Demo data reset to defaults');
      onBusinessChanged?.();
    }
  }

  function handleClear() {
    if (!activeBiz) return;
    if (confirm(`Remove all customers and sales for "${activeBiz.name}" to start with a blank database?`)) {
      clearBusinessData(activeBiz.id);
      refresh();
      showToast('Database cleared. Ready for your own data!');
      onBusinessChanged?.();
    }
  }

  if (!activeBiz) return null;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-slate-900 text-slate-100 text-xs px-3 py-1.5 rounded-lg border border-slate-700 shadow-sm">
        <div className="flex items-center gap-1.5 font-medium">
          <Store className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline text-slate-400">Business:</span>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1 text-white hover:text-emerald-400 font-semibold cursor-pointer max-w-[160px] truncate"
          >
            <span className="truncate">{activeBiz.name}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </button>
        </div>

        <div className="h-3 w-px bg-slate-700 mx-1 hidden sm:block" />

        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={handleReset}
            title="Reset to realistic Nigerian demo records"
            className="flex items-center gap-1 text-slate-300 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-3 h-3 text-amber-400" />
            <span>Reset Demo</span>
          </button>
          <button
            onClick={handleClear}
            title="Wipe demo records and start fresh"
            className="flex items-center gap-1 text-slate-300 hover:text-rose-400 px-2 py-0.5 rounded hover:bg-slate-800 transition"
          >
            <Trash2 className="w-3 h-3 text-rose-400" />
            <span>Clear Data</span>
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Switch Demo Business</span>
              <span className="text-emerald-600 font-normal">Nigerian SME Examples</span>
            </div>

            <div className="space-y-1 mt-1">
              {businesses.map((biz) => {
                const isSelected = biz.id === activeBiz.id;
                return (
                  <button
                    key={biz.id}
                    onClick={() => handleSelect(biz.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition ${
                      isSelected ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="capitalize">{biz.name}</span>
                        {biz.is_demo && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-normal">
                            Sample
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 capitalize">{biz.business_type} • {biz.city}</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-slate-100 mt-2 pt-2 space-y-1">
              <button
                onClick={handleReset}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                <span>Reload Nigerian sample data</span>
              </button>
              <button
                onClick={handleClear}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Wipe records to use with your real business</span>
              </button>
            </div>
          </div>
        </>
      )}

      {toastMsg && (
        <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
