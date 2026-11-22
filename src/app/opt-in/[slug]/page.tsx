'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { getBusinessBySlug, registerCustomerOptIn } from '@/lib/storage';
import { Business } from '@/types';
import {
  ShieldCheck,
  CheckCircle2,
  Phone,
  User,
  Mail,
  MapPin,
  HeartHandshake,
  AlertCircle,
} from 'lucide-react';

function OptInFormContent() {
  const params = useParams();
  const slug = params?.slug as string;

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(true); // checked by default on self-registration form, but with explicit disclosure

  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const timer = setTimeout(() => {
      const biz = getBusinessBySlug(slug);
      setBusiness(biz || null);
      setLoading(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <p className="text-slate-400 text-sm">Loading customer registration...</p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Business Not Found</h2>
          <p className="text-xs text-slate-500">
            We couldn&apos;t locate a business corresponding to link code: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">{slug}</code>. Please check the QR code or request an updated link.
          </p>
        </div>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!business) {
      setErrorMessage('Business profile is unavailable');
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Please enter your phone number');
      return;
    }
    if (!agreed) {
      setErrorMessage('Please tick the consent box to receive updates and exclusive offers');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = registerCustomerOptIn(business.opt_in_slug, {
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        agreed_to_marketing: agreed,
      });

      if (res.success) {
        setSubmitted(true);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between p-4 sm:p-6 text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* Top Brand Header */}
      <div className="max-w-md w-full mx-auto pt-6 text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 font-black text-xl">
          ₦
        </div>
        <div className="space-y-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-800/60 inline-block">
            {business.business_type} • {business.city}
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            {business.name}
          </h1>
          {business.address && (
            <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3 text-slate-500" />
              <span>{business.address}</span>
            </p>
          )}
        </div>
      </div>

      {/* Main Card */}
      <div className="max-w-md w-full mx-auto my-6">
        <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200/80">
          {submitted ? (
            <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  You&apos;re all registered!
                </h2>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
                  Thank you, <strong className="text-slate-800">{fullName}</strong>. Your details and visit preferences have been saved with <strong className="text-slate-800">{business.name}</strong>.
                </p>
              </div>

              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-left text-xs text-emerald-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Verified Consent Record</span>
                </p>
                <p className="text-[11px] leading-relaxed text-emerald-800">
                  We logged your permission for appointment notices and specials. You can reply STOP or ask counter staff anytime to opt out.
                </p>
              </div>

              <button
                onClick={() => {
                  setSubmitted(false);
                  setFullName('');
                  setPhone('');
                  setEmail('');
                }}
                className="w-full py-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Register another person
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Stay Connected & Enjoy Perks
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Join our VIP customer list for direct appointment scheduling, reminders, and occasional loyalty specials.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Your Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Babajide Adeleke"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  WhatsApp / Phone Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="0802 345 6789 or +234 802..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Email Address (Optional)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    placeholder="e.g. myname@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Explicit Consent Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-emerald-50/40 transition">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 shrink-0"
                    required
                  />
                  <div className="text-xs text-slate-700 leading-relaxed">
                    <span className="font-semibold text-slate-900 block">
                      I agree to receive service updates & exclusive specials
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Messages sent via WhatsApp or SMS from {business.name}. No spam. You may opt out anytime.
                    </span>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <HeartHandshake className="w-4 h-4" />
                <span>{isSubmitting ? 'Registering...' : 'Register With Business'}</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer Privacy Guarantee */}
      <div className="max-w-md w-full mx-auto text-center pb-4 text-[11px] text-slate-500 space-y-1">
        <p className="flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Powered by RetainNG • Consent-First SME Retention Platform</span>
        </p>
        <p className="text-[10px] text-slate-600">
          Your information is securely held for {business.name} and never sold to third parties.
        </p>
      </div>
    </div>
  );
}

export default function CustomerOptInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
          Loading opt-in page...
        </div>
      }
    >
      <OptInFormContent />
    </Suspense>
  );
}
