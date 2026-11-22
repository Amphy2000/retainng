'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DemoSwitcher } from './DemoSwitcher';
import {
  LayoutDashboard,
  Users,
  Receipt,
  PieChart,
  Send,
  Settings,
  PlusCircle,
  QrCode,
} from 'lucide-react';

interface Props {
  onOpenRecordModal: () => void;
  onOpenQrModal: () => void;
  onBusinessChanged?: () => void;
}

export function Navbar({ onOpenRecordModal, onOpenQrModal, onBusinessChanged }: Props) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Customers', href: '/customers', icon: Users },
    { label: 'Visits & Sales', href: '/sales', icon: Receipt },
    { label: 'Segments', href: '/segments', icon: PieChart },
    { label: 'Campaigns', href: '/campaigns', icon: Send },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Desktop & Mobile Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-500 text-white flex items-center justify-center font-black text-lg shadow-md group-hover:scale-105 transition">
                ₦
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-slate-900 group-hover:text-emerald-700 transition">
                  Retain<span className="text-emerald-600">NG</span>
                </span>
                <span className="block text-[10px] text-slate-500 font-medium tracking-wide uppercase">
                  SME Customer Engine
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Demo Switcher */}
            <DemoSwitcher onBusinessChanged={onBusinessChanged} />

            {/* Counter QR code button */}
            <button
              onClick={onOpenQrModal}
              title="Display Customer Opt-In QR"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition"
            >
              <QrCode className="w-4 h-4 text-slate-600" />
              <span>Counter QR</span>
            </button>

            {/* Desktop Primary CTA: + Record Sale/Visit */}
            <button
              onClick={onOpenRecordModal}
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-md transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Record Sale</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sticky Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1 shadow-lg pb-safe">
        <div className="flex items-center justify-around max-w-md mx-auto relative">
          <Link
            href="/"
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition ${
              pathname === '/' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span>Home</span>
          </Link>

          <Link
            href="/customers"
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition ${
              pathname === '/customers' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span>Customers</span>
          </Link>

          {/* Prominent Center Action: + Record */}
          <button
            onClick={onOpenRecordModal}
            className="-mt-5 w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg hover:bg-emerald-700 active:scale-95 transition cursor-pointer border-2 border-white"
            aria-label="Record Sale or Visit"
          >
            <PlusCircle className="w-6 h-6" />
          </button>

          <Link
            href="/segments"
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition ${
              pathname === '/segments' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <PieChart className="w-5 h-5 mb-0.5" />
            <span>Segments</span>
          </Link>

          <Link
            href="/campaigns"
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition ${
              pathname === '/campaigns' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Send className="w-5 h-5 mb-0.5" />
            <span>Campaigns</span>
          </Link>
        </div>
      </div>
    </>
  );
}
