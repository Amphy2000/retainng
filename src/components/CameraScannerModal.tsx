'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Customer, Business } from '@/types';
import { getCustomers, getActiveBusiness, recordSale } from '@/lib/storage';
import { X, Camera, CheckCircle2, AlertCircle, Sparkles, User, Zap } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CameraScannerModal({ isOpen, onClose, onSuccess }: Props) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scannedCustomer, setScannedCustomer] = useState<Customer | null>(null);
  const [scannedSuccess, setScannedSuccess] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setScannedCustomer(null);
      setScannedSuccess(null);
      setManualCode('');
      return;
    }

    const biz = getActiveBusiness();
    setBusiness(biz);
    setCustomers(getCustomers(biz.id));

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  async function startCamera() {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access not supported on this browser. You can enter phone or code below.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      console.warn('Camera stream error:', err);
      setCameraError('Camera permission not granted. Use the quick phone/code lookup below!');
      setCameraActive(false);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }

  function handleCodeMatched(code: string) {
    const clean = code.trim().toLowerCase();
    if (!clean) return;

    // Match customer by phone, ID, or name
    const found = customers.find(
      (c) =>
        c.phone.replace(/\D/g, '').endsWith(clean.replace(/\D/g, '').slice(-10)) ||
        c.id.toLowerCase().includes(clean) ||
        (c.full_name && c.full_name.toLowerCase().includes(clean))
    );

    if (found) {
      setScannedCustomer(found);
      executeQuickLog(found);
    } else {
      setCameraError(`No customer found matching "${code}". Try entering full phone number.`);
    }
  }

  function executeQuickLog(cust: Customer) {
    if (!business) return;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      recordSale(business.id, {
        customer_id: cust.id,
        amount_ngn: 5000,
        visit_date: todayStr,
        service_or_product: 'Scanned Visit (Counter)',
      });

      setScannedSuccess(`Visit successfully logged for ${cust.full_name}!`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Scan log error:', err);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-950 text-white w-full max-w-md rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Staff Camera Scanner</h3>
              <p className="text-[11px] text-slate-400">Scan customer QR, barcode, or enter phone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="p-4 space-y-4">
          {scannedSuccess ? (
            <div className="bg-emerald-900/40 border-2 border-emerald-500/60 rounded-2xl p-6 text-center space-y-3 animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-lg font-black text-white">Customer Identified!</h4>
              <p className="text-emerald-300 font-bold">{scannedCustomer?.full_name}</p>
              <p className="text-xs text-slate-300">Visit recorded • 0 manual bookkeeping needed!</p>
            </div>
          ) : (
            <div className="relative aspect-video sm:aspect-square bg-slate-900 rounded-2xl border-2 border-dashed border-emerald-500/40 overflow-hidden flex items-center justify-center">
              {/* Video Element */}
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Target Graphic */}
              <div className="absolute inset-8 sm:inset-12 border-2 border-emerald-400 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="w-full h-0.5 bg-emerald-400/80 shadow-[0_0_10px_#10b981] animate-pulse" />
              </div>

              {!cameraActive && (
                <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-4 text-center space-y-2">
                  <Camera className="w-10 h-10 text-slate-500" />
                  <p className="text-xs text-slate-400 max-w-xs">
                    {cameraError || 'Hold customer’s printed QR, digital VIP pass, or phone screen in view'}
                  </p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    Turn Camera On
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Fallback / Zero-Hardware Code Search */}
          <div className="bg-slate-900/80 rounded-2xl p-3 border border-slate-800 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Or Quick Phone / Code Tap:
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type customer phone (e.g. 0803...)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCodeMatched(manualCode);
                }}
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => handleCodeMatched(manualCode)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer"
              >
                Find &amp; Log
              </button>
            </div>
          </div>

          <div className="text-center">
            <p className="text-[11px] text-slate-500">
              💡 Works using any smartphone camera staff carries in their pocket. Zero extra gadgets to purchase!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
