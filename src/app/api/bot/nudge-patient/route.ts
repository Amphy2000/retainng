import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

const GREEN_API_ID = process.env.GREEN_API_ID || '710722811593';
const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN || 'c7cea54f5c6f4d31a9b74eb6576493a8ec085b4f65a04a62b5';
const GREEN_API_URL = process.env.GREEN_API_URL || 'https://7107.api.greenapi.com';

const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'retainng';
const WHATSAPP_PROVIDER = (process.env.WHATSAPP_PROVIDER || (EVOLUTION_API_URL ? 'evolution' : 'greenapi')).toLowerCase();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, phone, name, businessName, medication, dialect } = body;

    let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '234' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('234') && cleanPhone.length === 10) {
      cleanPhone = '234' + cleanPhone;
    }

    if (!cleanPhone) {
      return NextResponse.json({ success: false, error: 'Target phone is missing' }, { status: 400 });
    }

    const chatId = `${cleanPhone}@c.us`;
    const store = businessName || 'Your Community Pharmacy';
    const patientName = name || 'Valued Patient';
    const medName = medication || 'routine medication';

    let message = '';
    if (dialect === 'hausa') {
      message =
        `Sannu ${patientName}! 💊 Daga *${store}* muke yi muku fatan alheri.\n\n` +
        `Maganinku (*${medName}*) ya kusa karewa. Don guje wa tsayawa da magani, za a hada muku sabon maganin ne?\n\n` +
        `Kuna iya aiko mana da sako anan ko ku turo hoton maganin don aiko muku gida.`;
    } else if (dialect === 'yoruba') {
      message =
        `E ku ojumo ${patientName}! 💊 Lati *${store}* ni a ti n ki yin.\n\n` +
        `Oogun yin (*${medName}*) ti fe tan. Se ki a mura oogun titun sile fun yin ki e ma ba dawole?\n\n` +
        `E fi oro ranse tabi e te fowo ranse si wa lori WhatsApp yii.`;
    } else {
      message =
        `Good day ${patientName}! 💊 Warm greetings from *${store}*.\n\n` +
        `Our health concierge system noticed your prescription for *${medName}* is due for refill soon.\n\n` +
        `To ensure you do not miss your daily dosage, would you like us to prepare your refill pack for *Counter Pickup* or *Home Delivery*?\n\n` +
        `Reply directly to this WhatsApp message or send a photo of your container! 🌟`;
    }

    const useEvolution = WHATSAPP_PROVIDER === 'evolution' && EVOLUTION_API_URL && EVOLUTION_API_KEY;
    const res = useEvolution
      ? await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_API_KEY },
          body: JSON.stringify({ number: cleanPhone, text: message }),
          signal: AbortSignal.timeout(8000),
        })
      : await fetch(`${GREEN_API_URL}/waInstance${GREEN_API_ID}/sendMessage/${GREEN_API_TOKEN}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, message }),
        });

    const data = await res.json();

    // Proactively send playable WhatsApp audio voice note if patient prefers voice or speaks local dialect
    let voiceSent = false;
    let voiceMessageId = null;
    const shouldSendVoice = body.sendVoice || dialect === 'hausa' || dialect === 'yoruba' || dialect === 'igbo';

    if (res.ok && shouldSendVoice) {
      const langCode = dialect === 'hausa' ? 'ha' : dialect === 'yoruba' ? 'yo' : dialect === 'igbo' ? 'ig' : 'en';
      const voiceText = message
        .replace(/\*+/g, '')
        .replace(/[💊🩺❤️🌟]/gu, '')
        .trim()
        .slice(0, 200);

      const audioUrl = `https://retainng.vercel.app/api/tts?lang=${langCode}&text=${encodeURIComponent(voiceText)}`;

      try {
        const vRes = useEvolution
          ? await fetch(`${EVOLUTION_API_URL}/message/sendWhatsAppAudio/${EVOLUTION_INSTANCE}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_API_KEY },
              body: JSON.stringify({ number: cleanPhone, audio: audioUrl }),
              signal: AbortSignal.timeout(10000),
            })
          : await fetch(`${GREEN_API_URL}/waInstance${GREEN_API_ID}/sendFileByUrl/${GREEN_API_TOKEN}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chatId,
                urlFile: audioUrl,
                fileName: `refill_nudge_${langCode}.mp3`,
                caption: `🎙️ ${patientName} Refill Reminder`,
              }),
            });
        const vData = await vRes.json();
        if (vRes.ok && (vData?.idMessage || vData?.key?.id)) {
          voiceSent = true;
          voiceMessageId = vData.idMessage || vData.key?.id;
        }
      } catch (err) {
        console.warn('Audio nudge dispatch error:', err);
      }
    }

    // 100% Real Audit Log in Supabase
    if (supabaseAdmin && res.ok) {
      try {
        const { data: bizList } = await supabaseAdmin.from('businesses').select('id, name');
        const matchedBiz = bizList?.find((b) => b.name.toLowerCase().includes(store.toLowerCase())) || bizList?.[0];

        if (matchedBiz) {
          await supabaseAdmin.from('sales_or_visits').insert({
            business_id: matchedBiz.id,
            customer_name: patientName,
            customer_phone: `+${cleanPhone}`,
            service_or_product: 'On-Demand Refill Nudge Dispatched',
            amount_ngn: 0,
            is_manual_entry: false,
            notes: `Dispatched WhatsApp reminder for ${medName}. Text ID: ${data.idMessage || 'Sent'}. ${
              voiceSent ? `Voice Note ID: ${voiceMessageId}` : ''
            }`,
          });
        }
      } catch (err) {
        console.warn('Supabase log error on nudge:', err);
      }
    }

    return NextResponse.json({
      success: res.ok,
      messageId: data?.idMessage,
      voiceSent,
      voiceMessageId,
      recipient: cleanPhone,
      patientName,
      medication: medName,
      sentMessage: message,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('Nudge patient error:', err);
    return NextResponse.json({ success: false, error: 'Failed to dispatch WhatsApp nudge' }, { status: 500 });
  }
}
