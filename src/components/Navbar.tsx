'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getBusinesses, getActiveBusiness, setActiveBusiness } from '@/lib/storage';
import { Business } from '@/types';
import { RetainNgLogo } from './RetainNgLogo';
import {
  LayoutDashboard,
  Users,
  Receipt,
  Send,
  Settings,
  PlusCircle,
  QrCode,
  ChevronDown,
  Check,
  Bot,
  BarChart2,
  Building2,
  PieChart,
  Menu,
  X,
  Lock,
  ExternalLink,
  Printer,
} from 'lucide-react';

interface Props {
  onOpenRecordModal: () => void;
  onOpenQrModal: () => void;
  onBusinessChanged?: () => void;
}

const BIZ_ICONS: Record<string, string> = {
  barber: '💈',
  salon: '💅',
  laundry: '🧺',
  car_wash: '🚗',
  boutique: '👗',
  spa_wellness: '🧖',
  pharmacy: '💊',
  clinic: '🏥',
  other: '🏪',
};

export function Navbar({ onOpenRecordModal, onOpenQrModal, onBusinessChanged }: Props) {
  const pathname = usePathname();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBiz, setActiveBizState] = useState<Business | null>(null);
  const [clientMenuOpen, setClientMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isPublicPage = pathname?.startsWith('/opt-in') || pathname?.startsWith('/kiosk');

  function refreshBiz() {
    try {
      const list = getBusinesses();
      const current = getActiveBusiness();
      setBusinesses(list);
      setActiveBizState(current);
    } catch {
      // silent
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => refreshBiz(), 0);
    const handleSync = () => refreshBiz();
    window.addEventListener('retainng_fleet_synced', handleSync);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('retainng_fleet_synced', handleSync);
    };
  }, []);

  function handleSelectClient(id: string) {
    setActiveBusiness(id);
    refreshBiz();
    setClientMenuOpen(false);
    onBusinessChanged?.();
  }

  if (isPublicPage) return null;

  const agencyNavItems = [
    { label: 'Agency Radar', href: '/', icon: LayoutDashboard },
    { label: 'Clients & Touchpoints', href: '/customers', icon: Users },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const mobileBottomNav = [
    { label: 'Radar', href: '/', icon: LayoutDashboard },
    { label: 'Clients', href: '/customers', icon: Users },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* TOP HEADER */}
      <header className="sticky top-0 z-30 bg-slate-950 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-emerald-500/30 overflow-hidden flex items-center justify-center shadow-md shadow-emerald-950/50 group-hover:scale-105 transition">
              <RetainNgLogo className="w-7 h-7" />
            </div>
            <div className="leading-none">
              <div className="font-extrabold text-sm tracking-tight text-white">
                Retain<span className="text-emerald-400">NG</span>
              </div>
              <div className="text-[9px] text-emerald-500/80 font-bold uppercase tracking-widest">
                AI Agency
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-0.5 ml-2">
            {agencyNavItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: AI Status + Client Switcher */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Live AI badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-400 tracking-wide uppercase">AI Live</span>
            </div>

            {/* Client Switcher */}
            <div className="relative">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setClientMenuOpen(!clientMenuOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition text-xs cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-200 font-semibold max-w-[140px] truncate hidden sm:block">
                    {activeBiz?.name ?? 'All Stores (Fleet)'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
                </button>

                {activeBiz && (
                  <Link
                    href={`/portal/${activeBiz.opt_in_slug}`}
                    target="_blank"
                    title={`Open ${activeBiz.name} Portal`}
                    className="hidden lg:flex items-center gap-1 px-2 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition shadow-xs"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Portal</span>
                  </Link>
                )}
              </div>

              {clientMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setClientMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2.5 border-b border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Client Portfolio</p>
                        <p className="text-xs text-slate-300 font-semibold mt-0.5">{businesses.length} managed businesses</p>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <div className="p-1.5 space-y-0.5 max-h-64 overflow-y-auto">
                      <button
                        onClick={() => {
                          localStorage.removeItem('kudi_retention_active_biz_id');
                          refreshBiz();
                          setClientMenuOpen(false);
                          onBusinessChanged?.();
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition cursor-pointer ${
                          !activeBiz
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">🌍</span>
                          <div>
                            <div className="font-semibold text-xs">All Stores (Fleet Overview)</div>
                            <div className="text-[10px] text-slate-500">Agency Fleet Portfolio</div>
                          </div>
                        </div>
                        {!activeBiz && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </button>

                      {businesses.map((biz) => {
                        const isSelected = biz.id === activeBiz?.id;
                        const icon = BIZ_ICONS[biz.business_type] || '🏪';
                        return (
                          <div
                            key={biz.id}
                            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
                              isSelected
                                ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-300'
                                : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleSelectClient(biz.id)}
                              className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                            >
                              <span className="text-base shrink-0">{icon}</span>
                              <div className="min-w-0">
                                <div className="font-semibold text-xs truncate">{biz.name}</div>
                                <div className="text-[10px] text-slate-500 capitalize">{biz.business_type} • {biz.city}</div>
                              </div>
                            </button>
                            <div className="flex items-center gap-1 shrink-0 ml-1.5">
                              <Link
                                href={`/portal/${biz.opt_in_slug}`}
                                target="_blank"
                                onClick={() => setClientMenuOpen(false)}
                                title="Open Live Store Portal"
                                className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-700/60 rounded transition"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                              {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="border-t border-slate-800 p-2">
                      <Link
                        href="/settings"
                        onClick={() => setClientMenuOpen(false)}
                        className="w-full py-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:bg-slate-800/80 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> + Onboard New Partner
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Founder Lock Button */}
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('retainng_founder_unlocked');
                  window.location.reload();
                }
              }}
              title="Lock Radar Dashboard (PIN Protected)"
              className="hidden sm:flex items-center gap-1 px-2 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-400 border border-slate-800 rounded-lg transition text-xs cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold">Lock</span>
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile slide-down nav */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-800 bg-slate-950 px-4 py-3 space-y-1 animate-in slide-in-from-top-2 duration-150">
            {agencyNavItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <div className="pt-2 border-t border-slate-800 mt-2">
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2 text-xs font-bold text-emerald-400 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" /> + Onboard New Partner
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* MOBILE BOTTOM NAV */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950 border-t border-slate-800 px-1 py-1 shadow-2xl">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {mobileBottomNav.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            const isAI = item.label === 'AI';
            if (isAI) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative flex flex-col items-center py-1 px-2"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center -mt-5 shadow-lg transition border-2 border-slate-950 ${isActive ? 'bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                    <Bot className="w-5 h-5 text-white" />
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-950 animate-pulse" />
                  </div>
                  <span className={`text-[9px] mt-0.5 font-bold ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}>AI</span>
                </Link>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-1 px-2 rounded-lg transition ${
                  isActive ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span className="text-[9px] font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
