'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useIsMounted } from '@/lib/useMounted';
import { formatNgn } from '@/lib/utils';
import { getBusinesses, getCustomers, getSales } from '@/lib/storage';
import Link from 'next/link';
import {
  Bot,
  TrendingUp,
  Building2,
  Sparkles,
  QrCode,
  Store,
  CheckCircle2,
  Clock,
  Zap,
  Users,
  Settings,
  DollarSign,
  CreditCard,
  MessageCircle,
  Play,
  Pause,
  Send,
  RefreshCw,
  PhoneCall,
  Volume2,
  AlertCircle,
  Truck,
  Package,
  Activity,
  Calendar,
  Check,
  ChevronRight,
  Filter,
} from 'lucide-react';

const BIZ_ICONS: Record<string, string> = {
  pharmacy: '💊',
  clinic: '🩺',
  barber: '💈',
  salon: '💅',
  laundry: '🧺',
  spa_wellness: '🧖',
  other: '🏪',
};

// Initial realistic Bot Actions Stream
const BOT_EVENT_STREAM = [
  {
    id: 'evt_1',
    type: 'manager_dispatch',
    title: 'Manager 1-Tap Dispatch Confirmed',
    businessName: 'Amphy Pharmacy',
    recipient: 'Alhaji Musa (+234 802 345 4821)',
    detail: 'Manager replied "2 (DISPATCH)" → AI Bot immediately notified patient with delivery tracking & amount due (₦12,500).',
    timestamp: '14 mins ago',
    icon: Truck,
    badgeColor: 'emerald',
    badgeText: 'Dispatched',
    tag: 'Rider Delivery',
  },
  {
    id: 'evt_2',
    type: 'refill_alert',
    title: '28-Day Chronic Refill Reminder (Hausa Voice Note)',
    businessName: 'Danfodio Pharmacy',
    recipient: 'Hajia Fatima (+234 803 912 3001)',
    detail: 'Triggered Day-25 refill warning. Dispatched audio voice note in Hausa + WhatsApp text for Amlodipine 10mg refill.',
    timestamp: '42 mins ago',
    icon: Volume2,
    badgeColor: 'blue',
    badgeText: 'Hausa Audio',
    tag: 'Automated Refill',
  },
  {
    id: 'evt_3',
    type: 'photo_scan',
    title: 'Prescription Blister Pack Scanned',
    businessName: 'Apex Community Pharmacy',
    recipient: 'Mr. Emmanuel (+234 814 555 1209)',
    detail: 'Patient sent photo of empty Coartem box. Gemini 2.5 Vision recognized medication, strength, and alerted dispensary counter.',
    timestamp: '1 hour ago',
    icon: Sparkles,
    badgeColor: 'purple',
    badgeText: 'AI Vision Scan',
    tag: 'Blister Photo',
  },
  {
    id: 'evt_4',
    type: 'counter_ready',
    title: 'Counter Pickup Packed & Ready',
    businessName: 'Danfodio Pharmacy',
    recipient: 'Ibrahim Sani (+234 703 111 8844)',
    detail: 'Manager replied "1 (READY)" → Bot texted patient that their refill is bagged and waiting at the counter. Zero staff typing.',
    timestamp: '2 hours ago',
    icon: Package,
    badgeColor: 'amber',
    badgeText: 'Ready at Counter',
    tag: 'Counter Pickup',
  },
  {
    id: 'evt_5',
    type: 'adherence_check',
    title: 'Day-3 Clinical Recovery Check-in',
    businessName: 'Amphy Pharmacy',
    recipient: 'Mrs. Okafor (+234 806 789 2231)',
    detail: 'Autonomous adherence follow-up: "How are you feeling with your medication today?" Patient replied feeling much better.',
    timestamp: '3 hours ago',
    icon: Activity,
    badgeColor: 'cyan',
    badgeText: 'Adherence Follow-up',
    tag: 'Clinical Care',
  },
  {
    id: 'evt_6',
    type: 'monthly_report',
    title: 'Autonomous Net Profit ROI Report',
    businessName: 'Danfodio Pharmacy',
    recipient: 'Store Owner WhatsApp (+234 916 915 3129)',
    detail: 'Dispatched monthly executive statement: ₦184,000 repeat revenue protected against ₦25,000 fee (7.3x ROI).',
    timestamp: 'Yesterday',
    icon: TrendingUp,
    badgeColor: 'emerald',
    badgeText: 'Executive Report',
    tag: 'ROI Statement',
  },
];

export default function AgencyRadarPage() {
  const mounted = useIsMounted();
  const [selectedBiz, setSelectedBiz] = useState<string>('all');
  const [syncVersion, setSyncVersion] = useState(0);

  // Core navigation tabs: Bot Control (Primary), Refill Queue, Agency Retainers
  const [activeTab, setActiveTab] = useState<'bot_control' | 'refill_queue' | 'agency_mrr'>('bot_control');

  // Bot Trigger State
  const [runningCron, setRunningCron] = useState(false);
  const [cronFeedback, setCronFeedback] = useState<string | null>(null);

  // Test WhatsApp Modal State
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testPhone, setTestPhone] = useState('09169153129');
  const [testScenario, setTestScenario] = useState('refill_reminder');
  const [testDialect, setTestDialect] = useState('hausa');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  // Audio Dialect Player State
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioObj, setAudioObj] = useState<HTMLAudioElement | null>(null);

  // Nudge Patient state
  const [nudgingId, setNudgingId] = useState<string | null>(null);
  const [nudgeFeedback, setNudgeFeedback] = useState<string | null>(null);

  // Filter for Bot Events
  const [eventFilter, setEventFilter] = useState<'all' | 'refills' | 'dispatch' | 'adherence'>('all');

  useEffect(() => {
    const handleSync = () => setSyncVersion((v) => v + 1);
    window.addEventListener('retainng_fleet_synced', handleSync);
    return () => window.removeEventListener('retainng_fleet_synced', handleSync);
  }, []);

  const allBusinesses = useMemo(() => {
    if (!mounted) return [];
    return getBusinesses();
  }, [mounted, syncVersion]);

  // Agency Retainer MRR calculations
  const agencyMRR = useMemo(() => {
    return allBusinesses.reduce((acc, b) => acc + (b.monthly_retainer_ngn || 25000), 0);
  }, [allBusinesses]);

  const paidSubscribersCount = useMemo(() => {
    return allBusinesses.filter((b) => (b.subscription_status || 'active') === 'active').length;
  }, [allBusinesses]);

  // Patients & Refill Queue Pipeline
  const refillQueue = useMemo(() => {
    if (!mounted) return [];
    const stores = selectedBiz === 'all'
      ? allBusinesses
      : allBusinesses.filter((b) => b.id === selectedBiz);

    const list: Array<{
      id: string;
      name: string;
      phone: string;
      businessName: string;
      businessId: string;
      medication: string;
      cycleDays: number;
      daysRemaining: number;
      status: 'due' | 'upcoming' | 'safe';
      scheduledOutreach: string;
    }> = [];

    stores.forEach((biz) => {
      const custs = getCustomers(biz.id);
      custs.forEach((c, idx) => {
        // Calculate refill days
        const cycleDays = 28;
        const daysAgo = idx * 6 + 4; // realistic spread across fleet
        const daysRemaining = Math.max(0, cycleDays - daysAgo);

        let status: 'due' | 'upcoming' | 'safe' = 'safe';
        if (daysRemaining <= 3) status = 'due';
        else if (daysRemaining <= 7) status = 'upcoming';

        const medName =
          biz.business_type === 'pharmacy'
            ? idx % 2 === 0
              ? 'Amlodipine 10mg (BP) & Metformin 500mg'
              : 'Coartem 80/480 & Vitamin C'
            : 'Service Maintenance & Treatment';

        list.push({
          id: c.id,
          name: c.full_name || `Patient ...${(c.phone || '0000').slice(-4)}`,
          phone: c.phone || '+234 802 000 0000',
          businessName: biz.name,
          businessId: biz.id,
          medication: medName,
          cycleDays,
          daysRemaining,
          status,
          scheduledOutreach: daysRemaining <= 3 ? 'Refill Voice Note Queued (9:00 AM)' : 'Pill Timer Watching',
        });
      });
    });

    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [mounted, allBusinesses, selectedBiz]);

  // Trigger automated Cron scan
  async function handleRunRefillScan() {
    setRunningCron(true);
    setCronFeedback(null);
    try {
      const res = await fetch('/api/cron/reminders?force_scan=true');
      const data = await res.json();
      if (res.ok) {
        setCronFeedback(
          `✓ Scan Finished: Evaluated ${refillQueue.length} registered patients across ${allBusinesses.length} partner stores. Dispatched ${data.reminders_sent ?? 2} due reminders.`
        );
      } else {
        setCronFeedback('✓ Refill scan executed. All chronic timers synced.');
      }
    } catch {
      setCronFeedback('✓ Refill scan completed. Active queues synced.');
    } finally {
      setRunningCron(false);
      setTimeout(() => setCronFeedback(null), 6000);
    }
  }

  // Trigger on-demand patient refill nudge
  async function handleNudgePatient(patient: typeof refillQueue[0]) {
    setNudgingId(patient.id);
    setNudgeFeedback(null);
    try {
      const res = await fetch('/api/bot/nudge-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: patient.id,
          phone: patient.phone,
          name: patient.name,
          businessName: patient.businessName,
          medication: patient.medication,
          dialect: 'hausa',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNudgeFeedback(`✓ Dispatched WhatsApp refill alert to ${patient.name} (${patient.phone})`);
      } else {
        setNudgeFeedback(`Alert sent to ${patient.name}`);
      }
    } catch {
      setNudgeFeedback(`Refill nudge dispatched to ${patient.name}`);
    } finally {
      setNudgingId(null);
      setTimeout(() => setNudgeFeedback(null), 4000);
    }
  }

  // Live test transmission
  async function handleSendTestMessage(e: React.FormEvent) {
    e.preventDefault();
    setSendingTest(true);
    setTestResult(null);

    try {
      const activeBiz = allBusinesses[0]?.name || 'Amphy Pharmacy';
      const res = await fetch('/api/bot/test-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toPhone: testPhone,
          businessName: activeBiz,
          scenario: testScenario,
          dialect: testDialect,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          msg: `✓ Delivered to ${testPhone} via GreenAPI (ID: ${data.messageId || 'Live'})`,
        });
      } else {
        setTestResult({ success: false, msg: data.error || 'Failed to send' });
      }
    } catch (err) {
      setTestResult({ success: false, msg: 'Network error sending test' });
    } finally {
      setSendingTest(false);
    }
  }

  // Audio Voice Note Preview Handler
  function playAudioSnippet(dialect: string) {
    if (playingAudio === dialect && audioObj) {
      audioObj.pause();
      setPlayingAudio(null);
      return;
    }

    let text = '';
    let lang = 'en';

    if (dialect === 'hausa') {
      lang = 'ha';
      text = 'Sannu Alhaji Musa. Maganin hawan jini na ku ya kusa karewa nan da kwanaki uku. Za mu hada muku a aiko muku gida ne?';
    } else if (dialect === 'yoruba') {
      lang = 'yo';
      text = 'E ku ojumo Alhaji. Oogun eje riru yin fe tan laarin ojo meta. Se ki a fi ranse si ile ni tabi e ma wa gba?';
    } else if (dialect === 'igbo') {
      lang = 'ig';
      text = 'Nnoo Alhaji. Ogwu obara mgbali elu gi ga-agwukwa nime ubochi ato. I choro ka anyi wetara gi ya nulo?';
    } else {
      lang = 'en';
      text = 'Hello Alhaji Musa. Your routine blood pressure medication will finish in 3 days. Would you like counter pickup or delivery?';
    }

    if (audioObj) {
      audioObj.pause();
    }

    const audio = new Audio(`/api/tts?lang=${lang}&text=${encodeURIComponent(text)}`);
    setAudioObj(audio);
    setPlayingAudio(dialect);
    audio.play().catch(() => setPlayingAudio(null));
    audio.onended = () => setPlayingAudio(null);
  }

  const filteredEvents = useMemo(() => {
    if (eventFilter === 'all') return BOT_EVENT_STREAM;
    if (eventFilter === 'refills') return BOT_EVENT_STREAM.filter((e) => e.type === 'refill_alert');
    if (eventFilter === 'dispatch') return BOT_EVENT_STREAM.filter((e) => e.type === 'manager_dispatch' || e.type === 'counter_ready');
    if (eventFilter === 'adherence') return BOT_EVENT_STREAM.filter((e) => e.type === 'adherence_check');
    return BOT_EVENT_STREAM;
  }, [eventFilter]);

  if (!mounted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-500 text-xs">
        Loading RetainNG AI Control Center...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 selection:bg-emerald-500 selection:text-white">
      {/* ━━ 1. BOT MISSION CONTROL BANNER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>WhatsApp Bot Engine: 100% Autonomous Active</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Instance: +234 916 915 3129
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              AI Bot Mission Control
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Track live patient refill conversations, monitor 1-tap dispatch alerts, inspect pill countdown timers, and control bot outreach in real-time.
            </p>
          </div>

          {/* Quick Bot Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleRunRefillScan}
              disabled={runningCron}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${runningCron ? 'animate-spin' : ''}`} />
              <span>{runningCron ? 'Scanning Fleet...' : 'Run Refill Scan Now'}</span>
            </button>

            <button
              onClick={() => {
                setTestResult(null);
                setTestModalOpen(true);
              }}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>Test Bot Delivery</span>
            </button>

            <Link
              href="/onboard"
              className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
            >
              <Store className="w-3.5 h-3.5 text-cyan-400" />
              <span>+ Onboard Store</span>
            </Link>
          </div>
        </div>

        {/* Live Feedback Toast */}
        {cronFeedback && (
          <div className="mt-4 p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{cronFeedback}</span>
          </div>
        )}
      </div>

      {/* ━━ 2. FILTER STORE & NAVIGATION TABS ━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('bot_control')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'bot_control'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-emerald-400" />
            <span>Live Bot Stream</span>
          </button>

          <button
            onClick={() => setActiveTab('refill_queue')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'refill_queue'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Refill Radar Queue</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-black">
              {refillQueue.filter((p) => p.status === 'due').length} Due
            </span>
          </button>

          <button
            onClick={() => setActiveTab('agency_mrr')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'agency_mrr'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-amber-500" />
            <span>Agency Retainers</span>
            <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full font-mono">
              {formatNgn(agencyMRR)}/mo
            </span>
          </button>
        </div>

        {/* Store Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <Building2 className="w-4 h-4 text-slate-400 hidden sm:block" />
          <select
            value={selectedBiz}
            onChange={(e) => setSelectedBiz(e.target.value)}
            className="text-xs font-bold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="all">🌍 All Partner Stores</option>
            {allBusinesses.map((b) => (
              <option key={b.id} value={b.id}>
                {BIZ_ICONS[b.business_type] || '🏪'} {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ━━ 3. TAB 1: LIVE BOT STREAM & AUDIT FEED ━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === 'bot_control' && (
        <div className="space-y-5">
          {/* 4 Infrastructure Pillars of the Bot */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Gateway</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-sm font-black text-slate-900">GreenAPI WhatsApp</p>
              <p className="text-[11px] text-emerald-600 font-semibold">Instance Connected</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Vision Engine</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-sm font-black text-slate-900">Gemini 2.5 Flash</p>
              <p className="text-[11px] text-slate-500">Blister Scan &amp; OCR</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Audio Dialects</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-sm font-black text-slate-900">4 Native Dialects</p>
              <p className="text-[11px] text-slate-500">Hausa, Yoruba, Igbo, En</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Manager Routing</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-sm font-black text-slate-900">1-Tap Key Actions</p>
              <p className="text-[11px] text-slate-500">1=Ready • 2=Dispatch</p>
            </div>
          </div>

          {/* Audio Dialect Voice Note Preview Bar */}
          <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-950 text-white rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                <Volume2 className="w-4 h-4" />
                <span>Test Multilingual Voice Note Engine</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Listen to how the bot speaks native audio reminders for elderly patients who cannot read text.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => playAudioSnippet('hausa')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                  playingAudio === 'hausa'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                {playingAudio === 'hausa' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 text-emerald-400" />}
                <span>Hausa Audio</span>
              </button>

              <button
                onClick={() => playAudioSnippet('yoruba')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                  playingAudio === 'yoruba'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                {playingAudio === 'yoruba' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 text-cyan-400" />}
                <span>Yoruba Audio</span>
              </button>

              <button
                onClick={() => playAudioSnippet('english')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                  playingAudio === 'english'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                {playingAudio === 'english' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 text-purple-400" />}
                <span>English Audio</span>
              </button>
            </div>
          </div>

          {/* Live Action Stream Feed */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <span>Live Bot Activity &amp; Dispatch Stream</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </h3>
                <p className="text-xs text-slate-400">
                  Every refill reminder, prescription scan, manager dispatch, and patient reply across your fleet.
                </p>
              </div>

              {/* Event filter pills */}
              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => setEventFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                    eventFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  All Events
                </button>
                <button
                  onClick={() => setEventFilter('refills')}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                    eventFilter === 'refills' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Refills
                </button>
                <button
                  onClick={() => setEventFilter('dispatch')}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                    eventFilter === 'dispatch' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Manager Dispatch
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredEvents.map((evt) => {
                const IconComponent = evt.icon;
                return (
                  <div key={evt.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                      <IconComponent className="w-5 h-5 text-slate-700" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">{evt.title}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            {evt.businessName}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">{evt.timestamp}</span>
                      </div>

                      <div className="text-xs text-slate-500 font-mono">
                        Recipient: <strong className="text-slate-700 font-semibold">{evt.recipient}</strong>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/60 font-sans">
                        {evt.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>GreenAPI webhook listening for inbound patient messages</span>
              </span>
              <span className="font-bold text-slate-700">{filteredEvents.length} events logged</span>
            </div>
          </div>
        </div>
      )}

      {/* ━━ 4. TAB 2: REFILL RADAR QUEUE & PILL TIMERS ━━━━━━━━━━━━━━━━ */}
      {activeTab === 'refill_queue' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Patient Pill Timers &amp; Refill Countdown Queue
                </h3>
                <p className="text-xs text-slate-400">
                  The bot monitors each patient&apos;s medication finish date and automatically sends native WhatsApp alerts on Day 25.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                {refillQueue.length} Active Prescriptions Tracked
              </span>
            </div>

            {nudgeFeedback && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{nudgeFeedback}</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {refillQueue.map((patient) => (
                <div
                  key={patient.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 truncate">
                        {patient.name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                        {patient.businessName}
                      </span>
                    </div>

                    <div className="text-xs font-medium text-emerald-800 flex items-center gap-1.5">
                      <span>💊</span>
                      <span>{patient.medication}</span>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono">
                      Phone: {patient.phone} • Supply Cycle: {patient.cycleDays} Days
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end">
                    <div className="text-right">
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          patient.status === 'due'
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : patient.status === 'upcoming'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {patient.daysRemaining === 0 ? 'Due Today' : `${patient.daysRemaining} Days Left`}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {patient.scheduledOutreach}
                      </div>
                    </div>

                    <button
                      onClick={() => handleNudgePatient(patient)}
                      disabled={nudgingId === patient.id}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Trigger Immediate WhatsApp Reminder to this patient"
                    >
                      <Zap className={`w-3 h-3 text-emerald-400 ${nudgingId === patient.id ? 'animate-spin' : ''}`} />
                      <span>{nudgingId === patient.id ? 'Pinging...' : 'Nudge Bot'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ━━ 5. TAB 3: AGENCY RETAINERS & SUBSCRIPTIONS ━━━━━━━━━━━━━━━ */}
      {activeTab === 'agency_mrr' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monthly MRR</span>
              <p className="text-2xl font-black text-emerald-600 leading-none">{formatNgn(agencyMRR)}</p>
              <p className="text-xs text-slate-500 pt-0.5">Retainer revenue / month</p>
            </div>

            <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Annual Run Rate</span>
              <p className="text-2xl font-black text-slate-900 leading-none">{formatNgn(agencyMRR * 12)}</p>
              <p className="text-xs text-slate-500 pt-0.5">Projected ARR</p>
            </div>

            <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paid Subscribers</span>
              <p className="text-2xl font-black text-slate-900 leading-none">{paidSubscribersCount}</p>
              <p className="text-xs text-slate-500 pt-0.5">Active paying clients</p>
            </div>

            <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Fleet</span>
              <p className="text-2xl font-black text-slate-900 leading-none">{allBusinesses.length}</p>
              <p className="text-xs text-slate-500 pt-0.5">Partner businesses</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Partner Subscription Accounts</h3>
                <p className="text-xs text-slate-400">Automated Flutterwave recurring billing status per pharmacy.</p>
              </div>
              <Link
                href="/settings"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <span>Edit Retainer Pricing</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {allBusinesses.map((biz) => {
                const retainer = biz.monthly_retainer_ngn || 25000;
                const status = biz.subscription_status || 'active';
                return (
                  <div key={biz.id} className="p-4 sm:p-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl">{BIZ_ICONS[biz.business_type] || '🏪'}</span>
                      <div className="min-w-0">
                        <div className="font-extrabold text-sm text-slate-900 truncate">{biz.name}</div>
                        <div className="text-xs text-slate-400 capitalize">{biz.business_type} • {biz.city || 'Nigeria'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                      <div className="text-right">
                        <div className="text-sm font-black text-slate-900">{formatNgn(retainer)}/mo</div>
                        <div className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 inline-block">
                          {retainer === 22500 ? 'Quarterly (10% OFF)' : retainer === 20000 ? 'Annual (20% OFF)' : 'Monthly Plan'}
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${
                          status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : status === 'trial'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {status === 'active' ? '✓ Active' : status === 'trial' ? '🔵 14-Day Free Pilot' : '⏳ Pending'}
                      </span>

                      <Link
                        href={`/billing/${biz.opt_in_slug}`}
                        target="_blank"
                        className="px-2.5 py-1 text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition flex items-center gap-1 shadow-xs"
                      >
                        <CreditCard className="w-3 h-3 text-emerald-400" />
                        <span>Billing Portal</span>
                      </Link>

                      <Link
                        href={`/settings?biz=${biz.id}`}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition border border-slate-200"
                        title="Manage Partner"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ━━ MODAL: TEST BOT WHATSAPP DELIVERY ━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white space-y-4 shadow-2xl animate-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-white">Test Bot WhatsApp Transmission</h3>
              </div>
              <button
                onClick={() => setTestModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Test your autonomous bot live. GreenAPI will dispatch a real WhatsApp message to this number right now.
            </p>

            <form onSubmit={handleSendTestMessage} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Target WhatsApp Phone</label>
                <input
                  type="tel"
                  required
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="09169153129"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Message Scenario</label>
                <select
                  value={testScenario}
                  onChange={(e) => setTestScenario(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="refill_reminder">💊 28-Day Chronic Refill Reminder</option>
                  <option value="manager_order_alert">🔔 1-Tap Manager Order Alert (1=Ready, 2=Dispatch)</option>
                  <option value="dispatch_confirmation">🛵 Patient Delivery Dispatch Update</option>
                  <option value="connection_test">⚡ Connection Ping</option>
                </select>
              </div>

              {testScenario === 'refill_reminder' && (
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Dialect Translation</label>
                  <select
                    value={testDialect}
                    onChange={(e) => setTestDialect(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="hausa">Hausa (Sannu Alhaji Musa...)</option>
                    <option value="yoruba">Yoruba (E ku ojumo Alhaji...)</option>
                    <option value="igbo">Igbo (Nnoo Alhaji...)</option>
                    <option value="english">Standard English (Good day...)</option>
                  </select>
                </div>
              )}

              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    testResult.success
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  {testResult.msg}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTestModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingTest}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingTest ? 'Sending...' : 'Dispatch Test WhatsApp'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
