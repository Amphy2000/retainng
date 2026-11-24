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
  const [qrMode, setQrMode] = useState<'web' | 'whatsapp'>('whatsapp');
  const [printLayout, setPrintLayout] = useState<'stand' | 'bag_slips'>('bag_slips');

  // Customizable Stand Card Incentive Hooks (Solves "What if business doesn't want to offer discounts")
  const [incentiveType, setIncentiveType] = useState<
    | 'free_perk'
    | 'wifi'
    | 'vip'
    | 'discount'
    | 'receipt'
    | 'pharm_universal'
    | 'pharm_bp_voucher'
    | 'pharm_refill'
    | 'pharm_delivery'
    | 'pharm_care'
    | 'custom'
  >('free_perk');
  const [customBadge, setCustomBadge] = useState('🎁 EXCLUSIVE CUSTOMER PERK');
  const [customOfferText, setCustomOfferText] = useState('Scan with your phone camera to claim your Free Treatment Perk & priority booking!');

  // Presets
  function applyIncentivePreset(
    type:
      | 'free_perk'
      | 'wifi'
      | 'vip'
      | 'discount'
      | 'receipt'
      | 'pharm_universal'
      | 'pharm_bp_voucher'
      | 'pharm_refill'
      | 'pharm_delivery'
      | 'pharm_care'
      | 'custom'
  ) {
    setIncentiveType(type);
    if (type === 'pharm_universal') {
      setCustomBadge('🎁 VIP HEALTH & WELLNESS PASS');
      setCustomOfferText('Scan with your phone to claim your Free Health Check (BP/Sugar/Weight) + ₦500 Off or Free Delivery!');
    } else if (type === 'pharm_bp_voucher') {
      setCustomBadge('🩺 FREE BP & SUGAR CHECK VOUCHER');
      setCustomOfferText('Scan with phone to claim a Free Blood Pressure & Sugar Check on your next visit + VIP refill alerts!');
    } else if (type === 'pharm_refill') {
      setCustomBadge('💊 VIP REFILL & ADHERENCE');
      setCustomOfferText('Scan to get automated 28-day WhatsApp refill reminders before your routine medications finish!');
    } else if (type === 'pharm_delivery') {
      setCustomBadge('🛵 FREE HOME DELIVERY');
      setCustomOfferText('Scan to activate free doorstep delivery on your monthly routine prescriptions!');
    } else if (type === 'pharm_care') {
      setCustomBadge('🩺 PHARMACIST CLINICAL CARE');
      setCustomOfferText('Scan to register for free recovery follow-up & direct pharmacist advice!');
    } else if (type === 'free_perk') {
      setCustomBadge('🎁 EXCLUSIVE CUSTOMER PERK');
      setCustomOfferText('Scan with phone to claim your Free Treatment Perk (Hair Wash, Beard Oil, or Tyre Shine)!');
    } else if (type === 'wifi') {
      setCustomBadge('📶 FREE HIGH-SPEED WI-FI');
      setCustomOfferText('Scan with your phone to check in and unlock the High-Speed Shop Wi-Fi password!');
    } else if (type === 'vip') {
      setCustomBadge('⭐ VIP PRIORITY CLUB');
      setCustomOfferText('Scan to join our VIP List for direct weekend appointment booking and birthday gifts!');
    } else if (type === 'receipt') {
      setCustomBadge('🧾 DIGITAL RECEIPT & CARE');
      setCustomOfferText('Scan to save your digital receipt, service history, and expert aftercare instructions!');
    } else if (type === 'discount') {
      setCustomBadge('🏷️ RETURNING CLIENT DISCOUNT');
      setCustomOfferText('Scan with your phone to get ₦500 OFF your next visit and direct appointment updates!');
    } else {
      setCustomBadge('✨ SPECIAL GUEST OFFER');
      setCustomOfferText('Scan with phone camera to register your visit and receive appointment updates!');
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setShowPrintCard(initialShowPrintCard);
      const biz = getActiveBusiness();
      setBusiness(biz);

      if (!biz) return; // Guard: no active business yet

      const isPharmacy = biz.business_type === 'pharmacy' || biz.name.toLowerCase().includes('pharm');
      if (isPharmacy && (incentiveType === 'free_perk' || incentiveType === 'pharm_refill' || incentiveType === 'pharm_bp_voucher')) {
        applyIncentivePreset('pharm_universal');
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const webUrl = `${origin}/opt-in/${biz.opt_in_slug}`;

      let finalUrl = webUrl;
      if (qrMode === 'whatsapp') {
        const useConcierge = biz.whatsapp_routing_mode === 'agency_concierge' && biz.concierge_phone;
        const targetNumber = useConcierge ? biz.concierge_phone! : (biz.phone || '08000000000');
        const digits = targetNumber.replace(/\D/g, '');
        const intlPhone = digits.startsWith('0') ? `234${digits.slice(1)}` : digits;
        const msg = isPharmacy
          ? `Hello! I want to enroll for VIP Refill Reminders and Care with ${biz.name}. [ref:${biz.opt_in_slug}]`
          : `Hello! I am checking in with ${biz.name} for VIP perks! [ref:${biz.opt_in_slug}]`;
        finalUrl = `https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`;
      }

      setOptInUrl(finalUrl);

      QRCode.toDataURL(
        finalUrl,
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
  }, [isOpen, qrMode, initialShowPrintCard]);

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
    <div id="print-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto print:static print:bg-white print:p-0 print:overflow-visible">
      <div
        id="print-modal-container"
        className="bg-white w-full max-w-md max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col my-auto overflow-hidden animate-in zoom-in-95 duration-100 print:shadow-none print:border-none print:max-w-none print:w-full print:m-0 print:max-h-none print:overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">Customer Opt-In QR</h3>
              <p className="text-[11px] text-slate-400">Put this on your counter or send via WhatsApp</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Destination Mode Selector */}
        <div className="bg-slate-100 p-1.5 flex items-center gap-1.5 border-b border-slate-200 shrink-0 print:hidden">
          <button
            type="button"
            onClick={() => setQrMode('web')}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              qrMode === 'web'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🌐 Web Form Stand</span>
          </button>
          <button
            type="button"
            onClick={() => setQrMode('whatsapp')}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              qrMode === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            <span>💬 1-Tap WhatsApp Stand</span>
          </button>
        </div>

        {/* Content */}
        {showPrintCard ? (
          <div className="p-4 sm:p-5 text-center space-y-3.5 overflow-y-auto flex-1 print:p-0 print:overflow-visible">
            {/* Print Format Toggle: Stand vs Bag Slips */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold print:hidden">
              <button
                type="button"
                onClick={() => setPrintLayout('stand')}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                  printLayout === 'stand' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🪧 Counter Stand (Table Tent)
              </button>
              <button
                type="button"
                onClick={() => setPrintLayout('bag_slips')}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                  printLayout === 'bag_slips' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                📄 Bag Slips (4-in-1 A4 Page)
              </button>
            </div>

            {/* Customizable Incentive Hook Bar */}
            <div className="text-left space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 print:hidden">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                Choose Customer Hook (No discount required!):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  ...(business.business_type === 'pharmacy' || business.name.toLowerCase().includes('pharm')
                    ? [
                        { id: 'pharm_universal', label: '🎁 Universal VIP Pass' },
                        { id: 'pharm_bp_voucher', label: '🩺 Free BP/Sugar Check' },
                        { id: 'pharm_refill', label: '💊 Refill Reminders' },
                        { id: 'pharm_delivery', label: '🛵 Home Delivery' },
                        { id: 'pharm_care', label: '🩺 Clinical Care' },
                      ]
                    : []),
                  { id: 'free_perk', label: '🎁 Free Treatment Perk' },
                  { id: 'wifi', label: '📶 Free Wi-Fi' },
                  { id: 'vip', label: '⭐ VIP Priority' },
                  { id: 'receipt', label: '🧾 Digital Receipt' },
                  { id: 'discount', label: '🏷️ ₦500 Discount' },
                  { id: 'custom', label: '✏️ Custom' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      applyIncentivePreset(
                        item.id as
                          | 'free_perk'
                          | 'wifi'
                          | 'vip'
                          | 'discount'
                          | 'receipt'
                          | 'pharm_refill'
                          | 'pharm_delivery'
                          | 'pharm_care'
                          | 'custom'
                      )
                    }
                    className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition cursor-pointer ${
                      incentiveType === item.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Custom Input */}
              <div className="pt-1">
                <input
                  type="text"
                  value={customOfferText}
                  onChange={(e) => setCustomOfferText(e.target.value)}
                  placeholder="Custom offer or hook text..."
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
            </div>

            {/* The Actual Printable Canvas */}
            {printLayout === 'stand' ? (
              <div className="a4-stand-card border-4 border-slate-900 rounded-3xl p-5 bg-white shadow-lg space-y-2.5 print:border-black print:shadow-none">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-black text-base flex items-center justify-center mx-auto">
                  ₦
                </div>
                <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900">
                  {business.name}
                </h2>
                <div className="py-0.5 px-3 bg-emerald-50 rounded-full inline-block border border-emerald-200">
                  <span className="text-[11px] font-bold text-emerald-800">
                    {customBadge}
                  </span>
                </div>
                <p className="text-xs text-slate-700 max-w-xs mx-auto font-medium leading-relaxed">
                  {customOfferText}
                </p>

                {/* QR Code */}
                <div className="p-2.5 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl inline-block">
                  {qrDataUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrDataUrl}
                      alt={`Counter QR for ${business.name}`}
                      className="w-40 h-40 sm:w-44 sm:h-44 mx-auto"
                    />
                  )}
                </div>

                <div className="text-[10px] text-slate-500 font-medium space-y-1">
                  <div>Point phone camera here • No app download required</div>
                  <div className="pt-2 border-t border-slate-200 text-[9px] text-slate-400 font-semibold flex items-center justify-between">
                    <span>⚡ Powered by <strong>RetainNG AI</strong></span>
                    <span>Want this for your business? Call/WhatsApp: <strong>+234 916 915 3129</strong></span>
                  </div>
                </div>
              </div>
            ) : (
              /* 4-per-A4 Bag Slips Layout */
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500 font-medium text-left print:hidden">
                  ✂️ <strong>Prescription Bag Slips:</strong> Print and cut into 4 slips. Staff simply drops one slip into the patient&apos;s medicine bag at checkout. Zero staff typing!
                </p>
                <div className="a4-printable-slips grid grid-cols-2 gap-3 p-1 rounded-2xl bg-white print:p-0">
                  {[1, 2, 3, 4].map((slip) => (
                    <div
                      key={slip}
                      className="a4-slip-item border-2 border-dashed border-slate-400 rounded-2xl p-3 bg-white text-center flex flex-col justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                          <span>✂ Cut Line</span>
                          <span>Prescription Companion</span>
                        </div>
                        <div className="text-xs font-black uppercase tracking-tight text-slate-900 truncate">
                          {business.name}
                        </div>
                        <div className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block">
                          {customBadge}
                        </div>
                      </div>

                      {business.business_type === 'pharmacy' || business.name.toLowerCase().includes('pharm') ? (
                        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-lg p-1.5 text-left space-y-0.5 text-[8px] text-slate-800 my-0.5">
                          <div className="flex items-start gap-1 font-bold text-emerald-900">
                            <span className="text-emerald-600 font-black">🎙️</span>
                            <span>Voice Notes (Hausa, Yoruba, Igbo, English)</span>
                          </div>
                          <div className="flex items-start gap-1 font-bold text-emerald-900">
                            <span className="text-emerald-600 font-black">📸</span>
                            <span>Snap Photo of Empty Pack or Rx</span>
                          </div>
                          <div className="flex items-start gap-1 font-bold text-emerald-900">
                            <span className="text-emerald-600 font-black">🚚</span>
                            <span>Refill Countdown Timers &amp; Doorstep Delivery</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[9px] text-slate-700 leading-tight font-medium px-1 my-0.5">
                          {customOfferText}
                        </p>
                      )}

                      <div className="py-0.5">
                        {qrDataUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={qrDataUrl}
                            alt="Bag QR"
                            className="w-18 h-18 sm:w-20 sm:h-20 mx-auto border border-slate-300 rounded-xl p-0.5 bg-white shadow-xs"
                          />
                        )}
                        <div className="text-[8.5px] font-extrabold text-emerald-800 mt-0.5">
                          📲 Scan with WhatsApp Camera
                        </div>
                      </div>

                      <div className="text-[7.5px] text-slate-500 border-t border-slate-200 pt-0.5 font-semibold space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span>✓ Free Patient Care Service</span>
                          <span>Keep with your medications</span>
                        </div>
                        <div className="text-[7px] text-slate-400 font-medium flex items-center justify-between pt-0.5 border-t border-dashed border-slate-200">
                          <span>⚡ Powered by <strong>RetainNG AI</strong></span>
                          <span>WhatsApp: <strong>+234 916 915 3129</strong></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1 print:hidden">
              <button
                type="button"
                onClick={() => setShowPrintCard(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Back to QR Details
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{printLayout === 'stand' ? 'Print Stand Card' : 'Print 4 Bag Slips'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 text-center space-y-3.5 overflow-y-auto flex-1">
            <div className="bg-slate-50 border-2 border-dashed border-emerald-500/40 p-2.5 rounded-2xl inline-block shadow-inner mx-auto">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt={`Opt-in QR for ${business.name}`}
                  className="w-44 h-44 sm:w-48 sm:h-48 mx-auto rounded-xl shadow-xs"
                />
              ) : (
                <div className="w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center text-xs text-slate-400">
                  Generating QR code...
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm sm:text-base font-bold text-slate-900">{business.name}</h4>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-0.5">
                Customers scan to self-register and consent to receive appointment reminders and offers.
              </p>
            </div>

            {/* Link Copy Box */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200 text-left">
              <input
                type="text"
                readOnly
                value={optInUrl}
                className="bg-transparent text-xs text-slate-700 font-mono w-full px-2 outline-none select-all truncate"
              />
              <button
                onClick={handleCopy}
                className="shrink-0 px-2.5 py-1 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-1 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <Link
                href={`/opt-in/${business.opt_in_slug}`}
                target="_blank"
                className="py-2 px-3 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Test Web Form</span>
              </Link>

              <button
                onClick={() => setShowPrintCard(true)}
                className="py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Stand Card</span>
              </button>
            </div>

            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-left text-[11px] text-emerald-900 leading-relaxed">
              <Sparkles className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
              <strong>Consent Guarantee:</strong> Every customer who signs up through this page explicitly ticks a marketing consent checkbox. Their consent timestamp and source are logged automatically.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
