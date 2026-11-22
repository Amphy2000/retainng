'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  getSegments,
  getEligibleRecipients,
  getCampaignDrafts,
  saveCampaignDraft,
} from '@/lib/storage';
import { CampaignDraft } from '@/types';
import { ConsentBadge } from '@/components/ConsentBadge';
import {
  ShieldCheck,
  Eye,
  CheckCircle2,
  Sparkles,
  Check,
} from 'lucide-react';

function CampaignContent() {
  const searchParams = useSearchParams();
  const initialSegment = searchParams.get('segment') || 'inactive_30d';

  const { activeBusiness, customers } = useApp();

  const [title, setTitle] = useState('Weekend Re-engagement Special');
  const [targetSegment, setTargetSegment] = useState(initialSegment);
  const [template, setTemplate] = useState(
    'Hello {{name}}, we miss seeing you at {{business_name}}! Show this message on your next visit for ₦1,000 off any executive styling service.'
  );

  const [campaigns, setCampaigns] = useState<CampaignDraft[]>([]);
  const [isSimulatedSent, setIsSimulatedSent] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');
  const [previewTab, setPreviewTab] = useState<'eligible' | 'excluded'>('eligible');

  useEffect(() => {
    if (!activeBusiness) return;
    const timer = setTimeout(() => {
      setCampaigns(getCampaignDrafts(activeBusiness.id));
    }, 0);
    return () => clearTimeout(timer);
  }, [activeBusiness]);

  useEffect(() => {
    const segParam = searchParams.get('segment');
    if (!segParam) return;
    const timer = setTimeout(() => {
      setTargetSegment(segParam);
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams]);

  const segments = useMemo(() => {
    if (!activeBusiness) return [];
    return getSegments(activeBusiness.id);
  }, [activeBusiness, customers]);

  // Recipient evaluation with consent enforcement
  const recipientEvaluation = useMemo(() => {
    if (!activeBusiness) return { eligible: [], excluded: [], segmentName: '' };
    return getEligibleRecipients(activeBusiness.id, targetSegment, template);
  }, [activeBusiness, targetSegment, template, customers]);

  function handleSaveDraft() {
    if (!activeBusiness) return;
    if (!title.trim()) {
      alert('Please enter a campaign title');
      return;
    }
    saveCampaignDraft(activeBusiness.id, {
      title,
      message_template: template,
      target_segment_id: targetSegment,
    });
    setCampaigns(getCampaignDrafts(activeBusiness.id));
    alert('Campaign draft saved successfully!');
  }

  function handleSimulateSend() {
    if (recipientEvaluation.eligible.length === 0) {
      alert('There are no consented eligible recipients in this segment to simulate sending to.');
      return;
    }

    if (!activeBusiness) return;

    // Save as draft with simulated status
    saveCampaignDraft(activeBusiness.id, {
      title: `${title} (Simulated Test)`,
      message_template: template,
      target_segment_id: targetSegment,
    });

    setIsSimulatedSent(true);
    setCampaigns(getCampaignDrafts(activeBusiness.id));
  }

  // Pre-made realistic Nigerian templates
  const templatePresets = [
    {
      label: 'Lapsed Customer We Miss You',
      text: 'Hello {{name}}, we haven’t seen you in a while at {{business_name}}! Come in this weekend and enjoy a complimentary grooming treatment on us.',
    },
    {
      label: 'Loyalty Thank You Offer',
      text: 'Hi {{name}}! Thank you for being one of our most valued clients at {{business_name}}. Book your next visit before Friday for ₦1,500 off.',
    },
    {
      label: 'New Week Appointment Reminder',
      text: 'Good day {{name}}! Beat the weekend rush at {{business_name}}. Walk in today or reply to secure your preferred slot.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Campaign Preparation
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Prepare, personalize, and audit audience reach with 100% consent verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'editor'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            New Campaign
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'history'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Saved Drafts ({campaigns.length})
          </button>
        </div>
      </div>

      {/* Honest Automation & Provider Integration Notice */}
      <div className="bg-slate-900 text-slate-200 rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" />
              Simulated Preview Engine (MVP)
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            In compliance with our honest automation principle, this platform will <strong>never pretend a real SMS or WhatsApp message was delivered</strong> unless a legitimate gateway (e.g. Termii, Africa&apos;s Talking, or WhatsApp Cloud API) is connected and funded. Below is a live simulated preview.
          </p>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <span className="inline-block text-[11px] bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700">
            Ready for Gateway API Integration
          </span>
        </div>
      </div>

      {activeTab === 'history' ? (
        /* Saved Drafts Tab */
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <h3 className="font-bold text-base text-slate-900">Saved Campaign Drafts</h3>
          {campaigns.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No campaign drafts saved yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {campaigns.map((camp) => (
                <div key={camp.id} className="py-3.5 flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{camp.title}</h4>
                    <p className="text-xs text-slate-600 mt-1 italic">&ldquo;{camp.message_template}&rdquo;</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Target Segment: <code className="bg-slate-100 px-1 py-0.5 rounded">{camp.target_segment_id}</code>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setTitle(camp.title);
                      setTemplate(camp.message_template);
                      setTargetSegment(camp.target_segment_id);
                      setActiveTab('editor');
                    }}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 px-2.5 py-1 bg-emerald-50 rounded-lg shrink-0"
                  >
                    Load into Editor
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Editor & Live Preview Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Draft Form */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <h3 className="font-bold text-base text-slate-900">1. Select Target Segment</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {segments.map((seg) => {
                  const isSelected = targetSegment === seg.id;
                  return (
                    <button
                      key={seg.id}
                      type="button"
                      onClick={() => setTargetSegment(seg.id)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-1 ring-emerald-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs truncate">{seg.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {seg.consented_count} consented ({seg.customer_count} total)
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Campaign Title */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Campaign Title (Internal Reference)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. November Weekend Special"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Message Template */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Message Template
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {template.length} characters
                  </span>
                </div>

                <textarea
                  rows={4}
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="w-full p-3.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-sans leading-relaxed"
                />

                {/* Variable Pills */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-500 font-medium">Insert dynamic tag:</span>
                  <button
                    type="button"
                    onClick={() => setTemplate((prev) => prev + ' {{name}}')}
                    className="px-2 py-0.5 text-xs rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition"
                  >
                    + &#123;&#123;name&#125;&#125;
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplate((prev) => prev + ' {{business_name}}')}
                    className="px-2 py-0.5 text-xs rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition"
                  >
                    + &#123;&#123;business_name&#125;&#125;
                  </button>
                </div>

                {/* Preset suggestions */}
                <div className="pt-3 border-t border-slate-100 mt-3 space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Quick Nigerian SME Starters:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {templatePresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setTemplate(preset.text)}
                        className="text-[11px] text-slate-600 hover:text-emerald-800 bg-slate-50 hover:bg-emerald-50 px-2.5 py-1 rounded-lg border border-slate-200 transition"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Save as Draft
                </button>

                <button
                  type="button"
                  onClick={handleSimulateSend}
                  disabled={recipientEvaluation.eligible.length === 0}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Run Simulated Test Send</span>
                </button>
              </div>
            </div>

            {/* Simulation Feedback Alert */}
            {isSimulatedSent && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-950 text-xs space-y-1.5 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Simulated Campaign Run Completed</span>
                </div>
                <p className="leading-relaxed">
                  {recipientEvaluation.eligible.length} consented customer messages were generated and validated against your consent registry. No real SMS or WhatsApp charges occurred.
                </p>
              </div>
            )}
          </div>

          {/* Right Column (5 cols): Live Preview & Consent Audit */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-emerald-600" />
                  <span>Audience & Consent Audit</span>
                </h3>
              </div>

              {/* Breakdown Metric Bar */}
              <div className="grid grid-cols-2 gap-2 text-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">
                    Eligible (Consented)
                  </span>
                  <p className="text-2xl font-black text-emerald-700 mt-0.5">
                    {recipientEvaluation.eligible.length}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-rose-800 font-bold uppercase tracking-wider">
                    Excluded (Protected)
                  </span>
                  <p className="text-2xl font-black text-rose-700 mt-0.5">
                    {recipientEvaluation.excluded.length}
                  </p>
                </div>
              </div>

              {/* Tabs between Eligible and Excluded */}
              <div className="flex border-b border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPreviewTab('eligible')}
                  className={`pb-2 px-3 border-b-2 transition ${
                    previewTab === 'eligible'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Eligible ({recipientEvaluation.eligible.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('excluded')}
                  className={`pb-2 px-3 border-b-2 transition ${
                    previewTab === 'excluded'
                      ? 'border-rose-600 text-rose-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Excluded Contacts ({recipientEvaluation.excluded.length})
                </button>
              </div>

              {/* Recipient Item Cards */}
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {previewTab === 'eligible' ? (
                  recipientEvaluation.eligible.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No consented customers found in this segment.
                    </div>
                  ) : (
                    recipientEvaluation.eligible.map((item) => (
                      <div
                        key={item.customer_id}
                        className="p-3 bg-slate-50 border border-emerald-200/60 rounded-xl text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{item.customer_name}</span>
                          <span className="text-[11px] font-mono text-slate-500">{item.phone}</span>
                        </div>
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-slate-800 font-sans leading-relaxed">
                          {item.personalized_text}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Explicit marketing consent on file</span>
                        </div>
                      </div>
                    ))
                  )
                ) : recipientEvaluation.excluded.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No contacts were excluded. All members in this segment have valid consent!
                  </div>
                ) : (
                  recipientEvaluation.excluded.map((item) => (
                    <div
                      key={item.customer_id}
                      className="p-3 bg-rose-50/50 border border-rose-200/60 rounded-xl text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{item.customer_name}</span>
                        <ConsentBadge status={item.consent_status} size="sm" />
                      </div>
                      <p className="text-[11px] text-rose-700 font-medium">
                        Reason: {item.reason_excluded}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading campaign preparation...</div>}>
      <CampaignContent />
    </Suspense>
  );
}
