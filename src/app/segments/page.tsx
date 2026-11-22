'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { getSegments } from '@/lib/storage';
import {
  PieChart,
  Send,
  Info,
} from 'lucide-react';
import Link from 'next/link';

export default function SegmentsPage() {
  const { activeBusiness, customers } = useApp();

  const segments = useMemo(() => {
    if (!activeBusiness) return [];
    return getSegments(activeBusiness.id);
  }, [activeBusiness, customers]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Customer Segments
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pre-calculated retention groups based on verified visit records and marketing consent.
          </p>
        </div>

        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition"
        >
          <Send className="w-4 h-4" />
          <span>Draft a Campaign</span>
        </Link>
      </div>

      {/* Honest Automation & Manual Control Banner */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong className="text-amber-950">No automatic spam:</strong> In this MVP, segments are strictly informational. The app will <strong>never</strong> blast automated messages to a segment without you manually drafting, reviewing, and approving the message first.
        </div>
      </div>

      {/* Segment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {segments.map((seg) => {
          const consentPct =
            seg.customer_count > 0
              ? Math.round((seg.consented_count / seg.customer_count) * 100)
              : 0;

          return (
            <div
              key={seg.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {seg.rule_type.replace('_', ' ')}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <PieChart className="w-4 h-4" />
                  </div>
                </div>

                <h3 className="font-bold text-base text-slate-900">{seg.name}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {seg.description}
                </p>

                {/* Numbers */}
                <div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Total People</span>
                    <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                      {seg.customer_count}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-700 uppercase font-semibold">With Consent</span>
                    <p className="text-xl font-extrabold text-emerald-700 mt-0.5">
                      {seg.consented_count}
                    </p>
                  </div>
                </div>

                {/* Consent Readiness Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>Marketing Reachable:</span>
                    <span className="font-semibold text-slate-800">{consentPct}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${consentPct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {seg.customer_count - seg.consented_count} contact(s) lack explicit consent and will be excluded.
                  </p>
                </div>
              </div>

              {/* Bottom Action */}
              <div className="pt-4 mt-4 border-t border-slate-100">
                <Link
                  href={`/campaigns?segment=${seg.id}`}
                  className="w-full py-2 px-3 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl flex items-center justify-center gap-1.5 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Draft Message for this Segment</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
