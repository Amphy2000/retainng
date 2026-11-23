'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { Download, Check, Sparkles, Smartphone, ShieldCheck, ArrowLeft, Palette, Copy } from 'lucide-react';

export default function BrandKitPage() {
  const [downloading, setDownloading] = useState(false);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const colors = [
    { name: 'Obsidian Midnight', hex: '#060911', usage: 'Dark background & canvas' },
    { name: 'Electric Emerald', hex: '#10B981', usage: 'Primary brand neon & icon' },
    { name: 'Cyan Highlight', hex: '#06B6D4', usage: 'Secondary clinical retention gradient' },
    { name: 'Mint Luminescence', hex: '#34D399', usage: 'Active nodes & glow accents' },
    { name: 'Deep Pine', hex: '#064E3B', usage: 'Card surfaces & subtle borders' },
  ];

  function copyHex(hex: string) {
    navigator.clipboard.writeText(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 2000);
  }

  // Generate ultra-crisp 1024x1024 PNG on the fly using HTML5 Canvas
  function handleDownloadPng(size = 1024) {
    setDownloading(true);

    const svgElement = document.getElementById('retainng-master-svg');
    if (!svgElement) {
      setDownloading(false);
      return;
    }

    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fill rich dark obsidian background
      ctx.fillStyle = '#060911';
      ctx.fillRect(0, 0, size, size);

      // Subtle radial ambient glow
      const gradient = ctx.createRadialGradient(size / 2, size / 2, 50, size / 2, size / 2, size / 1.5);
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
      gradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.08)');
      gradient.addColorStop(1, 'rgba(6, 9, 17, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      // Draw SVG emblem
      ctx.drawImage(image, 0, 0, size, size);

      // Trigger automatic file download
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `retainng-official-avatar-${size}x${size}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(blobURL);
      setDownloading(false);
    };

    image.src = blobURL;
  }

  function handleDownloadSvg() {
    const svgElement = document.getElementById('retainng-master-svg');
    if (!svgElement) return;
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'retainng-master-emblem.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 space-y-8">
      {/* Top Header */}
      <div className="max-w-5xl mx-auto flex items-center justify-between border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Brand Identity Hub
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Retain<span className="text-emerald-400">NG</span> Official Logo &amp; Assets
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownloadPng(1024)}
            disabled={downloading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-950 flex items-center gap-2 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Exporting PNG...' : 'Download WhatsApp Avatar (1024x1024)'}</span>
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Master Emblem & Downloads */}
        <div className="lg:col-span-7 space-y-6">
          <div className="relative p-8 rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800/80 shadow-2xl flex flex-col items-center justify-center overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

            {/* The Master SVG Logo */}
            <svg
              id="retainng-master-svg"
              viewBox="0 0 600 600"
              className="w-72 h-72 sm:w-88 sm:h-88 relative z-10 filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.8)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <radialGradient id="bgAmbient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="#0f2e22" />
                  <stop offset="60%" stop-color="#06120e" />
                  <stop offset="100%" stop-color="#030707" />
                </radialGradient>

                <linearGradient id="neonEmerald" x1="100" y1="120" x2="480" y2="480" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#34D399" />
                  <stop offset="50%" stop-color="#10B981" />
                  <stop offset="100%" stop-color="#059669" />
                </linearGradient>

                <linearGradient id="cyanTeal" x1="220" y1="100" x2="500" y2="380" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#2DD4BF" />
                  <stop offset="50%" stop-color="#06B6D4" />
                  <stop offset="100%" stop-color="#0284C7" />
                </linearGradient>

                <linearGradient id="bevelLight" x1="150" y1="100" x2="450" y2="500" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.8" />
                  <stop offset="50%" stop-color="#A7F3D0" stop-opacity="0.15" />
                  <stop offset="100%" stop-color="#064E3B" stop-opacity="0.05" />
                </linearGradient>

                <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Obsidian Base Medallion */}
              <circle cx="300" cy="300" r="275" fill="url(#bgAmbient)" stroke="#10B981" stroke-width="2.5" stroke-opacity="0.35" />
              <circle cx="300" cy="300" r="248" stroke="#34D399" stroke-width="1" stroke-opacity="0.15" stroke-dasharray="10 8" />

              {/* Master 'R' Retention Loop */}
              <g filter="url(#neonGlow)">
                {/* Vertical Spine */}
                <path
                  d="M 185 140 L 245 140 C 250 140 254 144 254 149 L 254 445 C 254 453 247 460 239 460 L 190 460 C 182 460 176 453 176 445 L 176 149 C 176 144 180 140 185 140 Z"
                  fill="url(#neonEmerald)"
                />
                {/* Spine Light Accent */}
                <path d="M 186 148 L 194 148 L 194 452 L 186 452 Z" fill="#FFFFFF" fill-opacity="0.5" />

                {/* Upper Retention Arc Loop */}
                <path
                  d="M 235 140 L 345 140 C 410 140 455 178 455 242 C 455 305 408 344 340 344 L 235 344 Z"
                  fill="url(#cyanTeal)"
                />
                <path
                  d="M 254 200 L 335 200 C 368 200 392 216 392 242 C 392 268 368 284 335 284 L 254 284 Z"
                  fill="#040C08"
                  stroke="#34D399"
                  stroke-width="2"
                  stroke-opacity="0.4"
                />

                {/* Forward Momentum Kick Leg */}
                <path
                  d="M 310 325 L 380 325 C 395 325 408 333 416 345 L 472 436 C 479 448 471 460 457 460 L 398 460 C 388 460 378 454 372 444 L 326 372 C 320 363 313 358 300 358 L 254 358 L 254 325 Z"
                  fill="url(#neonEmerald)"
                />

                {/* Clinical Plus / Health Badge */}
                <circle cx="445" cy="180" r="26" fill="#061A12" stroke="#34D399" stroke-width="3" />
                <path d="M 445 168 L 445 192 M 433 180 L 457 180" stroke="#34D399" stroke-width="4.5" stroke-linecap="round" />

                {/* Active Pulse Node */}
                <circle cx="465" cy="450" r="8" fill="#34D399" />
                <circle cx="465" cy="450" r="18" fill="#10B981" fill-opacity="0.3" />
              </g>

              {/* Top Glassmorphic Specular Reflection */}
              <path
                d="M 176 160 C 220 145 340 142 420 185 C 380 180 260 180 176 210 Z"
                fill="url(#bevelLight)"
              />
            </svg>

            {/* Emblem Caption */}
            <div className="mt-4 text-center z-10">
              <span className="text-[11px] font-mono text-emerald-400 font-semibold tracking-wider uppercase block">
                Official Master Emblem (1:1 Ratio)
              </span>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Interlocking modern <strong>&apos;R&apos;</strong> fused with an infinite customer retention loop &amp; clinical health badge.
              </p>
            </div>
          </div>

          {/* Action Download Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleDownloadPng(1024)}
              disabled={downloading}
              className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 transition flex items-center justify-between text-left group cursor-pointer"
            >
              <div>
                <span className="font-bold text-sm text-white group-hover:text-emerald-400 transition block">
                  WhatsApp Avatar (PNG)
                </span>
                <span className="text-xs text-slate-400">1024 &times; 1024px &bull; Crisp Profile Avatar</span>
              </div>
              <Download className="w-5 h-5 text-emerald-400 shrink-0 ml-2" />
            </button>

            <button
              onClick={handleDownloadSvg}
              className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-teal-500/50 transition flex items-center justify-between text-left group cursor-pointer"
            >
              <div>
                <span className="font-bold text-sm text-white group-hover:text-teal-400 transition block">
                  Vector Asset (SVG)
                </span>
                <span className="text-xs text-slate-400">Scalable vector for web &amp; print</span>
              </div>
              <Download className="w-5 h-5 text-teal-400 shrink-0 ml-2" />
            </button>
          </div>
        </div>

        {/* Right Column: Live WhatsApp Avatar Simulation & Color Palette */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live WhatsApp Profile Preview */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">Live WhatsApp Avatar Simulation</h3>
            </div>
            <p className="text-xs text-slate-400">
              Here is how your brand appears on clients&apos; phones inside WhatsApp chats:
            </p>

            {/* Mock WhatsApp Chat Header */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-3">
              {/* Circular Avatar Crop */}
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-500 shadow-lg shadow-emerald-950/60 shrink-0 bg-slate-900 flex items-center justify-center">
                <svg viewBox="0 0 600 600" className="w-full h-full scale-110" fill="none">
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

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-white truncate">RetainNG Health Concierge</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                </div>
                <div className="text-[11px] text-emerald-400 font-medium">Official Business Account &bull; Online</div>
              </div>
            </div>

            {/* Mock Message Bubble */}
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-xs text-slate-200 leading-relaxed font-sans">
              <span className="font-bold text-emerald-300 block mb-0.5">RetainNG Concierge:</span>
              &ldquo;Good afternoon Alhaji Musa! Danfodio Pharmacy has your Amlodipine refill packed and ready for delivery.&rdquo;
            </div>
          </div>

          {/* Color Palette */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Brand Color Palette</h3>
              </div>
              <span className="text-[10px] text-slate-500">Click to copy hex</span>
            </div>

            <div className="space-y-2">
              {colors.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => copyHex(c.hex)}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 transition text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 rounded-lg border border-white/20 shrink-0 shadow-inner"
                      style={{ backgroundColor: c.hex }}
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">{c.name}</span>
                      <span className="text-[10px] text-slate-400">{c.usage}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-300">
                    <span>{c.hex}</span>
                    {copiedColor === c.hex ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
