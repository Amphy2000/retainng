'use client';

import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, ArrowRight, KeyRound } from 'lucide-react';

const FOUNDER_PIN = '202600';
const STORAGE_KEY = 'retainng_founder_unlocked';

export function FounderLock({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isSaved = localStorage.getItem(STORAGE_KEY) === 'true';
    if (isSaved) {
      setUnlocked(true);
    }
  }, []);

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (pin.trim() === FOUNDER_PIN) {
      localStorage.setItem(STORAGE_KEY, 'true');
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setPin('');
    }
  }

  if (!mounted) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
      <div className="max-w-sm w-full bg-slate-900 border border-slate-800 rounded-3xl p-7 text-center space-y-6 shadow-2xl shadow-emerald-500/10">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-inner">
          <KeyRound className="w-8 h-8 text-emerald-400" />
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
            Founder Access Control
          </div>
          <h1 className="text-xl font-black text-white">Unlock Agency Radar</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Enter your 6-digit Founder PIN to access agency finances, partner management, and confidential MRR analytics.
          </p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="space-y-1.5">
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/[^0-9]/g, ''));
                if (error) setError(false);
              }}
              placeholder="••••••"
              className={`w-full py-3 text-center text-2xl font-mono tracking-[0.5em] bg-slate-950 border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition ${
                error ? 'border-rose-500 ring-2 ring-rose-500/30' : 'border-slate-800'
              }`}
            />
            {error && (
              <p className="text-[11px] text-rose-400 font-medium">
                Incorrect PIN. Please try again.
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Unlock Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 space-y-2">
          <p className="flex items-center justify-center gap-1 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Client portals &amp; QR bag slips remain 100% public</span>
          </p>
          <p className="text-slate-600 font-mono">Default Founder PIN: 202600</p>
          <div className="pt-2 border-t border-slate-800/50">
            <a
              href="/onboard"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold inline-flex items-center gap-1 transition"
            >
              <span>Are you a pharmacy owner? Launch 14-Day Free Pilot →</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
