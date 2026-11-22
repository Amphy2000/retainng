'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { getActiveBusiness } from '@/lib/storage';
import { Business } from '@/types';
import { X, QrCode, Copy, Check, ExternalLink, Printer, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialShowPrintCard?: boolean;
}

export function QrCodeModal({ isOpen, onClose, initialShowPrintCard = false }: Props) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [optInUrl, setOptInUrl] = useState<string>('');
  const [showPrintCard, setShowPrintCard] = useState(initialShowPrintCard);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setShowPrintCard(initialShowPrintCard);
      const biz = getActiveBusiness();
      setBusiness(biz);

      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const fullUrl = `${origin}/opt-in/${biz.opt_in_slug}`;
      setOptInUrl(fullUrl);

      QRCode.toDataURL(
        fullUrl,
        {
          width: 320,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (err, url) => {
          if (!err && url) {
            setQrDataUrl(url);
          }
        }
      );
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen || !business) return null;

  function handleCopy() {
    navigator.clipboard.writeText(optInUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Customer Opt-In QR</h3>
              <p className="text-xs text-slate-400">Put this on your counter or send via WhatsApp</p>
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
        {showPrintCard ? (
          <div className="p-6 text-center space-y-4 overflow-y-auto">
            {/* The Actual Printable Tent Card Canvas */}
            <div className="border-4 border-slate-900 rounded-3xl p-6 bg-white shadow-lg space-y-3 print:border-black print:m-0">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black text-lg flex items-center justify-center mx-auto">
                ₦
              </div>
              <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">
                {business.name}
              </h2>
              <div className="py-1 px-3 bg-emerald-50 rounded-full inline-block border border-emerald-200">
                <span className="text-xs font-bold text-emerald-800">
                  ✨ ENJOYING YOUR SERVICE TODAY?
                </span>
              </div>
              <p className="text-xs text-slate-600 max-w-xs mx-auto font-medium">
                Scan with your phone to get <strong className="text-slate-900">₦500 OFF</strong> your next visit and direct appointment updates!
              </p>

              {/* QR Code */}
              <div className="p-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl inline-block">
                {qrDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt={`Counter QR for ${business.name}`}
                    className="w-48 h-48 mx-auto"
                  />
                )}
              </div>

              <div className="text-[11px] text-slate-500 font-medium">
                Point phone camera here • No app download required
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPrintCard(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Back to QR Details
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print This Card</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center space-y-4">
          <div className="bg-slate-50 border-2 border-dashed border-emerald-500/40 p-4 rounded-2xl inline-block shadow-inner mx-auto">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={`Opt-in QR for ${business.name}`}
                className="w-56 h-56 mx-auto rounded-xl shadow-xs"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-400">
                Generating QR code...
              </div>
            )}
          </div>

          <div>
            <h4 className="text-base font-bold text-slate-900">{business.name}</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
              Customers scan to self-register and consent to receive appointment reminders and offers.
            </p>
          </div>

          {/* Link Copy Box */}
          <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-xl border border-slate-200 text-left">
            <input
              type="text"
              readOnly
              value={optInUrl}
              className="bg-transparent text-xs text-slate-700 font-mono w-full px-2 outline-none select-all truncate"
            />
            <button
              onClick={handleCopy}
              className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-1 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Link
              href={`/opt-in/${business.opt_in_slug}`}
              target="_blank"
              className="py-2 px-3 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Test Customer Form</span>
            </Link>

            <button
              onClick={() => setShowPrintCard(true)}
              className="py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Printable Stand Card</span>
            </button>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-left text-[11px] text-emerald-900 leading-relaxed">
            <Sparkles className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
            <strong>Consent Guarantee:</strong> Every customer who signs up through this page explicitly ticks a marketing consent checkbox. Their consent timestamp and source are logged automatically.
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
