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

async function callGeminiAI(
  systemPrompt: string,
  userMessage: string,
  audioData?: { base64: string; mimeType: string },
  imageData?: { base64: string; mimeType: string }
): Promise<string> {
  const geminiApiKey = process.env.GEMINI_API_KEY || '';

  if (!geminiApiKey) {
    return detectIntentKeywords(userMessage);
  }

  const parts: Array<Record<string, unknown>> = [];
  if (audioData?.base64) {
    parts.push({
      inline_data: {
        mime_type: audioData.mimeType,
        data: audioData.base64,
      },
    });
  }
  if (imageData?.base64) {
    parts.push({
      inline_data: {
        mime_type: imageData.mimeType,
        data: imageData.base64,
      },
    });
    parts.push({
      text: "The patient has sent a photo of their medication, blister strip, medicine container, or doctor's prescription paper. Carefully read the text on the pack: identify the exact medication name (brand or generic), dosage/strength (e.g. 10mg, 500mg, 1g), and quantity if visible. Confirm what you see and help them arrange their refill.",
    });
  }
  if (userMessage.trim()) {
    parts.push({ text: userMessage });
  } else if (audioData?.base64) {
    parts.push({
      text: 'Listen carefully to this voice note message. The patient is speaking in their native language or local Nigerian dialect (Hausa, Yoruba, Igbo, Nigerian Pidgin, English, or Arabic). Understand their health or refill need and respond in that exact dialect.',
    });
  }

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
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
  
  // HAUSA KEYWORDS
  if (
    lower.includes('hawan jini') ||
    lower.includes('ciwon suga') ||
    lower.includes('zazzabi') ||
    lower.includes('magani') ||
    lower.includes('ya kare') ||
    lower.includes('kare') ||
    lower.includes('aiko')
  ) {
    return `Sannu! 💊 Mun karbi bukatarku ta magani. Za a hada muku nan take. Kuna son a kawo muku gida ne ko za ku zo ku karba?\nLANG: ha\nORDER_DETECTED: ${msg.trim()}`;
  }

  // YORUBA KEYWORDS
  if (
    lower.includes('eje riru') ||
    lower.includes('atogbe') ||
    lower.includes('oogun') ||
    lower.includes('ti tan') ||
    lower.includes('fi ranse')
  ) {
    return `E ku ojumo! 💊 A ti gba ibeere yin fun oogun. Se e fe ki a fi ranse si ile ni tabi e ma wa gba ni ile-ise oogun wa?\nLANG: yo\nORDER_DETECTED: ${msg.trim()}`;
  }

  // IGBO KEYWORDS
  if (
    lower.includes('mgbali elu') ||
    lower.includes('shuga') ||
    lower.includes('ogwu') ||
    lower.includes('agwula') ||
    lower.includes('zitere')
  ) {
    return `Nnoo! 💊 Anyi anatala aro gi maka ogwu. O bu ka e ziteere gi ya n'ulo ka o bu na i ga-abia n'onwe gi nata ya?\nLANG: ig\nORDER_DETECTED: ${msg.trim()}`;
  }

  // REFILL / MEDICATIONS (English / Pidgin)
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
    return `No wahala at all! 💊 We have received your refill request.\n\nWould you like home delivery or will you pick it up at the pharmacy?\nLANG: en\nORDER_DETECTED: ${msg.trim()}`;
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
    return `📍 Got your address! Our team will prepare your order and call you to confirm delivery soon.\nLANG: en\nORDER_DETECTED: delivery request`;
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
    return `That is a great question! 🩺 For accurate clinical advice, please speak with our pharmacist directly. You can also call or visit us during opening hours.\nLANG: en`;
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
    return `👋 Hello! Welcome to RetainNG Health Concierge. How can we help you today? If your medication is running low, just let us know!\nLANG: en`;
  }
  return `Hello! 👋 We are here to help with medication refills, delivery, and health queries in your preferred language or dialect. How can we assist you today?\nLANG: en`;
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

    if (!messageBody.trim() && !audioData && !imageData) {
      return NextResponse.json({ ignored: 'empty-message' });
    }

    if (!messageBody.trim() && audioData) {
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
        }
      } catch (memErr) {
        console.warn('Patient memory lookup error:', memErr);
      }
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
      const rawAiReply = await callGeminiAI(systemPrompt, messageBody, audioData, imageData);

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
    } catch {
      // Fallback if AI service is temporarily unavailable
      const kwResult = detectIntentKeywords(messageBody);
      if (kwResult.includes('LANG: ha')) detectedLang = 'ha';
      else if (kwResult.includes('LANG: yo')) detectedLang = 'yo';
      else if (kwResult.includes('LANG: ig')) detectedLang = 'ig';
      else detectedLang = 'en';

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
