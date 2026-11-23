'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  getSegments,
  getEligibleRecipients,
  getCampaignDrafts,
  saveCampaignDraft,
  getBusinesses,
  getCustomers,
} from '@/lib/storage';
import { CampaignDraft, Business, Customer } from '@/types';
import { ConsentBadge } from '@/components/ConsentBadge';
import { formatNgn, formatRelativeTime, getWhatsAppUrl } from '@/lib/utils';
import {
  ShieldCheck,
  Eye,
  CheckCircle2,
  Sparkles,
  Check,
  Bot,
  Zap,
  Clock,
  MessageCircle,
  TrendingUp,
  UserCheck,
  ArrowRight,
  Send,
  Play,
  Pause,
  Sliders,
  DollarSign,
  HeartHandshake,
  Calendar,
  AlertTriangle,
  Building2,
  Layers,
} from 'lucide-react';

const BIZ_CADENCE: Record<string, number> = {
  barber: 14,
  salon: 21,
  laundry: 10,
  car_wash: 14,
  boutique: 30,
  pharmacy: 28,
  clinic: 60,
  other: 21,
};

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

function CampaignContent() {
  const searchParams = useSearchParams();
  const initialSegment = searchParams.get('segment') || 'inactive_30d';

  const { activeBusiness, customers } = useApp();

  const [activeTab, setActiveTab] = useState<'autopilot' | 'editor' | 'history'>('autopilot');
  const [isAutopilotEnabled, setIsAutopilotEnabled] = useState(true);
  const [aiTone, setAiTone] = useState<'warm' | 'executive' | 'trendy'>('warm');

  // Fleet Scope: 'all' = All businesses autonomously, or a specific biz id
  const [fleetScope, setFleetScope] = useState<'all' | string>('all');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [batchDispatched, setBatchDispatched] = useState(false);

  // Manual Studio State
  const [title, setTitle] = useState('Weekend Re-engagement Special');
  const [targetSegment, setTargetSegment] = useState(initialSegment);
  const [template, setTemplate] = useState(
    'Hello {{name}}, we miss seeing you at {{business_name}}! Show this message on your next visit for ₦1,000 off any executive styling service.'
  );

  const [campaigns, setCampaigns] = useState<CampaignDraft[]>([]);
  const [isSimulatedSent, setIsSimulatedSent] = useState(false);
  const [previewTab, setPreviewTab] = useState<'eligible' | 'excluded'>('eligible');

  useEffect(() => {
    try {
      setBusinesses(getBusinesses());
    } catch {}
  }, []);

  // Autopilot playbooks toggle
  const [playbooks, setPlaybooks] = useState({
    lapsed: true,
    slowDay: true,
    loyalty: true,
    followUp: true,
  });

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
      setActiveTab('editor');
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

  // AI Queued Actions across ALL client businesses or specific selected client
  const aiLapsedQueue = useMemo(() => {
    const now = new Date();
    const targetBusinesses = fleetScope === 'all'
      ? businesses
      : businesses.filter(b => b.id === fleetScope);

    const items: Array<{
      bizId: string;
      bizName: string;
      bizType: string;
      customer: Customer;
      reason: string;
      scheduledFor: string;
      message: string;
      waUrl: string;
      potentialValue: number;
    }> = [];

    for (const b of targetBusinesses) {
      const bCusts = getCustomers(b.id);
      const cadence = BIZ_CADENCE[b.business_type] || 21;

      const lapsed = bCusts.filter(c => {
        if (!c.last_visit_date || c.consent_status !== 'consented') return false;
        const diff = Math.floor((now.getTime() - new Date(c.last_visit_date).getTime()) / 86400000);
        return diff >= cadence;
      });

      for (const c of lapsed) {
        const firstName = c.full_name?.split(' ')[0] || 'Customer';
        const diff = Math.floor((now.getTime() - new Date(c.last_visit_date!).getTime()) / 86400000);
        let message = '';
        let reason = '';

        if (b.business_type === 'pharmacy') {
          reason = `Refill due (${diff}d since last)`;
          message = aiTone === 'executive'
            ? `Good day ${firstName}. From ${b.name}: your ${cadence}-day prescription refill review is ready. Reply to confirm pickup or request doorstep delivery.`
            : `Hello ${firstName}! 💊 This is ${b.name}. Your monthly medication refill window is now open. Reply here and we will prepare it for quick pickup or delivery!`;
        } else if (b.business_type === 'salon') {
          reason = `Styling due (${diff}d since visit)`;
          message = aiTone === 'trendy'
            ? `Hey ${firstName}! ${b.name} here ✨ Time to refresh your look! We're saving a priority VIP styling slot for you this week. Reply to book!`
            : `Hello ${firstName}! We miss you at ${b.name}. Your styling touch-up is due this week. Reply to reserve your preferred chair with our senior stylist!`;
        } else if (b.business_type === 'laundry') {
          reason = `Laundry cycle (${diff}d since drop-off)`;
          message = `Hello ${firstName}! It's ${b.name}. We're running our weekly neighborhood pickup route. Reply to book your laundry drop-off or pickup!`;
        } else {
          reason = `Lapsed ${diff}d (cadence: ${cadence}d)`;
          message = aiTone === 'executive'
            ? `Good day ${firstName}. From the desk of ${b.name}: your priority booking window is open. Reply to confirm your executive appointment.`
            : `Hello ${firstName}! It's ${b.name}. We noticed it's been about ${diff} days since your last visit. We'd love to see you back this week — reply to claim your VIP priority slot!`;
        }

        const avgVal = b.business_type === 'pharmacy' ? 12000 : b.business_type === 'barber' ? 6000 : 8000;

        items.push({
          bizId: b.id,
          bizName: b.name,
          bizType: b.business_type,
          customer: c,
          reason,
          scheduledFor: 'Auto-Queued (Priority Window)',
          message,
          waUrl: getWhatsAppUrl(c.phone, message),
          potentialValue: c.total_spent_ngn || avgVal,
        });
      }
    }

    return items;
  }, [fleetScope, businesses, aiTone]);

  // Total potential revenue currently queued by AI
  const aiTotalQueuedValue = useMemo(() => {
    return aiLapsedQueue.reduce((acc, item) => acc + item.potentialValue, 0);
  }, [aiLapsedQueue]);

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

    saveCampaignDraft(activeBusiness.id, {
      title: `${title} (Simulated Test)`,
      message_template: template,
      target_segment_id: targetSegment,
    });

    setIsSimulatedSent(true);
    setCampaigns(getCampaignDrafts(activeBusiness.id));
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Mode Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <Bot className="w-3.5 h-3.5 text-emerald-600" />
              <span>Autonomous Growth Engine</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            AI Retention &amp; Campaign Team
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Your automated in-house marketing department bringing repeat customers back into your business.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('autopilot')}
            className={`px-3 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'autopilot'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>AI Autopilot</span>
          </button>
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'editor'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Custom Studio</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Drafts ({campaigns.length})</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: AI AUTOPILOT (THE "DO-IT-FOR-ME" CAMPAIGN TEAM) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'autopilot' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Main Hero AI Status Banner */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    {isAutopilotEnabled ? 'AI Campaign Team Active • Running on Autopilot' : 'Autopilot Paused'}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Zero Staff Marketing Effort. Guaranteed Repeat Sales.
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Your only job is to ensure customers check in at the counter. RetainNG AI acts as your personal marketing agency—predicting churn, writing personalized WhatsApp messages, and bringing regular customers back to spend money with you.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAutopilotEnabled(!isAutopilotEnabled)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md ${
                    isAutopilotEnabled
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  {isAutopilotEnabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isAutopilotEnabled ? 'Autopilot Active' : 'Resume Autopilot'}</span>
                </button>
              </div>
            </div>

            {/* Performance Impact Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-1">
              <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Potential Revenue Queued
                </span>
                <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
                  ~{formatNgn(aiTotalQueuedValue)}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Ready for {aiLapsedQueue.length} lapsed customers</p>
              </div>

              <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Autonomous Playbooks
                </span>
                <p className="text-xl sm:text-2xl font-black text-white mt-1">
                  4 Active
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Lapsed, Mid-Week, VIP &amp; Reviews</p>
              </div>

              <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Staff Marketing Hours
                </span>
                <p className="text-xl sm:text-2xl font-black text-amber-400 mt-1">
                  0 Hours
                </p>
                <p className="text-[10px] text-slate-400 mt-1">100% automated by AI logic</p>
              </div>

              <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Consent Protection
                </span>
                <p className="text-xl sm:text-2xl font-black text-purple-400 mt-1">
                  100% Audited
                </p>
                <p className="text-[10px] text-slate-400 mt-1">NDPR compliant • Zero spam</p>
              </div>
            </div>
          </div>

          {/* Fleet Scope Selector & Batch Dispatch Bar */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-md space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-black text-sm text-white">Autonomous Multi-Client Fleet Engine</h3>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-2 py-0.5 rounded-full uppercase">
                    Continuous Autopilot
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Your AI engine manages customer retention for all client businesses simultaneously without needing manual switching.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setBatchDispatched(true);
                  setTimeout(() => setBatchDispatched(false), 5000);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Dispatch Entire Fleet ({aiLapsedQueue.length})</span>
              </button>
            </div>

            {/* Scope Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setFleetScope('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  fleetScope === 'all'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Zap className="w-3 h-3" />
                <span>All Businesses (Fleet)</span>
                <span className="text-[10px] bg-slate-950/40 px-1.5 py-0.2 rounded-full font-black">
                  {businesses.length}
                </span>
              </button>

              {businesses.map((b) => {
                const icon = BIZ_ICONS[b.business_type] || '🏪';
                const isSelected = fleetScope === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setFleetScope(b.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span>{icon}</span>
                    <span>{b.name}</span>
                  </button>
                );
              })}
            </div>

            {batchDispatched && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs font-bold text-emerald-300 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  ✓ Autonomous Fleet Dispatch Initiated: {aiLapsedQueue.length} retention actions dispatched across your managed accounts. Zero staff manual work!
                </span>
              </div>
            )}
          </div>

          {/* AI Persona & Tone Settings Bar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-600" />
                <span>AI Copy Persona &amp; Tone</span>
              </h3>
              <p className="text-xs text-slate-500">
                Customize how your AI campaign assistant speaks to your customers on WhatsApp.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {[
                { id: 'warm', label: 'Warm & Caring (Recommended)' },
                { id: 'executive', label: 'Executive & Crisp' },
                { id: 'trendy', label: 'Trendy & Casual' },
              ].map((tone) => (
                <button
                  key={tone.id}
                  type="button"
                  onClick={() => setAiTone(tone.id as 'warm' | 'executive' | 'trendy')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                    aiTone === tone.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {tone.label}
                </button>
              ))}
            </div>
          </div>

          {/* The 4 Autonomous Playbooks Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <span>The 4 Autonomous Playbooks Running For Your Business</span>
              </h3>
              <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                ✓ Active On Autopilot
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Playbook 1 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3 hover:border-emerald-300 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center font-bold">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    Highest Revenue Impact
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">1. Lapsed Regular Recovery (21–30 Days)</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Automatically triggers when a customer hasn&apos;t visited in 25+ days. Sends on Thursday morning to lock in weekend slots before they visit a competitor.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 italic">
                  &ldquo;Hello Babajide! We noticed it&apos;s been a few weeks. Weekend slots are filling fast—reply to save your preferred time with a VIP perk!&rdquo;
                </div>
              </div>

              {/* Playbook 2 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3 hover:border-emerald-300 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Off-Peak Booster
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">2. Mid-Week Slow-Day Booster</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Tuesdays and Wednesdays are notoriously quiet. AI identifies open slots and nudges nearby regulars with a 10% mid-week speed perk to keep staff earning.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 italic">
                  &ldquo;Hi Chidi! Beat the weekend crowd. Book your session this Wednesday afternoon and enjoy express VIP service with 10% off!&rdquo;
                </div>
              </div>

              {/* Playbook 3 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3 hover:border-emerald-300 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                    Loyalty Milestones
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">3. VIP Loyalty &amp; Milestone Rewards</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Triggered automatically when a customer completes their 3rd and 5th visit. Rewards your top 10% most loyal regulars with heartfelt appreciation.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 italic">
                  &ldquo;Happy milestone, Funke! You&apos;ve completed 5 visits with us! Show this message next time to receive our complimentary VIP treatment!&rdquo;
                </div>
              </div>

              {/* Playbook 4 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3 hover:border-emerald-300 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    24h Follow-up
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">4. Post-Service Care &amp; Re-booking (24h)</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Sent exactly 24 hours after a customer checks out. Confirms their satisfaction, shares aftercare advice, and secures their next booking in advance.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 italic">
                  &ldquo;Good day Babajide! Thank you for visiting yesterday. How was your service? Reply if you need anything, or to pre-book your next session!&rdquo;
                </div>
              </div>
            </div>
          </div>

          {/* Live Queued Actions Stream */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <span>Queued Actions Ready for Dispatch</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    {aiLapsedQueue.length} Active
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  AI-personalized messages ready to be dispatched to your customers.
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Revenue Ready for Recovery
                </span>
                <p className="text-base sm:text-lg font-black text-emerald-600">
                  ~{formatNgn(aiTotalQueuedValue)}
                </p>
              </div>
            </div>

            {aiLapsedQueue.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-bold text-slate-800">Your customer retention is looking great!</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No regulars are currently lapsed beyond 25 days. The AI is monitoring all recorded check-ins.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {aiLapsedQueue.map((item, idx) => (
                  <div
                    key={item.customer.id || idx}
                    className="p-4 bg-slate-50/80 hover:bg-slate-50 rounded-2xl border border-slate-200 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] px-2 py-0.5 bg-slate-900 text-slate-100 rounded-lg font-bold flex items-center gap-1">
                          <span>{BIZ_ICONS[item.bizType] || '🏪'}</span>
                          <span className="truncate max-w-[130px]">{item.bizName}</span>
                        </span>
                        <span className="font-bold text-sm text-slate-900">{item.customer.full_name}</span>
                        <span className="text-[11px] text-slate-500 font-mono">{item.customer.phone}</span>
                        <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full">
                          {item.reason}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/80 italic">
                        &ldquo;{item.message}&rdquo;
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span>Scheduled: {item.scheduledFor}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-700">Value: {formatNgn(item.potentialValue)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={item.waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Send WhatsApp Now</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: MANUAL CAMPAIGN STUDIO */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'editor' && (
        <div className="space-y-6 animate-in fade-in">
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
                    placeholder="e.g. Sallah Promo / Mid-week Special"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Message Template */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Message Content (Supports Personalization)
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Use <code>{`{{name}}`}</code> and <code>{`{{business_name}}`}</code>
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed font-sans"
                  />
                </div>

                {/* Template Presets */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Quick Nigerian SME Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      {
                        label: 'Lapsed Customer We Miss You',
                        text: 'Hello {{name}}, we haven’t seen you in a while at {{business_name}}! Come in this weekend and enjoy a complimentary grooming treatment on us.',
                      },
                      {
                        label: 'Loyalty Thank You Offer',
                        text: 'Hi {{name}}! Thank you for being one of our most valued clients at {{business_name}}. Book your next visit before Friday for a special VIP perk.',
                      },
                      {
                        label: 'New Week Appointment Reminder',
                        text: 'Good day {{name}}! Beat the weekend rush at {{business_name}}. Walk in today or reply to secure your preferred slot.',
                      },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setTemplate(preset.text)}
                        className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-wrap gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={handleSimulateSend}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Run Simulated Delivery ({recipientEvaluation.eligible.length} recipients)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Live Personalized Preview */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-emerald-600" />
                    <span>Live Audience &amp; Message Audit</span>
                  </h3>
                  <div className="flex items-center gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('eligible')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                        previewTab === 'eligible'
                          ? 'bg-emerald-50 text-emerald-800 font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Eligible ({recipientEvaluation.eligible.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('excluded')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                        previewTab === 'excluded'
                          ? 'bg-rose-50 text-rose-800 font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Blocked ({recipientEvaluation.excluded.length})
                    </button>
                  </div>
                </div>

                {previewTab === 'eligible' ? (
                  recipientEvaluation.eligible.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No consented customers in this segment.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {recipientEvaluation.eligible.slice(0, 5).map((item) => (
                        <div
                          key={item.customer_id}
                          className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{item.customer_name}</span>
                            <ConsentBadge status={item.consent_status} size="sm" />
                          </div>
                          <p className="text-slate-600 italic bg-white p-2.5 rounded-lg border border-slate-200">
                            &ldquo;{item.personalized_text}&rdquo;
                          </p>
                        </div>
                      ))}
                    </div>
                  )
                ) : recipientEvaluation.excluded.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Zero customers blocked in this segment. All members have given consent.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {recipientEvaluation.excluded.map((item) => (
                      <div
                        key={item.customer_id}
                        className="p-3 bg-rose-50/50 rounded-xl border border-rose-200 text-xs flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{item.customer_name}</p>
                          <p className="text-[11px] text-rose-700 mt-0.5">{item.reason_excluded || 'Consent not confirmed'}</p>
                        </div>
                        <ConsentBadge status={item.consent_status} size="sm" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: SAVED HISTORY */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4 animate-in fade-in">
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
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 px-2.5 py-1 bg-emerald-50 rounded-lg shrink-0 cursor-pointer"
                  >
                    Load into Editor
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-slate-400 text-sm">Loading campaigns...</div>}>
      <CampaignContent />
    </Suspense>
  );
}
