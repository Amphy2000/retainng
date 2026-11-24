import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

const GREEN_API_ID = process.env.GREEN_API_ID || '710722811593';
const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN || 'c7cea54f5c6f4d31a9b74eb6576493a8ec085b4f65a04a62b5';
const GREEN_API_URL = process.env.GREEN_API_URL || 'https://7107.api.greenapi.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, phone, name, businessName, medication, dialect } = body;

    const targetPhone = (phone || '').replace(/[^0-9]/g, '');
    if (!targetPhone) {
      return NextResponse.json({ success: false, error: 'Target phone is missing' }, { status: 400 });
    }

    const chatId = `${targetPhone}@c.us`;
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

    const res = await fetch(`${GREEN_API_URL}/waInstance${GREEN_API_ID}/sendMessage/${GREEN_API_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message }),
    });

    const data = await res.json();

    return NextResponse.json({
      success: res.ok,
      messageId: data.idMessage,
      recipient: targetPhone,
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
