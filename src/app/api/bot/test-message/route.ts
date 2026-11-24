import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

const GREEN_API_ID = process.env.GREEN_API_ID || '710722811593';
const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN || 'c7cea54f5c6f4d31a9b74eb6576493a8ec085b4f65a04a62b5';
const GREEN_API_URL = process.env.GREEN_API_URL || 'https://7107.api.greenapi.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { toPhone, businessName, scenario, dialect } = body;

    if (!toPhone) {
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 });
    }

    // Normalize Nigerian phone numbers (e.g. 09169153129 -> 2349169153129)
    let cleanPhone = toPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '234' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('234') && cleanPhone.length === 10) {
      cleanPhone = '234' + cleanPhone;
    }

    const chatId = `${cleanPhone}@c.us`;
    const store = businessName || 'Amphy Pharmacy';

    let message = '';
    let actionTitle = 'Bot Test Dispatched';

    if (scenario === 'refill_reminder') {
      actionTitle = '28-Day Refill Reminder Dispatched';
      if (dialect === 'hausa') {
        message =
          `Sannu Alhaji Musa! 💊 Maganin hawan jini (Amlodipine 10mg) na ku daga *${store}* ya kusa karewa nan da kwanaki 3.\n\n` +
          `Za mu hada muku sabo a aiko muku gida ne ko za ku zo ku karba?\n\n` +
          `_Kuna iya turo hoton maganin ko turo sako anan ta WhatsApp._`;
      } else if (dialect === 'yoruba') {
        message =
          `E ku ojumo Alhaji Musa! 💊 Oogun eje riru yin lati *${store}* fe tan laarin ojo meta.\n\n` +
          `Se e fe ki a fi ranse si ile yin ni tabi e ma wa gba ni ile-ise oogun?\n\n` +
          `_E le fi oro ranse tabi e te fowo ranse si wa lori WhatsApp yii._`;
      } else if (dialect === 'igbo') {
        message =
          `Nnoo Alhaji Musa! 💊 Ogwu gi site na *${store}* ga-agwukwa n'ime ubochi ato.\n\n` +
          `I choro ka anyi wetara gi ya n'ulo ka o bu i ga-abata iburu ya?\n\n` +
          `_Zitere anyi ozi ma obu foto ogwu ahu ebe a na WhatsApp._`;
      } else {
        message =
          `Good day Alhaji Musa! 💊 This is your automated adherence assistant from *${store}*.\n\n` +
          `Our records show your 28-day routine prescription (Amlodipine 10mg & Metformin 500mg) will finish in 3 days.\n\n` +
          `Would you like us to prepare your refill for *Counter Pickup* or *Home Delivery*?\n\n` +
          `Reply directly to this WhatsApp message or send a photo of your empty blister strip!`;
      }
    } else if (scenario === 'manager_order_alert') {
      actionTitle = '1-Tap Manager Order Alert Dispatched';
      message =
        `🔔 *NEW REFILL ORDER RECEIVED — ${store.toUpperCase()}*\n\n` +
        `• 👤 *Patient:* Alhaji Musa (...4821)\n` +
        `• 💊 *Medication:* Amlodipine 10mg (1 month pack)\n` +
        `• 📍 *Delivery:* Barnawa Phase 2, Kaduna\n` +
        `• 💰 *Amount to Collect:* ₦12,500 (Payment on Delivery)\n\n` +
        `⚡ *1-TAP MANAGER ACTION:*\n` +
        `Reply *1* for *READY* (Packed for pickup)\n` +
        `Reply *2* for *DISPATCH* (Handed to delivery rider)\n\n` +
        `_The AI bot will automatically update the patient on WhatsApp._`;
    } else if (scenario === 'dispatch_confirmation') {
      actionTitle = 'Patient Delivery Dispatch Update Sent';
      message =
        `🛵 *DISPATCH UPDATE — ${store.toUpperCase()}*\n\n` +
        `Hello Alhaji Musa! Your prescription pack has been handed to our delivery rider and is on its way to your address:\n\n` +
        `📍 *Barnawa Phase 2, Kaduna*\n` +
        `💵 *Amount Due:* ₦12,500 (Pay cash/transfer to rider on arrival)\n\n` +
        `Thank you for trusting *${store}*. Stay healthy! 🌟`;
    } else {
      actionTitle = 'Bot WhatsApp Ping Sent';
      message =
        `🤖 *RETAINNG BOT CONNECTION TEST*\n\n` +
        `This is a live test transmission from RetainNG Autonomous Bot to verify WhatsApp fleet connectivity.\n\n` +
        `• Store: ${store}\n` +
        `• Status: 100% Active & Operational\n` +
        `• Time: ${new Date().toLocaleTimeString()} (WAT)\n\n` +
        `_Autonomous WhatsApp Retainer Engine active._`;
    }

    const res = await fetch(`${GREEN_API_URL}/waInstance${GREEN_API_ID}/sendMessage/${GREEN_API_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message }),
    });

    const data = await res.json();

    if (res.ok && data?.idMessage) {
      // Proactively send WhatsApp voice note audio if enabled or local dialect requested
      let voiceSent = false;
      let voiceMessageId = null;
      const shouldSendVoice = body.sendVoice || (scenario === 'refill_reminder' && (dialect === 'hausa' || dialect === 'yoruba' || dialect === 'igbo'));

      if (shouldSendVoice) {
        const langCode = dialect === 'hausa' ? 'ha' : dialect === 'yoruba' ? 'yo' : dialect === 'igbo' ? 'ig' : 'en';
        // Build clean spoken text for voice note
        const voiceText = message
          .replace(/\*+/g, '')
          .replace(/_[^_]+_/g, '')
          .replace(/[💊🔔🛵⚡•👉📍💰💵🌟🤖]/gu, '')
          .trim()
          .slice(0, 200);

        const audioUrl = `https://retainng.vercel.app/api/tts?lang=${langCode}&text=${encodeURIComponent(voiceText)}`;

        try {
          const voiceRes = await fetch(`${GREEN_API_URL}/waInstance${GREEN_API_ID}/sendFileByUrl/${GREEN_API_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId,
              urlFile: audioUrl,
              fileName: `refill_reminder_${langCode}.mp3`,
              caption: `🎙️ ${dialect ? dialect.toUpperCase() : 'NATIVE'} Audio Reminder`,
            }),
          });
          const vData = await voiceRes.json();
          if (voiceRes.ok && vData?.idMessage) {
            voiceSent = true;
            voiceMessageId = vData.idMessage;
          }
        } catch (vErr) {
          console.warn('Voice send error in test route:', vErr);
        }
      }

      // 100% Real Audit Log in Supabase
      if (supabaseAdmin) {
        try {
          const { data: bizList } = await supabaseAdmin.from('businesses').select('id, name');
          const matchedBiz = bizList?.find((b) => b.name.toLowerCase().includes(store.toLowerCase())) || bizList?.[0];

          if (matchedBiz) {
            await supabaseAdmin.from('sales_or_visits').insert({
              business_id: matchedBiz.id,
              customer_name: `Verified Test (${cleanPhone.slice(-4)})`,
              customer_phone: `+${cleanPhone}`,
              service_or_product: actionTitle,
              amount_ngn: 0,
              is_manual_entry: false,
              notes: `Live WhatsApp message sent via GreenAPI. ID: ${data.idMessage}. Scenario: ${scenario} (${dialect || 'en'}). ${
                voiceSent ? `Audio voice note dispatched: ${voiceMessageId}` : ''
              }`,
            });
          }
        } catch (e) {
          console.warn('Real log insertion warning:', e);
        }
      }

      return NextResponse.json({
        success: true,
        messageId: data.idMessage,
        voiceSent,
        voiceMessageId,
        sentMessage: message,
        recipient: cleanPhone,
      });
    } else {
      return NextResponse.json(
        { success: false, error: data?.message || 'Failed to send WhatsApp message via GreenAPI' },
        { status: 500 }
      );
    }
  } catch (err: unknown) {
    console.error('Test message API error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
