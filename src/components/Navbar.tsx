'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getBusinesses, getActiveBusiness, setActiveBusiness } from '@/lib/storage';
import { Business } from '@/types';
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
    return () => clearTimeout(timer);
  }, []);

  function handleSelectClient(id: string) {
    setActiveBusiness(id);
    refreshBiz();
    setClientMenuOpen(false);
    onBusinessChanged?.();
  }

  if (isPublicPage) return null;

  const agencyNavItems = [
    { label: 'Agency HQ', href: '/', icon: LayoutDashboard },
    { label: 'AI Center', href: '/campaigns', icon: Bot },
    { label: 'Customers', href: '/customers', icon: Users },
    { label: 'Segments', href: '/segments', icon: PieChart },
    { label: 'Analytics', href: '/sales', icon: BarChart2 },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const mobileBottomNav = [
    { label: 'HQ', href: '/', icon: LayoutDashboard },
    { label: 'AI', href: '/campaigns', icon: Bot },
    { label: 'Clients', href: '/customers', icon: Users },
    { label: 'Analytics', href: '/sales', icon: BarChart2 },
    { label: 'More', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* TOP HEADER */}
      <header className="sticky top-0 z-30 bg-slate-950 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-emerald-500/30 overflow-hidden flex items-center justify-center shadow-md shadow-emerald-950/50 group-hover:scale-105 transition">
              <svg viewBox="0 0 600 600" className="w-7 h-7" fill="none">
                <circle cx="300" cy="300" r="280" fill="#06140e" />
                <path
                  d="M 185 140 L 245 140 C 250 140 254 144 254 149 L 254 445 C 254 453 247 460 239 460 L 190 460 C 182 460 176 453 176 445 L 176 149 Z"
                  fill="#10B981"
                />
                <path
                  d="M 235 140 L 345 140 C 410 140 455 178 455 242 C 455 305 408 344 340 344 L 235 344 Z"
                  fill="#06B6D4"
                />
                <path
                  d="M 310 325 L 380 325 C 395 325 408 333 416 345 L 472 436 C 479 448 471 460 457 460 L 398 460 C 388 460 378 454 372 444 L 326 372 C 320 363 313 358 300 358 L 254 358 L 254 325 Z"
                  fill="#10B981"
                />
                <circle cx="445" cy="180" r="26" fill="#061A12" stroke="#34D399" stroke-width="4" />
                <path d="M 445 168 L 445 192 M 433 180 L 457 180" stroke="#34D399" stroke-width="5" stroke-linecap="round" />
              </svg>
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
              <button
                onClick={() => setClientMenuOpen(!clientMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition text-xs cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-200 font-semibold max-w-[120px] truncate hidden sm:block">
                  {activeBiz?.name ?? 'Select Client'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
              </button>

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
                      {businesses.map((biz) => {
                        const isSelected = biz.id === activeBiz?.id;
                        const icon = BIZ_ICONS[biz.business_type] || '🏪';
                        return (
                          <button
                            key={biz.id}
                            onClick={() => handleSelectClient(biz.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                                : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-base">{icon}</span>
                              <div>
                                <div className="font-semibold text-xs">{biz.name}</div>
                                <div className="text-[10px] text-slate-500 capitalize">{biz.business_type} • {biz.city}</div>
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="border-t border-slate-800 p-2 flex gap-2">
                      <button
                        onClick={() => { onOpenQrModal(); setClientMenuOpen(false); }}
                        className="flex-1 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" /> Counter QR
                      </button>
                      <button
                        onClick={() => { onOpenRecordModal(); setClientMenuOpen(false); }}
                        className="flex-1 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> Log Visit
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

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
            <div className="flex gap-2 pt-2 border-t border-slate-800 mt-2">
              <button
                onClick={() => { onOpenQrModal(); setMobileMenuOpen(false); }}
                className="flex-1 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <QrCode className="w-4 h-4" /> Counter QR
              </button>
              <button
                onClick={() => { onOpenRecordModal(); setMobileMenuOpen(false); }}
                className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" /> Log Visit
              </button>
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
