import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
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

/** Sends native voice note / audio message via Green-API */
async function sendWhatsAppVoice(toPhone: string, audioUrl: string): Promise<void> {
  const cleanPhone = toPhone.replace(/[^0-9]/g, '');
  const chatId = `${cleanPhone}@c.us`;
  try {
    const res = await fetch(`${GREEN_API_URL}/waInstance${GREEN_API_ID}/sendFileByUrl/${GREEN_API_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId,
        urlFile: audioUrl,
        fileName: 'voice_note.mp3',
        caption: '🎙️ RetainNG Audio Message',
      }),
    });
    if (!res.ok) {
      console.warn('WhatsApp voice send warning (non-200):', res.status, await res.text());
    }
  } catch (err) {
    console.warn('WhatsApp voice send warning:', err);
  }
}

interface ChatTurn {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

// In-memory sliding window of conversation history per phone number (last 6 turns)
const userConversationHistory: Record<string, ChatTurn[]> = {};

async function callGeminiAI(
  systemPrompt: string,
  userMessage: string,
  audioData?: { base64: string; mimeType: string },
  imageData?: { base64: string; mimeType: string },
  phoneKey?: string,
  rememberedDialect?: string
): Promise<string> {
  const geminiApiKey = process.env.GEMINI_API_KEY || '';

  if (!geminiApiKey) {
    console.warn('GEMINI_API_KEY not configured, falling back to intent detection');
    return detectIntentKeywords(userMessage, rememberedDialect);
  }

  // 1. Clean audio & image MIME types (e.g. remove '; codecs=opus' which Google rejects with 400)
  let cleanAudioMime = audioData?.mimeType ? audioData.mimeType.split(';')[0].trim() : 'audio/ogg';
  if (cleanAudioMime === 'audio/opus') cleanAudioMime = 'audio/ogg';
  const cleanImageMime = imageData?.mimeType ? imageData.mimeType.split(';')[0].trim() : 'image/jpeg';

  // 2. Format conversation context into the prompt (universal compatibility across all Gemini endpoints)
  let conversationHistoryContext = '';
  if (phoneKey && userConversationHistory[phoneKey] && userConversationHistory[phoneKey].length > 0) {
    const history = userConversationHistory[phoneKey].slice(-6);
    conversationHistoryContext = `\n\n📜 RECENT CONVERSATION HISTORY (What was just discussed with this patient):\n` +
      history
        .map((h) => `${h.role === 'user' ? 'Patient' : 'Assistant'}: "${h.parts?.[0]?.text || ''}"`)
        .join('\n') +
      `\n\n🚨 CRITICAL CONTINUATION INSTRUCTION:
The patient's new message is directly replying to the conversation history above!
- If the patient replies "Yes", "Okay", "Gida", "Kawo", "Karba", "Pick up", "Delivery", or confirms an offer: understand their reply in context of the last question!
- If you asked whether they want delivery or pickup, and they say "Yes" or "Deliver", confirm delivery and ask for their address or let them know it's being packed.
- If you asked which pharmacy they use, and they name one, route them to that pharmacy.
- ALWAYS respond in the exact language or dialect the patient is using (Hausa, Yoruba, Igbo, Pidgin, or English)!
- NEVER cut off your sentence in the middle. Complete your full message before outputting the metadata tags.`;
  }

  const combinedInstructions = `${systemPrompt}${conversationHistoryContext}`;

  const currentParts: Array<Record<string, unknown>> = [];
  if (audioData?.base64) {
    currentParts.push({
      inlineData: {
        mimeType: cleanAudioMime,
        data: audioData.base64,
      },
    });
    currentParts.push({
      text: 'Listen carefully to this audio voice note message. The patient is speaking in their native language or local Nigerian dialect (Hausa, Yoruba, Igbo, Nigerian Pidgin, English, or Arabic). Understand their health or refill need and respond in that exact dialect.',
    });
  }
  if (imageData?.base64) {
    currentParts.push({
      inlineData: {
        mimeType: cleanImageMime,
        data: imageData.base64,
      },
    });
    currentParts.push({
      text: "The patient has sent a photo of their medication, blister strip, medicine container, or doctor's prescription paper. Carefully read the text on the pack: identify the exact medication name (brand or generic), dosage/strength (e.g. 10mg, 500mg, 1g), and quantity if visible. Confirm what you see and help them arrange their refill.",
    });
  }

  const userQueryText = userMessage.trim() && userMessage !== '[Voice Note Message]' && userMessage !== '[Photo of medication blister pack or doctor prescription]'
    ? userMessage
    : 'Please assist me with my health or medication refill request.';

  currentParts.push({
    text: `System & Medical Instructions:\n${combinedInstructions}\n\nPatient's Current Message:\n"${userQueryText}"`,
  });

  const body = {
    contents: [
      {
        role: 'user',
        parts: currentParts,
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
    },
  };

  // 3. Robust multi-model fallback chain (Active Verified Google Gemini Models)
  const MODELS_TO_TRY = [
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-2.5-flash-lite',
    'gemini-2.5-pro',
  ];

  for (const model of MODELS_TO_TRY) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`Gemini model ${model} returned status ${res.status}:`, errText.slice(0, 180));
        continue; // Try next model in chain
      }

      const data = await res.json();
      const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (replyText && replyText.trim()) {
        return replyText.trim();
      }
    } catch (err) {
      console.warn(`Gemini model ${model} fetch exception:`, err);
    }
  }

  console.error('All Gemini models exhausted or failed, falling back to contextual keywords');
  return detectIntentKeywords(userMessage, rememberedDialect);
}

function detectIntentKeywords(msg: string, preferredDialect?: string): string {
  const lower = msg.toLowerCase().trim();
  const isHausa = preferredDialect === 'Hausa' || lower.includes('hawan jini') || lower.includes('ciwon suga') || lower.includes('magani') || lower.includes('sannu') || lower.includes('kare') || lower.includes('gida') || lower.includes('kawo') || lower.includes('karba') || lower.includes('eh') || lower.includes('toh') || lower.includes('nagode');
  const isYoruba = preferredDialect === 'Yoruba' || lower.includes('eje riru') || lower.includes('atogbe') || lower.includes('oogun') || lower.includes('beeni') || lower.includes('ile') || lower.includes('e se');
  const isIgbo = preferredDialect === 'Igbo' || lower.includes('mgbali elu') || lower.includes('shuga') || lower.includes('ogwu') || lower.includes('ulo') || lower.includes('dalu');

  // 1. AFFIRMATION / CONFIRMATION (Patient answering "Yes", "Okay", "Eh", "To", "Sure")
  const isAffirmation =
    lower === 'yes' ||
    lower === 'yess' ||
    lower === 'yeah' ||
    lower === 'yup' ||
    lower === 'e' ||
    lower === 'eh' ||
    lower === 'ee' ||
    lower === 'to' ||
    lower === 'toh' ||
    lower === 'beeni' ||
    lower === 'okay' ||
    lower === 'ok' ||
    lower === 'sure' ||
    lower.startsWith('yes ') ||
    lower.startsWith('okay ') ||
    lower.startsWith('to ') ||
    lower.startsWith('eh ');

  if (isAffirmation) {
    if (isHausa) {
      return `To madalla! 💊 Mun karbi bukatarku. Kuna son a turo muku gida ne (don Allah ku turo adireshinku) ko kuma za ku zo ku karba a shagon magani?\nLANG: ha\nORDER_DETECTED: Refill Confirmation`;
    }
    if (isYoruba) {
      return `O da pupo! 💊 A ti gba idahun yin. Se e fe ki a fi ranse si ile ni (e jowo e fi adiresi ranse) tabi e ma wa gba ni ile-ise oogun wa?\nLANG: yo\nORDER_DETECTED: Refill Confirmation`;
    }
    if (isIgbo) {
      return `O di mma! 💊 Anyi anabatala nkwenye gi. O bu ka e ziteere gi ya n'ulo (biko zitere anyi adreesi gi) ka o bu na i ga-abia nata ya?\nLANG: ig\nORDER_DETECTED: Refill Confirmation`;
    }
    return `Awesome! 💊 We have received your confirmation. Would you like home delivery (please reply with your delivery address) or will you pick it up at the pharmacy counter?\nLANG: en\nORDER_DETECTED: Refill Confirmation`;
  }

  // 2. COUNTER PICKUP CONFIRMATION
  if (
    lower.includes('pick') ||
    lower.includes('pickup') ||
    lower.includes('karba') ||
    lower.includes('shago') ||
    lower.includes('zan zo') ||
    lower.includes('counter') ||
    lower.includes('store')
  ) {
    if (isHausa) {
      return `🏪 Madalla! Za a ajiye muku maganinku a shagon magani. Da zarar kun iso, sai a mika muku nan take!\nLANG: ha\nORDER_DETECTED: Counter Pickup`;
    }
    if (isYoruba) {
      return `🏪 O da! A ma toju oogun yin si ile-ise oogun wa. Te ba de be, e ma gba oogun yin lekun-unrere!\nLANG: yo\nORDER_DETECTED: Counter Pickup`;
    }
    return `🏪 Perfect! Your medication will be prepared and kept ready at the pharmacy counter for quick pickup.\nLANG: en\nORDER_DETECTED: Counter Pickup`;
  }

  // 3. HOME DELIVERY / ADDRESS
  if (
    lower.includes('deliver') ||
    lower.includes('send to') ||
    lower.includes('bring') ||
    lower.includes('address') ||
    lower.includes('gida') ||
    lower.includes('kawo') ||
    lower.includes('aiko') ||
    lower.includes('barnawa') ||
    lower.includes('gra') ||
    lower.includes('sabon') ||
    lower.includes('street') ||
    lower.includes('road') ||
    lower.includes('close') ||
    lower.includes('estate')
  ) {
    if (isHausa) {
      return `📍 Mun gane! Za a kawo muku maganinku har gida nan take. Masinjinmu zai kira ku kafin ya iso.\nLANG: ha\nORDER_DETECTED: Home delivery (${msg.trim()})`;
    }
    if (isYoruba) {
      return `📍 A ti gba adiresi yin! A ma fi oogun ranse si ile fun yin laipe. Omo-ise wa ma pe yin.\nLANG: yo\nORDER_DETECTED: Home delivery (${msg.trim()})`;
    }
    return `📍 Got your delivery address! Our dispensary team is packaging your order right away and our dispatch rider will call you shortly.\nLANG: en\nORDER_DETECTED: Home delivery (${msg.trim()})`;
  }

  // 4. GRATITUDE (Thank you / Nagode)
  if (
    lower.includes('thank') ||
    lower.includes('thanks') ||
    lower.includes('nagode') ||
    lower.includes('na gode') ||
    lower.includes('e se') ||
    lower.includes('dalu')
  ) {
    if (isHausa) {
      return `Ba komai! Muna muku fatan koshin lafiya da samun sauki a koda yaushe. Idan kuna bukatar wani abu, ku sanar da mu kawai! 😊\nLANG: ha`;
    }
    if (isYoruba) {
      return `Ko t'ope o! A gbadura pe ara yin a le dada. E ma pe wa te ba nilo nkan miiran! 😊\nLANG: yo`;
    }
    return `You're very welcome! Wishing you great health and quick recovery always. If you ever need advice or a refill, we're always right here for you! 😊\nLANG: en`;
  }

  // 5. INQUIRIES ("Do you have", "What of", "Kuna da", "?")
  const isInquiry =
    lower.includes('do you have') ||
    lower.includes('what of') ||
    lower.includes('is there') ||
    lower.includes('kuna da') ||
    lower.includes('nawa ne') ||
    lower.includes('how much') ||
    lower.includes('available') ||
    lower.includes('?');

  if (isInquiry) {
    if (isHausa) {
      return `Sannu! 💊 E, muna da wannan maganin a shagon maganinmu. Kuna son a kawo muku gida ne ko za ku zo ku karba?\nLANG: ha\nORDER_DETECTED: ${msg.trim()}`;
    }
    if (isYoruba) {
      return `E ku ojumo! 💊 Beeni, a ni oogun yii ni ile-ise oogun wa. Se e fe ki a fi ranse si ile ni tabi e ma wa gba?\nLANG: yo\nORDER_DETECTED: ${msg.trim()}`;
    }
    if (isIgbo) {
      return `Nnoo! 💊 Ee, anyi nwere ogwu a n'ulo ogwu anyi. O bu ka e ziteere gi ya n'ulo ka o bu na i ga-abia n'onwe gi nata ya?\nLANG: ig\nORDER_DETECTED: ${msg.trim()}`;
    }
    return `Yes! 💊 We have that medication available in our pharmacy network. Would you like us to prepare a pack for home delivery or pharmacy pickup?\nLANG: en\nORDER_DETECTED: ${msg.trim()}`;
  }

  // 6. GENERAL REFILL / MEDICATIONS (English / Pidgin / Hausa / Yoruba / Igbo)
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
    lower.includes('medicine') ||
    lower.includes('medication') ||
    lower.includes('magani') ||
    lower.includes('oogun') ||
    lower.includes('ogwu') ||
    lower.includes('amlodipine') ||
    lower.includes('metformin') ||
    lower.includes('lisinopril') ||
    lower.includes('losartan') ||
    lower.includes('bp') ||
    lower.includes('blood pressure') ||
    lower.includes('sugar') ||
    lower.includes('diabetes')
  ) {
    if (isHausa) {
      return `Sannu! 💊 Mun karbi bukatarku ta magani. Za a hada muku nan take. Kuna son a kawo muku gida ne ko za ku zo ku karba?\nLANG: ha\nORDER_DETECTED: ${msg.trim()}`;
    }
    return `No wahala at all! 💊 We have received your refill request.\n\nWould you like home delivery or will you pick it up at the pharmacy?\nLANG: en\nORDER_DETECTED: ${msg.trim()}`;
  }

  // 7. GREETINGS
  if (
    lower.includes('hi') ||
    lower.includes('hello') ||
    lower.includes('sannu') ||
    lower.includes('barkadi') ||
    lower.includes('barka da') ||
    lower.includes('ina kwana') ||
    lower.includes('e ku') ||
    lower.includes('kedu') ||
    lower.includes('good morning') ||
    lower.includes('good afternoon') ||
    lower.includes('good evening') ||
    lower.includes('how are') ||
    lower.includes('please')
  ) {
    if (isHausa) {
      return `Barka da warhaka! 👋 Muna nan don taimaka muku da magunguna, odar magani, da kawo gida. Yaya za mu taimaka muku a yau?\nLANG: ha`;
    }
    return `👋 Hello! Welcome to RetainNG Health Concierge. How can we help you today? If your medication is running low, just let us know!\nLANG: en`;
  }

  // 8. DEFAULT CULTURAL FALLBACK
  if (isHausa) {
    return `Sannu! 💊 Muna nan don taimaka muku da magunguna da odarku. Don Allah me kuke so a taimaka muku da shi yau?\nLANG: ha`;
  }
  return `Hello! 👋 We are here to help with medication refills, delivery, and health queries. How can we assist you today?\nLANG: en`;
}

async function handleManagerOrderAction(
  managerPhone: string,
  messageText: string,
  host: string
): Promise<{ success: boolean; message: string }> {
  const isReady = messageText.trim().toUpperCase().startsWith('READY');
  const actionType = isReady ? 'ready' : 'dispatch';

  const match = messageText.match(/(?:dispatch|ready)\s*([0-9+]+)?/i);
  const targetDigits = match?.[1] ? match[1].replace(/[^0-9]/g, '') : '';

  if (!supabaseAdmin) {
    return { success: false, message: 'Database is not currently accessible.' };
  }

  // Find customer in Supabase
  let customer: {
    id: string;
    full_name: string;
    phone: string;
    tags?: string[];
    business_id: string;
  } | null = null;

  if (targetDigits) {
    const { data: custs } = await supabaseAdmin
      .from('customers')
      .select('id, full_name, phone, tags, business_id')
      .ilike('phone', `%${targetDigits}%`)
      .limit(1);
    if (custs && custs.length > 0) customer = custs[0];
  }

  if (!customer) {
    const { data: recentSales } = await supabaseAdmin
      .from('sales_or_visits')
      .select('customer_id, customer_name, customer_phone, business_id, service_or_product')
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentSales && recentSales.length > 0) {
      const s = recentSales[0];
      const { data: c } = await supabaseAdmin
        .from('customers')
        .select('id, full_name, phone, tags, business_id')
        .eq('id', s.customer_id)
        .maybeSingle();
      customer = c || {
        id: s.customer_id,
        full_name: s.customer_name,
        phone: s.customer_phone,
        tags: [],
        business_id: s.business_id,
      };
    }
  }

  if (!customer || !customer.phone) {
    return {
      success: false,
      message: `Could not find a pending order. Please reply with "${isReady ? 'READY' : 'DISPATCH'} [last 4 digits]" e.g. ${isReady ? 'READY 3129' : 'DISPATCH 3129'}`,
    };
  }

  let bizName = 'Your Pharmacy';
  if (customer.business_id) {
    const { data: b } = await supabaseAdmin
      .from('businesses')
      .select('name')
      .eq('id', customer.business_id)
      .maybeSingle();
    if (b?.name) bizName = b.name;
  }

  const custCleanPhone = customer.phone.replace(/[^0-9]/g, '');
  const custName = customer.full_name || `Customer ...${custCleanPhone.slice(-4)}`;
  const tags: string[] = customer.tags || [];

  const isHausa = tags.includes('Lang:Hausa');
  const isYoruba = tags.includes('Lang:Yoruba');
  const isIgbo = tags.includes('Lang:Igbo');
  const prefersVoice = tags.includes('Prefers-Voice') || isHausa || isYoruba || isIgbo;

  let notifyMsg = '';
  let langCode = 'en';

  if (isReady) {
    // Counter pickup notification
    if (isHausa) {
      langCode = 'ha';
      notifyMsg = `🛍️ *Sannu ${custName}!* Maganinku daga *${bizName}* an riga an hada shi yana jiran ku a kanta! Kuna iya shigowa ku karba a kowane lokaci da kuka shirya. 💊 Sai mun gan ku!`;
    } else if (isYoruba) {
      langCode = 'yo';
      notifyMsg = `🛍️ *E ku ojumo ${custName}!* Oogun yin lati *${bizName}* ti wa ni imurasile lori kanta wa! E le wa gba a nigbakugba ti e ba fe loni. 💊 A n reti yin!`;
    } else if (isIgbo) {
      langCode = 'ig';
      notifyMsg = `🛍️ *Nnọọ ${custName}!* Ọgwụ gị si na *${bizName}* adịla njikere na tebụl anyị! Ị nwere ike ịbịa were ya n'oge ọ bụla taa. 💊 Anyị na-eche gị!`;
    } else {
      langCode = 'en';
      notifyMsg = `🛍️ *Hello ${custName}!* Your order from *${bizName}* has been packaged and is waiting for you at the counter! Feel free to walk in and pick it up anytime today. 💊 See you soon!`;
    }
  } else {
    // Delivery rider on the way notification
    if (isHausa) {
      langCode = 'ha';
      notifyMsg = `🛵 *Labari mai kyau ${custName}!* Maganinku daga *${bizName}* an gama hadawa kuma mai kawo kaya (dispatch rider) yana kan hanya! Zai iso gare ku nan da minti 30-45. 💊 Muna fatan samun sauƙi cikin gaggawa!`;
    } else if (isYoruba) {
      langCode = 'yo';
      notifyMsg = `🛵 *Iroyin ayo ${custName}!* Oogun yin lati *${bizName}* ti wa ni imurasile, akowe dispatch si wa lori ona lati gbe e wa! E reti re laarin iseju 30-45. 💊 E seun pupo!`;
    } else if (isIgbo) {
      langCode = 'ig';
      notifyMsg = `🛵 *Ozi ọma ${custName}!* Ọgwụ gị si na *${bizName}* adịla njikere, onye dispatch nọ na ụzọ na-eweta ya! Ọ ga-eru n'ime nkeji 30-45. 💊 Daalụ nke ukwuu!`;
    } else {
      langCode = 'en';
      notifyMsg = `🛵 *Good news ${custName}!* Your order from *${bizName}* has been packaged and our dispatch rider is heading your way! Expect delivery in 30-45 minutes. 💊 Thank you for choosing ${bizName}!`;
    }
  }

  // Send WhatsApp message to patient
  await sendWhatsApp(custCleanPhone, notifyMsg);

  // Send voice note in their native tongue
  if (prefersVoice) {
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const voiceUrl = `${protocol}://${host}/api/tts?tl=${langCode}&text=${encodeURIComponent(
      notifyMsg.replace(/[*🛵🛍️💊]/g, '')
    )}`;
    await sendWhatsAppVoice(custCleanPhone, voiceUrl);
  }

  // Log action in sales_or_visits
  try {
    await supabaseAdmin.from('sales_or_visits').insert({
      business_id: customer.business_id,
      customer_id: customer.id,
      customer_name: custName,
      customer_phone: customer.phone,
      service_or_product: isReady ? 'Order Ready for Counter Pickup' : 'Order Dispatched (Rider En Route)',
      amount_ngn: 0,
      notes: `${isReady ? 'Counter pickup alert' : 'Dispatch rider alert'} sent by manager from WhatsApp. Patient notified via ${isHausa ? 'Hausa' : isYoruba ? 'Yoruba' : isIgbo ? 'Igbo' : 'English'} text + Voice.`,
      is_manual_entry: false,
    });
  } catch (e) {
    console.warn('Action log error:', e);
  }

  const successLabel = isReady ? 'COUNTER PICKUP READY' : 'DISPATCH CONFIRMED';
  const actionSummary = isReady ? 'Ready for pickup at counter' : 'Rider is en route';

  return {
    success: true,
    message: `✅ *${successLabel} — ${bizName}*\n\nPatient *${custName}* (+${custCleanPhone}) has been notified via WhatsApp${prefersVoice ? ' and Voice Note' : ''}.\n\n${isReady ? '🛍️' : '🛵'} ${actionSummary}!`,
  };
}

/** Handles 1-line merchant self-onboarding via WhatsApp */
async function handleMerchantSelfOnboard(
  cleanPhone: string,
  rawMessage: string,
  profileName: string,
  host: string
): Promise<{ success: boolean; message: string }> {
  const trimmed = rawMessage.trim();
  const upper = trimmed.toUpperCase();

  // If user just sent command keyword without store details
  if (
    upper === 'JOIN' ||
    upper === 'ONBOARD' ||
    upper === 'REGISTER' ||
    upper === 'PARTNER' ||
    upper === 'HELP'
  ) {
    return {
      success: true,
      message:
        `👋 *Welcome to RetainNG Partner Network!* 💊\n\n` +
        `To activate automated WhatsApp refill reminders & customer retention for your pharmacy in 5 seconds, reply with:\n\n` +
        `👉 *JOIN [Pharmacy Name] [City]*\n\n` +
        `*Examples:*\n` +
        `• \`JOIN Danfodio Pharmacy Kaduna\`\n` +
        `• \`JOIN MedPlus Pharmacy Lekki\`\n` +
        `• \`JOIN St. Luke Pharmacy Abuja\`\n\n` +
        `Our system will immediately generate your private store portal, manager order routing, and 4-in-1 printable counter bag slips! 🚀`,
    };
  }

  // Extract raw business name & location
  const cleanInput = trimmed
    .replace(/^(JOIN|ONBOARD|REGISTER|PARTNER)\s+/i, '')
    .trim();

  if (!cleanInput) {
    return {
      success: false,
      message: `Please specify your pharmacy name. Example: *JOIN Danfodio Pharmacy Kaduna*`,
    };
  }

  // Detect city from string if present
  const NIGERIAN_CITIES = [
    'Kaduna', 'Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt', 'Enugu',
    'Benin', 'Zaria', 'Jos', 'Ilorin', 'Abeokuta', 'Onitsha', 'Warri', 'Calabar',
    'Uyo', 'Owerri', 'Akure', 'Lekki', 'Ikeja', 'Yaba', 'Victoria Island'
  ];

  let detectedCity = 'Kaduna';
  let detectedState = 'Kaduna';

  for (const city of NIGERIAN_CITIES) {
    const regex = new RegExp(`\\b${city}\\b`, 'i');
    if (regex.test(cleanInput)) {
      detectedCity = city;
      detectedState = ['Lagos', 'Ikeja', 'Lekki', 'Yaba'].includes(city)
        ? 'Lagos'
        : ['Abuja'].includes(city)
        ? 'FCT'
        : ['Kano'].includes(city)
        ? 'Kano'
        : ['Zaria', 'Kaduna'].includes(city)
        ? 'Kaduna'
        : city;
      break;
    }
  }

  // Clean Store Display Name (Capitalize Each Word)
  const formattedName = cleanInput
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  // Generate URL slug
  let slug = cleanInput
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!slug) slug = `pharmacy-${cleanPhone.slice(-4)}`;

  let storeId = randomUUID();
  let isExisting = false;

  if (supabaseAdmin) {
    try {
      // Check if business already exists by phone or slug
      const { data: existing } = await supabaseAdmin
        .from('businesses')
        .select('*')
        .or(`opt_in_slug.eq.${slug},manager_alert_phone.eq.${cleanPhone},phone.eq.+${cleanPhone}`)
        .maybeSingle();

      if (existing) {
        storeId = existing.id;
        slug = existing.opt_in_slug;
        isExisting = true;
      } else {
        // Calculate 14-day free trial expiration date
        const now = new Date();
        const trialExpiry = new Date(now);
        trialExpiry.setDate(trialExpiry.getDate() + 14);
        const formattedRenewal = trialExpiry.toISOString().split('T')[0];
        const expiryFormattedReadable = trialExpiry.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        // Create new business record with 14-day trial
        const insertPayload = {
          id: storeId,
          name: formattedName,
          business_type: 'pharmacy',
          phone: `+${cleanPhone}`,
          manager_alert_phone: cleanPhone,
          concierge_phone: '+234 703 267 3310',
          address: `${detectedCity}, Nigeria`,
          city: detectedCity,
          state: detectedState,
          currency: 'NGN',
          timezone: 'Africa/Lagos',
          opt_in_slug: slug,
          is_demo: false,
          subscription_status: 'trial',
          subscription_renewal_date: formattedRenewal,
          monthly_retainer_ngn: 25000,
        };

        const { error: createErr } = await supabaseAdmin
          .from('businesses')
          .insert(insertPayload);

        if (createErr) {
          console.warn('Full insert failed, falling back to core columns:', createErr);
          const fallbackPayload = {
            id: storeId,
            name: formattedName,
            business_type: 'pharmacy',
            phone: `+${cleanPhone}`,
            manager_alert_phone: cleanPhone,
            concierge_phone: '+234 703 267 3310',
            address: `${detectedCity}, Nigeria`,
            city: detectedCity,
            state: detectedState,
            currency: 'NGN',
            timezone: 'Africa/Lagos',
            opt_in_slug: slug,
            is_demo: false,
            subscription_status: 'trial',
            subscription_renewal_date: formattedRenewal,
            monthly_retainer_ngn: 25000,
          };
          await supabaseAdmin.from('businesses').insert(fallbackPayload);
        }
      }

      // Log activation into sales_or_visits for Agency Radar Live Feed
      await supabaseAdmin.from('sales_or_visits').insert({
        business_id: storeId,
        customer_name: profileName || formattedName,
        customer_phone: `+${cleanPhone}`,
        service_or_product: isExisting
          ? 'Partner Portal & Slips Retrieved'
          : 'New Partner Store Auto-Onboarded via WhatsApp',
        amount_ngn: 25000,
        notes: `Store "${formattedName}" (${detectedCity}) ${
          isExisting ? 'retrieved portal link' : 'self-registered autonomously'
        } from WhatsApp number +${cleanPhone}. Slug: ${slug}`,
        is_manual_entry: false,
      });
    } catch (e) {
      console.error('Merchant self-onboard Supabase error:', e);
    }
  }

  const protocol = host.includes('localhost') ? 'http' : 'https';
  const portalUrl = `${protocol}://${host}/portal/${slug}`;
  const slipsUrl = `${protocol}://${host}/portal/${slug}?print=1`;
  const optInUrl = `${protocol}://${host}/opt-in/${slug}`;

  const greetingTitle = isExisting
    ? `✅ *WELCOME BACK — ${formattedName.toUpperCase()}!*`
    : `🎉 *CONGRATULATIONS! ${formattedName.toUpperCase()} IS NOW LIVE ON RETAINNG!* 💊`;

  const now = new Date();
  const trialExpiry = new Date(now);
  trialExpiry.setDate(trialExpiry.getDate() + 14);
  const expiryFormattedReadable = trialExpiry.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    success: true,
    message:
      `${greetingTitle}\n\n` +
      `Your store's WhatsApp AI customer retention autopilot is active on your *14-Day Free Partner Pilot* (Valid through *${expiryFormattedReadable}*).\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📱 *Your Private Store Portal:*\n` +
      `${portalUrl}\n` +
      `_(View registered patients, 28-day countdown timers & trial status)_\n\n` +
      `🖨️ *Print Your 4-in-1 Counter Bag Slips:*\n` +
      `${slipsUrl}\n` +
      `_(Print 20 slips & drop them in customer bags at dispensing)_\n\n` +
      `💳 *Partner Retainer Billing:*\n` +
      `${protocol}://${host}/billing/${slug}\n` +
      `_(₦25,000/mo retainer starts after your 14-day trial)_\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `💡 *How It Works in 3 Steps:*\n` +
      `1. Your cashier drops a VIP Refill slip in patient bags.\n` +
      `2. Patients scan with WhatsApp — our AI concierge speaks Hausa, Yoruba, Igbo & English to track their refill date.\n` +
      `3. When their pills finish, the AI alerts *this WhatsApp number* with 1-Tap Ready/Dispatch!\n\n` +
      `🔗 *Direct Patient Opt-in Link:*\n` +
      `${optInUrl}`,
  };
}

export async function POST(req: NextRequest) {
  const host = req.headers.get('host') || 'retainng.vercel.app';
  try {
    const contentType = req.headers.get('content-type') || '';
    let fromNumber = '';
    let messageBody = '';
    let profileName = '';

    let isVoiceInput = false;
    let audioData: { base64: string; mimeType: string } | undefined = undefined;
    let imageData: { base64: string; mimeType: string } | undefined = undefined;

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      fromNumber = (formData.get('From') as string) || '';
      messageBody = (formData.get('Body') as string) || '';
      profileName = (formData.get('ProfileName') as string) || '';
    } else {
      const json = await req.json();

      // Ignore Green-API outgoing message echoes, status updates, and non-incoming webhooks
      if (json?.typeWebhook && json.typeWebhook !== 'incomingMessageReceived') {
        return NextResponse.json({ ignored: `webhook-type:${json.typeWebhook}` });
      }

      fromNumber =
        json?.From ||
        json?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from ||
        json?.senderData?.chatId ||
        json?.senderData?.sender ||
        json?.messages?.[0]?.from ||
        json?.data?.from ||
        '';

      // Ignore WhatsApp Groups (@g.us), Status Broadcasts, and Channels/Newsletters
      const rawChatId = String(json?.senderData?.chatId || fromNumber || '').toLowerCase();
      if (
        rawChatId.includes('@g.us') ||
        rawChatId.includes('status@broadcast') ||
        rawChatId.includes('@newsletter') ||
        rawChatId.includes('@broadcast')
      ) {
        return NextResponse.json({ ignored: 'group-or-broadcast-message' });
      }

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

      // Check for incoming audio / voice note
      const fileData = json?.messageData?.fileMessageData;
      const msgType = json?.messageData?.typeMessage || '';
      if (
        msgType === 'audioMessage' ||
        msgType === 'voiceMessage' ||
        fileData?.mimeType?.startsWith('audio')
      ) {
        isVoiceInput = true;
        if (fileData?.downloadUrl) {
          try {
            const audioRes = await fetch(fileData.downloadUrl);
            if (audioRes.ok) {
              const buf = await audioRes.arrayBuffer();
              audioData = {
                base64: Buffer.from(buf).toString('base64'),
                mimeType: fileData.mimeType || 'audio/ogg',
              };
            }
          } catch (e) {
            console.warn('Audio download failed:', e);
          }
        }
      }

      // Check for incoming photo of medication or prescription
      if (
        msgType === 'imageMessage' ||
        fileData?.mimeType?.startsWith('image')
      ) {
        if (fileData?.caption) {
          messageBody = `${fileData.caption} ${messageBody}`.trim();
        }
        if (fileData?.downloadUrl) {
          try {
            const imgRes = await fetch(fileData.downloadUrl);
            if (imgRes.ok) {
              const buf = await imgRes.arrayBuffer();
              imageData = {
                base64: Buffer.from(buf).toString('base64'),
                mimeType: fileData.mimeType || 'image/jpeg',
              };
            }
          } catch (e) {
            console.warn('Image download failed:', e);
          }
        }
      }
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

    if (!messageBody.trim() && !audioData && !imageData && !isVoiceInput) {
      return NextResponse.json({ ignored: 'empty-message' });
    }

    if (!messageBody.trim() && (audioData || isVoiceInput)) {
      messageBody = '[Voice Note Message]';
    }

    if (!messageBody.trim() && imageData) {
      messageBody = '[Photo of medication blister pack or doctor prescription]';
    }

    // --- 0. CHECK FOR 1-TAP MANAGER DISPATCH OR READY COMMAND ---
    const upperMsg = messageBody.trim().toUpperCase();
    if (upperMsg.startsWith('DISPATCH') || upperMsg.startsWith('READY')) {
      const actionRes = await handleManagerOrderAction(cleanPhone, messageBody.trim(), host);
      await sendWhatsApp(cleanPhone, actionRes.message);
      return NextResponse.json({
        success: actionRes.success,
        intent: upperMsg.startsWith('READY') ? 'manager_ready' : 'manager_dispatch',
        message: actionRes.message,
      });
    }

    // --- 0.1 CHECK FOR MERCHANT SELF-ONBOARDING COMMAND ---
    if (
      upperMsg.startsWith('JOIN') ||
      upperMsg.startsWith('ONBOARD') ||
      upperMsg.startsWith('REGISTER') ||
      upperMsg.startsWith('PARTNER')
    ) {
      const onboardRes = await handleMerchantSelfOnboard(cleanPhone, messageBody.trim(), profileName, host);
      await sendWhatsApp(cleanPhone, onboardRes.message);
      return NextResponse.json({
        success: onboardRes.success,
        intent: 'merchant_self_onboard',
        message: onboardRes.message,
      });
    }

    // --- Multi-Business attribution resolution ---
    const refMatch = messageBody.match(/\[ref:([a-zA-Z0-9_-]+)\]/i);
    let resolvedBiz = refMatch ? resolveBusiness(refMatch[1]) : null;

    // If not found in static list, check dynamic Supabase businesses
    if (!resolvedBiz && refMatch && supabaseAdmin) {
      try {
        const { data: b } = await supabaseAdmin
          .from('businesses')
          .select('opt_in_slug, name, business_type, city')
          .eq('opt_in_slug', refMatch[1].toLowerCase())
          .maybeSingle();
        if (b) {
          resolvedBiz = {
            slug: b.opt_in_slug,
            name: b.name,
            type: b.business_type || 'pharmacy',
            location: b.city || 'Kaduna',
          };
        }
      } catch (err) {
        console.warn('Dynamic business lookup error:', err);
      }
    }
    let activeSlug = resolvedBiz?.slug || (refMatch ? refMatch[1] : 'general');
    let activeBizName = resolvedBiz?.name || (refMatch ? refMatch[1] : null);

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
        `🎉 *Welcome${greeting} to ${bizDisplay}!* 💊\n\n` +
        `Your WhatsApp is now linked — you never need to scan again.\n\n` +
        `I am your 24/7 personal care assistant. You can:\n` +
        `🎙️ *Send Voice Notes* in Hausa, Yoruba, Igbo, or English\n` +
        `📸 *Snap photos* of your medicine pack or prescription\n` +
        `🚚 *Request refills & home delivery* anytime\n\n` +
        `👉 *What medication did you pick up today?*\n` +
        `_(Type it, hold mic to speak, or snap a quick photo!)_`;

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
    // CONVERSATIONS — Powered by Gemini 2.5 Flash + Personal AI Memory
    // =========================================================
    const displayName = profileName || `Customer (...${cleanPhone.slice(-4)})`;

    // --- LOAD PERSISTENT PATIENT MEMORY (PERSONAL AI) ---
    let customerRecord: {
      id: string;
      full_name: string;
      tags: string[];
      notes: string | null;
      business_id: string;
    } | null = null;
    let prefersVoiceStored = false;
    let rememberedLang = '';
    let medicationHistory = '';

    if (supabaseAdmin) {
      try {
        const { data: cData } = await supabaseAdmin
          .from('customers')
          .select('id, full_name, tags, notes, business_id')
          .eq('phone', `+${cleanPhone}`)
          .maybeSingle();

        if (cData) {
          customerRecord = cData;
          const tags = cData.tags || [];
          prefersVoiceStored = tags.includes('Prefers-Voice');
          const langTag = tags.find((t: string) => t.startsWith('Lang:'));
          if (langTag) {
            rememberedLang = langTag.replace('Lang:', '');
          }

          // Fetch recent medication refills or notes from sales_or_visits
          const { data: visits } = await supabaseAdmin
            .from('sales_or_visits')
            .select('service_or_product')
            .eq('customer_phone', `+${cleanPhone}`)
            .order('created_at', { ascending: false })
            .limit(3);

          medicationHistory = (visits || [])
            .map((v) => v.service_or_product)
            .filter((p) => !p.includes('Dispatched') && !p.includes('Test'))
            .join(', ');

          // Resolve attributed pharmacy from customer's registered business_id
          if (cData.business_id) {
            const { data: bizRow } = await supabaseAdmin
              .from('businesses')
              .select('opt_in_slug, name, business_type, city')
              .eq('id', cData.business_id)
              .maybeSingle();
            if (bizRow) {
              activeSlug = bizRow.opt_in_slug;
              activeBizName = bizRow.name;
              resolvedBiz = {
                slug: bizRow.opt_in_slug,
                name: bizRow.name,
                type: bizRow.business_type || 'pharmacy',
                location: bizRow.city || 'Kaduna',
              };
            }
          }
        }
      } catch (memErr) {
        console.warn('Patient memory lookup error:', memErr);
      }
    }

    // STRICT OPT-IN GATE: Never auto-reply to personal DMs from friends/contacts who haven't enrolled via QR/link
    if (!customerRecord) {
      return NextResponse.json({ ignored: 'personal-dm-not-enrolled-patient', phone: cleanPhone });
    }

    const patientMemoryPrompt = `
🧠 PATIENT PERSISTENT MEMORY (PERSONAL AI):
- Patient Real Name: ${customerRecord?.full_name || displayName}
- Known Previous Medications: ${medicationHistory || 'Routine Chronic / Community Pharmacy Patient'}
- Remembered Language: ${rememberedLang || 'Detect from conversation'}
- Remembered Preferred Modality: ${prefersVoiceStored ? 'VOICE NOTES (Prefers spoken audio over text)' : 'Text / Audio'}
- Clinical / Customer Notes: ${customerRecord?.notes || 'Valued customer'}
- INSTRUCTION: Treat the patient with warm familiarity like their trusted personal pharmacist who knows them and respects their dialect.`;

    let systemPrompt = '';
    if (activeBizName) {
      systemPrompt = `You are an exceptionally smart, culturally attuned AI Health & Customer Retention Concierge for ${activeBizName} in ${resolvedBiz?.location || 'Kaduna, Nigeria'}.
The client messaging you is named: ${displayName} (Phone ending in: ...${cleanPhone.slice(-4)})
${patientMemoryPrompt}

🔥 SUPERPOWER: MULTILINGUAL & LOCAL DIALECT EXPERTISE
You possess native-level fluency in:
1. HAUSA (Kano, Kaduna, Zaria, Sokoto dialects) — e.g. "Sannu", "Ina kwana", "Maganin hawan jini", "Maganin ciwon suga", "Don Allah a aiko min gida", "Maganina ya kare".
2. YORUBA — e.g. "E ku irole", "Oogun eje riru", "Oogun atogbe", "Oogun iba", "E jowo e fi ranse si mi".
3. IGBO — e.g. "Nnoo", "Kedu", "Ogwu mgbali elu", "Ogwu shuga", "Biko zitere m ya n'ulo".
4. NIGERIAN PIDGIN — e.g. "How far", "My BP drug don finish", "Abeg send am come my house", "No wahala at all".
5. NIGERIAN ENGLISH & ARABIC.

🚨 CRITICAL LANGUAGE MATCHING RULE:
- ALWAYS detect the patient's language or dialect from their text or voice note.
- YOU MUST REPLY IN THE EXACT SAME LANGUAGE OR DIALECT they communicated in!
- If they speak Hausa, reply in warm, respectful, fluent Hausa.
- If they speak Yoruba, reply in warm, respectful Yoruba.
- If they speak Igbo, reply in warm, respectful Igbo.
- If they speak Pidgin, reply in friendly Nigerian Pidgin.
- If they speak English, reply in friendly Nigerian English.

CLINICAL & REFILL INTELLIGENCE:
1. Identify all medications (brands, generics, or local names):
   - Chronic: Amlodipine, Metformin, Lisinopril, Losartan, Atorvastatin, Omeprazole, etc. ("hawan jini", "ciwon suga", "eje riru", "mgbali elu").
   - Acute: Malaria (Coartem, Lonart, Amatem), Antibiotics (Augmentin, Amoxil), Pain/Fever (Paracetamol).
2. If they need a refill or their medication finished:
   - Acknowledge warmly on behalf of ${activeBizName}.
   - Ask if they want home delivery (kawo gida / fi ranse si ile) or pharmacy pickup.
3. If they give a delivery address: confirm the address warmly and let them know our dispensary team is packing it.
4. Voice Note Friendly: Keep replies natural, human, conversational, and under 60 words so it sounds smooth when played as a voice note. Never use numbered menus or robotic phrases.

📸 PHOTO & PRESCRIPTION SCANNER:
When the patient sends a photo of their drug box, blister strip, or doctor prescription:
- Inspect the photo carefully: identify the exact medication name and dosage (e.g. "Amlodipine 10mg", "Metformin 500mg", "Lonart DS").
- Warmly confirm the medication you recognized from the photo in their language (e.g. "I see your Amlodipine 10mg in the photo! 💊").
- Ask if they want a fresh pack prepared for home delivery or pickup.

METADATA TAGS AT THE VERY END (each on its own line):
ORDER_DETECTED: [detected medication or item, or NONE]
LANG: [ha | yo | ig | ar | en]`;
    } else {
      systemPrompt = `You are an exceptionally smart, polyglot AI concierge for RetainNG (the customer retention & refill concierge network in Nigeria).
You represent partner businesses including Danfodio Pharmacy (Kaduna), Apex Health (Lagos/Kaduna), and Amphy Pharmacy.
The client messaging you is named: ${displayName} (Phone ending in: ...${cleanPhone.slice(-4)})
${patientMemoryPrompt}

🔥 SUPERPOWER: MULTILINGUAL & LOCAL DIALECT EXPERTISE
You fluently understand and speak Hausa, Yoruba, Igbo, Nigerian Pidgin, English, and Arabic.
ALWAYS REPLY IN THE EXACT SAME LANGUAGE OR DIALECT the patient used!

Guidelines:
1. Greet them warmly in their language/dialect.
2. If they ask for a refill or service without stating which pharmacy they visit: ask them which partner store they are registered with so you can route their order immediately.
3. If they send a photo of their medication box or prescription: read the medication name and dosage, confirm what you see, and help them arrange the order.
4. Keep replies friendly, concise (under 60 words), and voice-note ready.

METADATA TAGS AT THE VERY END (each on its own line):
ORDER_DETECTED: [detected medication or item, or NONE]
LANG: [ha | yo | ig | ar | en]`;
    }

    let aiReply = '';
    let isOrder = false;
    let detectedMed = '';
    let detectedLang = 'en';

    try {
      const rawAiReply = await callGeminiAI(
        systemPrompt,
        messageBody,
        audioData,
        imageData,
        cleanPhone,
        rememberedLang
      );

      if (rawAiReply.includes('LANG:')) {
        const langMatch = rawAiReply.match(/LANG:\s*([a-z]{2})/i);
        if (langMatch) detectedLang = langMatch[1].toLowerCase();
      }

      if (rawAiReply.includes('ORDER_DETECTED:')) {
        const lines = rawAiReply.split('\n');
        const orderLine = lines.find((l) => l.startsWith('ORDER_DETECTED:'));
        if (orderLine) {
          const item = orderLine.replace('ORDER_DETECTED:', '').trim();
          if (item && item.toUpperCase() !== 'NONE') {
            detectedMed = item;
            isOrder = true;
          }
        }
        aiReply = lines
          .filter((l) => !l.startsWith('ORDER_DETECTED:') && !l.startsWith('LANG:'))
          .join('\n')
          .trim();
      } else {
        aiReply = rawAiReply.replace(/LANG:\s*[a-z]{2}/gi, '').trim();
      }

      // Record successful AI response in conversation history
      if (cleanPhone && aiReply) {
        if (!userConversationHistory[cleanPhone]) {
          userConversationHistory[cleanPhone] = [];
        }
        userConversationHistory[cleanPhone].push(
          { role: 'user', parts: [{ text: messageBody }] },
          { role: 'model', parts: [{ text: aiReply }] }
        );
        if (userConversationHistory[cleanPhone].length > 8) {
          userConversationHistory[cleanPhone] = userConversationHistory[cleanPhone].slice(-8);
        }
      }
    } catch (err) {
      console.error('Gemini fatal exception, falling back to keywords:', err);
      // Fallback if AI service is temporarily unavailable
      const kwResult = detectIntentKeywords(messageBody, rememberedLang);
      if (kwResult.includes('LANG: ha')) detectedLang = 'ha';
      else if (kwResult.includes('LANG: yo')) detectedLang = 'yo';
      else if (kwResult.includes('LANG: ig')) detectedLang = 'ig';
      else detectedLang = rememberedLang === 'Hausa' ? 'ha' : 'en';

      if (kwResult.includes('ORDER_DETECTED:')) {
        detectedMed = messageBody.trim();
        isOrder = true;
      }
      aiReply = kwResult
        .split('\n')
        .filter((l) => !l.startsWith('ORDER_DETECTED:') && !l.startsWith('LANG:'))
        .join('\n')
        .trim();
    }

    // 1. Send the text reply
    await sendWhatsApp(cleanPhone, aiReply);

    // 2. Deliver WhatsApp voice note if patient sent voice, has stored voice preference, or speaks local dialect
    const shouldSendVoice =
      isVoiceInput ||
      prefersVoiceStored ||
      detectedLang === 'ha' ||
      detectedLang === 'yo' ||
      detectedLang === 'ig' ||
      messageBody.toLowerCase().includes('voice') ||
      messageBody.toLowerCase().includes('audio') ||
      messageBody.toLowerCase().includes('murya');

    if (shouldSendVoice) {
      const voiceText = aiReply
        .replace(/\*+/g, '')
        .replace(/[💊🩺❤️🌟📍👉]/gu, '')
        .trim()
        .slice(0, 200);

      const voiceUrl = `https://retainng.vercel.app/api/tts?lang=${detectedLang}&text=${encodeURIComponent(voiceText)}`;
      await sendWhatsAppVoice(cleanPhone, voiceUrl);
    }

    // 3. Persist and update patient memory in Supabase
    if (supabaseAdmin && (detectedLang || isVoiceInput)) {
      const client = supabaseAdmin;
      const langTag =
        detectedLang === 'ha'
          ? 'Lang:Hausa'
          : detectedLang === 'yo'
          ? 'Lang:Yoruba'
          : detectedLang === 'ig'
          ? 'Lang:Igbo'
          : detectedLang === 'ar'
          ? 'Lang:Arabic'
          : 'Lang:English';

      try {
        let custId = customerRecord?.id;
        let currentTags = customerRecord?.tags || [];

        if (!custId) {
          const { data: cData } = await client
            .from('customers')
            .select('id, tags')
            .eq('phone', `+${cleanPhone}`)
            .maybeSingle();
          if (cData) {
            custId = cData.id;
            currentTags = cData.tags || [];
          }
        }

        if (custId) {
          const updatedTags = currentTags.filter((t: string) => !t.startsWith('Lang:'));
          updatedTags.push(langTag);
          if (isVoiceInput || shouldSendVoice) {
            if (!updatedTags.includes('Prefers-Voice')) {
              updatedTags.push('Prefers-Voice');
            }
          }

          const modalityStr = isVoiceInput ? 'Voice Note' : 'WhatsApp Text';
          const memoryNote = `Prefers ${langTag.replace('Lang:', '')} ${
            updatedTags.includes('Prefers-Voice') ? 'Voice Notes' : 'text'
          }. Last contact: ${modalityStr} on ${new Date().toLocaleDateString('en-GB')}. ${
            detectedMed ? `Order: ${detectedMed}` : ''
          }`.trim();

          await client
            .from('customers')
            .update({
              tags: updatedTags,
              notes: memoryNote,
              updated_at: new Date().toISOString(),
            })
            .eq('id', custId);
        }
      } catch (err) {
        console.warn('Lang persistence error:', err);
      }
    }

    // Send manager dispatch alert for refill orders
    if (isOrder) {
      // --- ANTI-CHEAT CHECK: Verify if business subscription is overdue ---
      if (supabaseAdmin && activeSlug) {
        try {
          const { data: bCheck } = await supabaseAdmin
            .from('businesses')
            .select('name, subscription_status, manager_phone')
            .eq('opt_in_slug', activeSlug)
            .maybeSingle();

          if (bCheck && bCheck.subscription_status === 'overdue') {
            const maintMsg =
              `Sannu! Currently, our automated digital concierge for *${bCheck.name}* is undergoing maintenance. ` +
              `Please visit or call the pharmacy dispensary counter directly to pick up your medication. Thank you! 💊`;
            await sendWhatsApp(cleanPhone, maintMsg);

            const mgrPhone = bCheck.manager_phone || await getManagerPhone(activeSlug, host);
            const protocol = host.includes('localhost') ? 'http' : 'https';
            const billingUrl = `${protocol}://${host}/billing/${activeSlug}`;

            const blockNotice =
              `🚨 *PATIENT REFILL BLOCKED — UNPAID RETAINER*\n\n` +
              `👤 Patient *${displayName}* (+${cleanPhone}) just attempted to order *${detectedMed || messageBody}* on WhatsApp, but your store's subscription is OVERDUE.\n\n` +
              `🛑 Automated refill routing is suspended until renewed.\n` +
              `👉 *Renew now to unblock immediately:* ${billingUrl}`;

            await sendWhatsApp(mgrPhone, blockNotice);

            return NextResponse.json({
              success: false,
              reason: 'subscription_overdue',
              business: bCheck.name,
            });
          }
        } catch (err) {
          console.warn('Subscription check warning:', err);
        }
      }

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
          `🚨 *NEW REFILL ORDER — ${targetStore}*\n\n` +
          `👤 *Patient:* ${displayName}\n` +
          `📱 *Phone:* +${cleanPhone}\n` +
          `💊 *Medication:* ${detectedMed || messageBody}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `⚡ *1-TAP REPLIES:*\n` +
          `• *For Counter Pickup:* Reply 👉 *READY ${cleanPhone.slice(-4)}*\n` +
          `• *For Home Delivery:* Reply 👉 *DISPATCH ${cleanPhone.slice(-4)}*\n` +
          `📞 Or tap phone number above to call patient directly.`;

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
    return NextResponse.json(
      {
        error: 'Webhook processing error',
        details: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const geminiApiKey = process.env.GEMINI_API_KEY || '';
  let geminiTestResult: Record<string, unknown> = {
    has_key: Boolean(geminiApiKey),
    key_prefix: geminiApiKey ? geminiApiKey.slice(0, 8) + '...' : 'none',
  };

  if (geminiApiKey) {
    try {
      const testRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Reply in Hausa: Sannu, muna da Metformin.' }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
          }),
        }
      );
      const data = await testRes.json();
      geminiTestResult = {
        ...geminiTestResult,
        status: testRes.status,
        reply: data?.candidates?.[0]?.content?.parts?.[0]?.text || data,
      };
    } catch (err: unknown) {
      geminiTestResult = {
        ...geminiTestResult,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return NextResponse.json({
    status: 'healthy',
    engine: 'RetainNG WhatsApp AI Concierge v2 (Gemini-powered)',
    gemini_diagnostics: geminiTestResult,
    supported_gateways: ['Green-API', 'Twilio WhatsApp API', 'Meta Cloud API'],
  });
}
