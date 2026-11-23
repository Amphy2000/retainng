import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

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

// --- Multi-Business Knowledge Base ---
const KNOWN_BUSINESSES: Record<string, { name: string; type: string; location: string }> = {
  'apex-pharmacy': { name: 'Apex Health & Community Pharmacy', type: 'pharmacy', location: 'Kaduna' },
  'danfodio-pharmacy': { name: 'Danfodio Pharmacy', type: 'pharmacy', location: 'Barnawa, Kaduna' },
  'lekki-barbers': { name: 'Lekki Grooming & Barber Lounge', type: 'barber', location: 'Lekki, Lagos' },
  'yaba-glow': { name: 'Yaba Glow Hair Studio & Spa', type: 'salon', location: 'Yaba, Lagos' },
  'sparklewash-ikeja': { name: 'SparkleWash Express Laundry', type: 'laundry', location: 'Ikeja, Lagos' },
};

// --- Supabase Persistence Helpers ---
async function syncPatientToSupabase(params: {
  phone: string;
  fullName: string;
  slug: string;
  tag?: string;
  notes?: string;
}) {
  if (!supabaseAdmin) return;
  try {
    const { data: biz } = await supabaseAdmin
      .from('businesses')
      .select('id, name')
      .eq('opt_in_slug', params.slug)
      .maybeSingle();

    if (!biz) return;

    await supabaseAdmin.from('customers').upsert(
      {
        business_id: biz.id,
        phone: `+${params.phone}`,
        full_name: params.fullName || `Customer ...${params.phone.slice(-4)}`,
        tags: params.tag ? [params.tag] : ['Bag Slip Scan'],
        notes: params.notes,
        consent_status: 'consented',
        consent_source: 'qr_optin',
        last_visit_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'business_id,phone' }
    );
  } catch (err) {
    console.warn('Supabase sync warning:', err);
  }
}

async function recordOrderToSupabase(params: {
  phone: string;
  fullName: string;
  slug: string;
  orderItem: string;
  amountNgn?: number;
}) {
  if (!supabaseAdmin) return;
  try {
    const { data: biz } = await supabaseAdmin
      .from('businesses')
      .select('id, business_type')
      .eq('opt_in_slug', params.slug)
      .maybeSingle();

    if (!biz) return;

    const amount = params.amountNgn || (biz.business_type === 'pharmacy' ? 12000 : 8000);

    await supabaseAdmin.from('sales_or_visits').insert({
      business_id: biz.id,
      customer_name: params.fullName || 'Customer',
      customer_phone: `+${params.phone}`,
      service_or_product: params.orderItem || 'Prescription Refill',
      amount_ngn: amount,
      is_manual_entry: false,
    });
  } catch (err) {
    console.warn('Supabase order sync warning:', err);
  }
}

function resolveBusiness(slugOrText: string): { slug: string; name: string; type: string; location: string } | null {
  const lower = slugOrText.toLowerCase();

  // 1. Direct slug match
  if (KNOWN_BUSINESSES[lower]) {
    return { slug: lower, ...KNOWN_BUSINESSES[lower] };
  }

  // 2. Keyword matching in user message
  if (lower.includes('danfodio') || lower.includes('dan fodio')) {
    return { slug: 'danfodio-pharmacy', ...KNOWN_BUSINESSES['danfodio-pharmacy'] };
  }
  if (lower.includes('apex')) {
    return { slug: 'apex-pharmacy', ...KNOWN_BUSINESSES['apex-pharmacy'] };
  }
  if (lower.includes('barber') || lower.includes('haircut') || lower.includes('fade')) {
    return { slug: 'lekki-barbers', ...KNOWN_BUSINESSES['lekki-barbers'] };
  }

  // 3. Fallback for custom slug formatting (e.g. "my-pharmacy" -> "My Pharmacy")
  if (slugOrText && !slugOrText.includes(' ')) {
    const formattedName = slugOrText
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return { slug: slugOrText, name: formattedName, type: 'pharmacy', location: 'Kaduna' };
  }

  return null;
}

// --- Green-API credentials (read from Vercel environment variables) ---
const GREEN_API_ID = process.env.GREEN_API_ID || '710722811593';
const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN || 'c7cea54f5c6f4d31a9b74eb6576493a8ec085b4f65a04a62b5';
const GREEN_API_URL = process.env.GREEN_API_URL || 'https://7107.api.greenapi.com';

/** Look up manager phone for any slug — reads from /api/pharmacy-config with default fallback */
async function getManagerPhone(slug: string, host: string): Promise<string> {
  // Built-in default manager numbers (matches settings)
  const defaultManagerPhones: Record<string, string> = {
    'apex-pharmacy': '2349169153129',
    'danfodio-pharmacy': '2349169153129',
  };

  try {
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const res = await fetch(`${protocol}://${host}/api/pharmacy-config?slug=${encodeURIComponent(slug)}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.managerPhone) return data.managerPhone.replace(/[^0-9]/g, '');
    }
  } catch {
    // fallback below
  }
  return defaultManagerPhones[slug] || '2349169153129';
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
    return `No wahala at all! 💊 We have received your refill request.\n\nWould you like home delivery or will you pick it up at the pharmacy?\nORDER_DETECTED: ${msg.trim()}`;
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
    return `📍 Got your address! Our team will prepare your order and call you to confirm delivery soon.\nORDER_DETECTED: delivery request`;
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
    return `That is a great question! 🩺 For accurate clinical advice, please speak with our pharmacist directly. You can also call or visit us during opening hours.`;
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
    return `👋 Hello! Welcome to RetainNG Health Concierge. How can we help you today? If your medication is running low, just let us know!`;
  }
  return `Hello! 👋 We are here to help with medication refills, delivery, and health queries. How can we assist you today?`;
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

    // Only ignore if the message was sent by the active bot number itself to prevent loops
    const activeBotNumber = '2347032673310';
    if (cleanPhone === activeBotNumber) {
      return NextResponse.json({ ignored: 'self-message' });
    }

    if (!messageBody.trim()) {
      return NextResponse.json({ ignored: 'empty-message' });
    }

    // --- Multi-Business attribution resolution ---
    const refMatch = messageBody.match(/\[ref:([a-zA-Z0-9_-]+)\]/i);
    const resolvedBiz = resolveBusiness(refMatch ? refMatch[1] : messageBody);
    const activeSlug = resolvedBiz?.slug || (refMatch ? refMatch[1] : 'general');
    const activeBizName = resolvedBiz?.name || (refMatch ? refMatch[1] : null);

    // If first-time scan with [ref:...]
    if (refMatch) {
      // Sync patient to Supabase
      syncPatientToSupabase({
        phone: cleanPhone,
        fullName: profileName || '',
        slug: activeSlug,
        tag: 'Bag Slip Scan',
      }).catch(() => {});

      const greeting = profileName ? ` ${profileName}` : '';
      const bizDisplay = activeBizName || 'your pharmacy';
      const reply =
        `🎉 *Welcome${greeting} to ${bizDisplay} Care Concierge!*\n\n` +
        `Your phone number (*...${cleanPhone.slice(-4)}*) is now linked to ${bizDisplay}. ` +
        `You will *never need to scan or type a code again.* 💊\n\n` +
        `To help our team remind you on time before your medications finish:\n` +
        `👉 *What medication did you pick up today?* (e.g. _"BP drugs"_, _"Diabetes"_, _"Malaria"_, or _"Vitamins"_)\n\n` +
        `Just reply here with the name, and we'll take care of the rest!`;

      await sendWhatsApp(cleanPhone, reply);

      // Alert the manager about the new patient onboarded!
      const managerPhone = await getManagerPhone(activeSlug, host);
      if (managerPhone && managerPhone !== cleanPhone) {
        const onboardAlert =
          `🚨 *NEW PATIENT LINKED — ${bizDisplay}*\n\n` +
          `👤 *Patient:* ${profileName || 'Customer'} (WhatsApp: ...${cleanPhone.slice(-4)})\n` +
          `📱 *Phone:* +${cleanPhone}\n` +
          `✅ Linked via Prescription Bag Slip QR.\n` +
          `⏱️ AI is actively profiling medication for automated reminder schedule.`;

        await sendWhatsApp(managerPhone, onboardAlert);
      }

      return NextResponse.json({ success: true, intent: 'onboard', business: bizDisplay, phone: cleanPhone });
    }

    // =========================================================
    // CONVERSATIONS — Powered by Gemini 2.5 Flash
    // =========================================================
    const displayName = profileName || `Customer (...${cleanPhone.slice(-4)})`;

    let systemPrompt = '';
    if (activeBizName) {
      systemPrompt = `You are a warm, highly competent AI concierge for ${activeBizName} in ${resolvedBiz?.location || 'Nigeria'}.
The client messaging you is named: ${displayName}
Their phone ending in: ...${cleanPhone.slice(-4)}

Your guidelines:
1. Respond helpfully, warmly, and concisely in simple Nigerian English (using friendly natural phrasing).
2. If the user just states their medication name (e.g. "BP", "Amlodipine", "Metformin", "Malaria", "Vitamins"):
   - For Chronic (BP, Diabetes, Heart, Ulcer): warmly confirm you have scheduled their reminder for 25 days before it finishes.
   - For Acute (Malaria, Antibiotics, Cough, Typhoid): warmly wish them a speedy recovery and let them know you'll check in on them in 4 days to make sure they are feeling better.
   - For Vitamins / Family Essentials: confirm you have set their 30-day reminder.
3. If they mention refills, medications (e.g. Amlodipine, Metformin, BP, diabetes): acknowledge their request warmly on behalf of ${activeBizName} and ask if they prefer home delivery or store pickup.
4. If they provide a delivery address: confirm the address warmly and let them know the ${activeBizName} team is packaging it and will call them to confirm dispatch.
5. If they ask clinical/service questions: give a clear, safe, accurate brief answer and invite them to speak with the pharmacist/manager if needed.
6. NEVER repeat menus or say "reply 1 for this, reply 2 for that". Be human, conversational, empathetic, and attentive.
7. Keep replies concise (under 80 words).

Important: If the patient is ordering or refilling a product/service, append this exact tag at the very end of your response on its own line:
ORDER_DETECTED: [item or medication name]`;
    } else {
      systemPrompt = `You are a warm, highly competent AI concierge for RetainNG (the customer retention & refill concierge network in Nigeria).
You represent partner businesses including Danfodio Pharmacy (Barnawa, Kaduna), Apex Health & Community Pharmacy, and Lekki Grooming & Barber Lounge.
The client messaging you is named: ${displayName}
Their phone ending in: ...${cleanPhone.slice(-4)}

Your guidelines:
1. Greet them warmly as RetainNG Concierge in friendly Nigerian English.
2. If they ask for a refill or service without stating which pharmacy or store they visit: ask them warmly which of our partner stores or pharmacies they are registered with (e.g. Danfodio Pharmacy, Apex Health, etc.) so you can route their order immediately.
3. If they mention a specific store name, acknowledge it and assist them with their request for that store.
4. Keep replies friendly, concise, and helpful (under 80 words).

Important: If an order or refill item is detected, append this exact tag at the very end of your response on its own line:
ORDER_DETECTED: [item name]`;
    }

    let aiReply = '';
    let isOrder = false;
    let detectedMed = '';

    try {
      const rawAiReply = await callGeminiAI(systemPrompt, messageBody);

      if (rawAiReply.includes('ORDER_DETECTED:')) {
        const lines = rawAiReply.split('\n');
        const orderLine = lines.find((l) => l.startsWith('ORDER_DETECTED:'));
        if (orderLine) {
          detectedMed = orderLine.replace('ORDER_DETECTED:', '').trim() || messageBody;
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
      // Fallback if AI service is temporarily unavailable
      const kwResult = detectIntentKeywords(messageBody);
      if (kwResult.startsWith('INTENT:REFILL')) {
        detectedMed = messageBody.trim();
        isOrder = true;
        aiReply =
          `Got it ${displayName}! 💊 We have received your refill request for *${detectedMed}*.\n\n` +
          `Which pharmacy should we prepare this with — Danfodio Pharmacy or Apex Health? And would you like pickup or home delivery?`;
      } else if (kwResult.startsWith('INTENT:DELIVERY')) {
        isOrder = true;
        aiReply =
          `📍 Perfect! We have noted your delivery address:\n*${messageBody.trim()}*\n\n` +
          `Our dispensary team will call you shortly to confirm and dispatch your order.`;
      } else {
        aiReply =
          `Hello ${displayName}! 👋 Welcome to RetainNG Health & Care Concierge.\n\n` +
          `Which of our partner pharmacies or stores are you reaching today? (e.g. Danfodio Pharmacy or Apex Health) Let us know and we'll assist you right away! 💊`;
      }
    }

    // Send the human, AI-generated reply to the patient
    await sendWhatsApp(cleanPhone, aiReply);

    // Send manager dispatch alert for refill orders
    if (isOrder) {
      // Record refill order to Supabase
      recordOrderToSupabase({
        phone: cleanPhone,
        fullName: displayName,
        slug: activeSlug,
        orderItem: detectedMed || messageBody,
      }).catch(() => {});

      const managerPhone = await getManagerPhone(activeSlug, host);
      if (managerPhone && managerPhone !== cleanPhone) {
        const targetStore = activeBizName || 'RetainNG Partner Store';
        const managerAlert =
          `🚨 *NEW REFILL / SERVICE ORDER — ${targetStore}*\n\n` +
          `👤 *Customer:* ${displayName} (WhatsApp: ...${cleanPhone.slice(-4)})\n` +
          `💊 *Order / Request:* ${detectedMed || messageBody}\n` +
          `⏱️ *Status:* Clock reset for 28 days.\n` +
          `📞 Please check with dispensary & call patient to confirm.`;

        await sendWhatsApp(managerPhone, managerAlert);
      }
    }

    return NextResponse.json({
      success: true,
      phone: cleanPhone,
      name: displayName,
      business: activeBizName || 'RetainNG Network',
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
