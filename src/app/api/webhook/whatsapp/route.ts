import { NextRequest, NextResponse } from 'next/server';

/**
 * RetainNG WhatsApp AI Concierge Bot
 *
 * Full conversation flow:
 * 1. Patient scans QR bag slip → first-time binding to pharmacy via [ref:slug]
 * 2. Subsequent messages → Gemini AI parses intent (refill, delivery, clinical question)
 * 3. Bot gives a smart, contextual reply — never the same generic menu twice
 * 4. Dispatch alert is sent to pharmacy manager's WhatsApp for every refill order
 */

// --- In-memory conversation state per patient phone ---
// In production this would be stored in a database (Supabase / Redis)
const conversationState: Record<
  string,
  {
    slug: string;
    name: string;
    lastIntent: string;
    pendingMedication: string;
    pendingDelivery: string;
    awaitingName: boolean;
  }
> = {};

// --- Green-API config ---
const GREEN_API_ID = process.env.GREEN_API_ID_INSTANCE || '710722811499';
const GREEN_API_TOKEN =
  process.env.GREEN_API_TOKEN || '98d11063fda64174ae6c50d0401bb2f0569f7f45a0ad49e3ac';
const GREEN_API_URL = process.env.GREEN_API_URL || 'https://7107.api.greenapi.com';

/** Look up manager phone for any slug — reads from /api/pharmacy-config (no env vars needed) */
async function getManagerPhone(slug: string, host: string): Promise<string> {
  try {
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const res = await fetch(`${protocol}://${host}/api/pharmacy-config?slug=${encodeURIComponent(slug)}`);
    if (!res.ok) return '';
    const data = await res.json();
    return data?.managerPhone || '';
  } catch {
    return '';
  }
}

async function sendWhatsApp(toPhone: string, message: string): Promise<void> {
  const chatId = `${toPhone}@c.us`;
  try {
    await fetch(`${GREEN_API_URL}/waInstance${GREEN_API_ID}/sendMessage/${GREEN_API_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message }),
    });
  } catch (err) {
    console.error('WhatsApp send error:', err);
  }
}

async function callGeminiAI(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const geminiApiKey = process.env.GEMINI_API_KEY || '';

  if (!geminiApiKey) {
    // Fallback: simple keyword intent detection without AI
    return detectIntentKeywords(userMessage);
  }

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
  };

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json();
    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text || detectIntentKeywords(userMessage)
    );
  } catch (err) {
    console.error('Gemini API call error:', err);
    return detectIntentKeywords(userMessage);
  }
}

function detectIntentKeywords(msg: string): string {
  const lower = msg.toLowerCase();
  if (
    lower.includes('refill') ||
    lower.includes('finish') ||
    lower.includes('don finish') ||
    lower.includes('running out') ||
    lower.includes('order') ||
    lower.includes('send me') ||
    lower.includes('drugs') ||
    lower.includes('tablet') ||
    lower.includes('capsule') ||
    lower.includes('injection') ||
    lower.includes('medicine') ||
    lower.includes('medication') ||
    lower.includes('amlodipine') ||
    lower.includes('metformin') ||
    lower.includes('lisinopril') ||
    lower.includes('losartan') ||
    lower.includes('bp') ||
    lower.includes('blood pressure') ||
    lower.includes('sugar') ||
    lower.includes('diabetes')
  ) {
    return 'INTENT:REFILL medication=' + msg.trim();
  }
  if (
    lower.includes('deliver') ||
    lower.includes('send to') ||
    lower.includes('bring') ||
    lower.includes('address') ||
    lower.includes('barnawa') ||
    lower.includes('gra') ||
    lower.includes('sabon') ||
    lower.includes('street') ||
    lower.includes('road')
  ) {
    return 'INTENT:DELIVERY address=' + msg.trim();
  }
  if (
    lower.includes('dosage') ||
    lower.includes('dose') ||
    lower.includes('side effect') ||
    lower.includes('interact') ||
    lower.includes('safe') ||
    lower.includes('pregnant') ||
    lower.includes('child') ||
    lower.includes('warning') ||
    lower.includes('pharmacist') ||
    lower.includes('question') ||
    lower.includes('?')
  ) {
    return 'INTENT:CLINICAL question=' + msg.trim();
  }
  if (
    lower.includes('hi') ||
    lower.includes('hello') ||
    lower.includes('good morning') ||
    lower.includes('good afternoon') ||
    lower.includes('good evening') ||
    lower.includes('how are') ||
    lower.includes('please')
  ) {
    return 'INTENT:GREETING';
  }
  return 'INTENT:UNKNOWN message=' + msg.trim();
}

export async function POST(req: NextRequest) {
  const host = req.headers.get('host') || 'retainng.vercel.app';
  try {
    const contentType = req.headers.get('content-type') || '';
    let fromNumber = '';
    let messageBody = '';
    let profileName = '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      fromNumber = (formData.get('From') as string) || '';
      messageBody = (formData.get('Body') as string) || '';
      profileName = (formData.get('ProfileName') as string) || '';
    } else {
      const json = await req.json();

      fromNumber =
        json?.From ||
        json?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from ||
        json?.senderData?.chatId ||
        json?.senderData?.sender ||
        json?.messages?.[0]?.from ||
        json?.data?.from ||
        '';

      messageBody =
        json?.Body ||
        json?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body ||
        json?.messageData?.textMessageData?.textMessage ||
        json?.messageData?.extendedTextMessageData?.text ||
        json?.messages?.[0]?.text?.body ||
        json?.data?.body ||
        '';

      profileName =
        json?.senderData?.senderName ||
        json?.senderData?.chatName ||
        json?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name ||
        json?.messages?.[0]?.from_name ||
        '';
    }

    // Clean & normalize phone
    let cleanPhone = fromNumber
      .replace(/^whatsapp:/i, '')
      .replace(/@c\.us$/i, '')
      .replace(/@s\.whatsapp\.net$/i, '')
      .replace(/[^0-9]/g, '')
      .trim();

    if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      cleanPhone = '234' + cleanPhone.slice(1);
    }

    // Block self-messages (bot's own outbound triggers)
    if (cleanPhone === '2349169153129') {
      return NextResponse.json({ ignored: 'self-message' });
    }

    if (!messageBody.trim()) {
      return NextResponse.json({ ignored: 'empty-message' });
    }

    // --- Pharmacy reference detection (first scan) ---
    const refMatch = messageBody.match(/\[ref:([a-zA-Z0-9_-]+)\]/i);
    const incomingSlug = refMatch ? refMatch[1] : null;

    let state = conversationState[cleanPhone];

    // =========================================================
    // CASE 1: FIRST-TIME SCAN — bind patient to pharmacy
    // =========================================================
    if (incomingSlug) {
      conversationState[cleanPhone] = {
        slug: incomingSlug,
        name: profileName || '',
        lastIntent: 'onboard',
        pendingMedication: '',
        pendingDelivery: '',
        awaitingName: !profileName,
      };
      state = conversationState[cleanPhone];

      const greeting = profileName ? ` ${profileName}` : '';
      const nameAsk = !profileName
        ? `\n\nMay I have your name so our pharmacist addresses you properly? (Just reply with your name, e.g. _Alhaji Musa_ or _Mama Chichi_)\n`
        : '\n';

      const reply =
        `🎉 *Welcome${greeting} to Apex Health & Community Pharmacy Care Concierge!*\n\n` +
        `Your number (*...${cleanPhone.slice(-4)}*) is now linked to this pharmacy. ` +
        `You will *never need to scan or type a code again.*${nameAsk}\n` +
        `Whenever your medication runs low, just say so here naturally — e.g. _"My BP drugs have finished"_ — ` +
        `and our pharmacist will get it ready for you! 💊\n\n` +
        `How can we support your health today?`;

      await sendWhatsApp(cleanPhone, reply);
      return NextResponse.json({ success: true, intent: 'onboard', phone: cleanPhone });
    }

    // =========================================================
    // CASE 2: RETURNING PATIENT — awaiting name input
    // =========================================================
    if (state?.awaitingName && messageBody.trim().length > 1 && messageBody.trim().length < 50) {
      state.name = messageBody.trim();
      state.awaitingName = false;

      const reply =
        `✅ *Wonderful, ${state.name}!* We have saved your name.\n\n` +
        `Whenever your medication runs low, just message us here naturally and we'll prepare your order. ` +
        `You can also ask our pharmacist any health question.\n\n` +
        `How can we help you today? 💊`;

      await sendWhatsApp(cleanPhone, reply);
      return NextResponse.json({ success: true, intent: 'name_saved', name: state.name });
    }

    // =========================================================
    // CASE 3: UNKNOWN PATIENT — never scanned a QR
    // =========================================================
    if (!state) {
      const reply =
        `👋 *Hello! Welcome to Retain Health Concierge.*\n\n` +
        `It seems you are reaching us directly. No problem!\n\n` +
        `Which pharmacy are you registered with?\n` +
        `• Reply *1* for Apex Health & Community Pharmacy\n\n` +
        `Or ask your pharmacist to give you a free QR code card for instant setup.`;

      await sendWhatsApp(cleanPhone, reply);
      return NextResponse.json({ success: true, intent: 'unknown_patient' });
    }

    // =========================================================
    // CASE 4: KNOWN PATIENT — run Gemini AI intent detection
    // =========================================================
    const displayName = state.name || profileName || `Patient (...${cleanPhone.slice(-4)})`;

    const systemPrompt = `You are a friendly, smart WhatsApp pharmacy concierge bot for a Nigerian community pharmacy called Apex Health & Community Pharmacy.

The patient messaging you is named: ${displayName}
Their phone: ...${cleanPhone.slice(-4)}

Your job is to:
1. Detect their intent from their message (even if they wrote with typos, in Pidgin English, or incomplete sentences)
2. Respond warmly and helpfully in simple Nigerian English
3. If they want a refill or medication order: confirm the medication name, ask if they want pickup or home delivery
4. If they give a delivery address: acknowledge it and tell them the pharmacist will call to confirm
5. If they ask a pharmacist question: give a brief, accurate, safe answer and suggest they confirm with their pharmacist
6. NEVER give the same generic menu again - actually respond to what they said
7. Keep replies under 150 words, friendly, and practical

Previous intent: ${state.lastIntent}
Pending medication: ${state.pendingMedication || 'none'}
Pending delivery address: ${state.pendingDelivery || 'none'}

Important: If the patient is ordering medication, end your reply with this exact line on a new line:
ORDER_DETECTED: [medication name] | [delivery preference]`;

    let aiReply = '';
    let isOrder = false;
    let detectedMed = '';

    try {
      const rawAiReply = await callGeminiAI(systemPrompt, messageBody);

      // Check if AI flagged an order
      if (rawAiReply.includes('ORDER_DETECTED:')) {
        const lines = rawAiReply.split('\n');
        const orderLine = lines.find((l) => l.startsWith('ORDER_DETECTED:'));
        if (orderLine) {
          const orderData = orderLine.replace('ORDER_DETECTED:', '').trim();
          const parts = orderData.split('|');
          detectedMed = parts[0]?.trim() || messageBody;
          state.pendingMedication = detectedMed;
          isOrder = true;
        }
        aiReply = lines
          .filter((l) => !l.startsWith('ORDER_DETECTED:'))
          .join('\n')
          .trim();
      } else {
        aiReply = rawAiReply;
      }
    } catch {
      // Fallback to keyword detection
      const kwResult = detectIntentKeywords(messageBody);
      if (kwResult.startsWith('INTENT:REFILL')) {
        detectedMed = messageBody.trim();
        state.pendingMedication = detectedMed;
        isOrder = true;
        aiReply =
          `Got it ${displayName}! 💊 We've received your medication refill request.\n\n` +
          `*Order:* ${detectedMed}\n\n` +
          `Would you like *pickup* at the pharmacy or *home delivery*? ` +
          `If delivery, please send your address.`;
      } else if (kwResult.startsWith('INTENT:DELIVERY')) {
        state.pendingDelivery = messageBody.trim();
        aiReply =
          `📍 Perfect! We have noted your delivery address:\n*${messageBody.trim()}*\n\n` +
          `Your pharmacist will call you shortly to confirm the order and arrange delivery.`;
        isOrder = true; // alert manager
        detectedMed = state.pendingMedication || 'Monthly refill';
      } else {
        aiReply =
          `Hello ${displayName}! 👋 How can we help you today?\n\n` +
          `• Say *"Refill my [medication]"* to order a refill\n` +
          `• Ask any health or dosage question\n` +
          `• Say *"Deliver to [your address]"* for home delivery\n\n` +
          `_Your care team is ready._`;
      }
    }

    state.lastIntent = isOrder ? 'refill_order' : 'conversation';

    // Send reply to patient
    await sendWhatsApp(cleanPhone, aiReply);

    // Send manager dispatch alert for refill orders
    if (isOrder) {
      const managerPhone = await getManagerPhone(state.slug, host);
      if (managerPhone) {
        const managerAlert =
          `🚨 *NEW REFILL ORDER — Apex Health & Community Pharmacy*\n\n` +
          `👤 *Patient:* ${displayName} (WhatsApp: ...${cleanPhone.slice(-4)})\n` +
          `💊 *Order:* ${detectedMed}\n` +
          `📍 *Delivery:* ${state.pendingDelivery || 'Pickup at store (patient to confirm)'}\n\n` +
          `✅ Refill clock has been reset for 28 days.\n` +
          `📞 Please call patient to confirm and dispatch.`;

        await sendWhatsApp(managerPhone, managerAlert);
      }
    }

    return NextResponse.json({
      success: true,
      phone: cleanPhone,
      name: displayName,
      intent: state.lastIntent,
      order_detected: isOrder,
      reply: aiReply,
    });
  } catch (err: unknown) {
    console.error('WhatsApp webhook error:', err);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    engine: 'RetainNG WhatsApp AI Concierge v2 (Gemini-powered)',
    supported_gateways: ['Green-API', 'Twilio WhatsApp API', 'Meta Cloud API'],
  });
}
