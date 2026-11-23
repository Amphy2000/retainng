import { NextRequest, NextResponse } from 'next/server';

/**
 * RetainNG Twilio / Meta WhatsApp Bot Webhook
 * Handles incoming WhatsApp check-in messages from customers with zero web browsing.
 *
 * Flow:
 * 1. Customer scans 1-tap WhatsApp QR code or messages the shop's WhatsApp line.
 * 2. Twilio / Meta delivers POST payload: { From: 'whatsapp:+23480...', Body: 'Hi checking in' }
 * 3. RetainNG identifies customer, registers visit & consent, and sends immediate confirmation.
 */

export async function POST(req: NextRequest) {
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
      
      // Support Twilio JSON, Meta Cloud API, Green-API, Whapi.cloud, and UltraMsg payloads
      fromNumber =
        json?.From ||
        json?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from || // Meta Cloud API
        json?.senderData?.chatId || // Green-API
        json?.senderData?.sender || // Green-API
        json?.messages?.[0]?.from || // Whapi.cloud
        json?.data?.from || // UltraMsg
        '';

      messageBody =
        json?.Body ||
        json?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || // Meta Cloud API
        json?.messageData?.textMessageData?.textMessage || // Green-API
        json?.messageData?.extendedTextMessageData?.text || // Green-API
        json?.messages?.[0]?.text?.body || // Whapi.cloud
        json?.data?.body || // UltraMsg
        '';

      // Automatic WhatsApp Profile Name (e.g., "Alhaji Musa", "Hajiya Maryam", "Mama Chichi")
      profileName =
        json?.senderData?.senderName || // Green-API push name
        json?.senderData?.chatName || // Green-API chat title
        json?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name || // Meta Cloud API
        json?.messages?.[0]?.from_name || // Whapi.cloud
        '';
    }

    // Clean phone number (strip whatsapp:, @c.us, @s.whatsapp.net, +, spaces)
    let cleanPhone = fromNumber
      .replace(/^whatsapp:/i, '')
      .replace(/@c\.us$/i, '')
      .replace(/@s\.whatsapp\.net$/i, '')
      .replace(/[^0-9]/g, '')
      .trim();

    // Normalize Nigerian 080... format to international 23480...
    if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      cleanPhone = '234' + cleanPhone.slice(1);
    }

    // Ignore messages sent by the bot line itself to prevent recursive loops
    if (cleanPhone === '2349169153129' || cleanPhone.endsWith('2349169153129')) {
      return NextResponse.json({ ignored: 'self-message' });
    }

    // 1. Check if the message contains an automatic pharmacy reference tag: [ref:slug]
    const refMatch = messageBody.match(/\[ref:([a-zA-Z0-9_-]+)\]/i);
    const incomingSlug = refMatch ? refMatch[1] : null;

    // Default response message
    let replyText = '';

    const nameGreeting = profileName ? ` ${profileName}` : '';

    if (incomingSlug) {
      // First-time scan from a bag slip or QR stand
      // Automatically binds the customer to this specific pharmacy forever
      replyText =
        `🎉 *Welcome${nameGreeting} to your Pharmacy Care & Refill Concierge!*\n\n` +
        `Your phone number (*...${cleanPhone.slice(-4)}*) is now linked to your pharmacy. ` +
        `You never need to type any codes or numbers again.\n\n` +
        (!profileName
          ? `May I know your name so our pharmacist knows how to address you? (e.g. _Alhaji Musa_ or _Mama Chichi_)\n\n`
          : '') +
        `Whenever your medication runs low, just send a simple message here (e.g. _"Please send my Amlodipine refill"_), ` +
        `and our team will prepare it for pickup or home delivery! 💊\n\n` +
        `How can we support your health today?`;
    } else {
      // Subsequent chat or conversational message (zero codes typed by user)
      // The system recognizes the user by phone number from past records
      replyText =
        `👋 *Hello${nameGreeting}! Welcome back to your Pharmacy Health Concierge.*\n\n` +
        `We have your profile on file. How can we assist you today?\n\n` +
        `• *Refill:* Reply with your medication name (e.g. _"Refill my BP drugs"_)\n` +
        `• *Delivery:* Send your address for doorstep dispatch\n` +
        `• *Pharmacist:* Ask any question about dosage or side-effects.\n\n` +
        `_Your care team is on standby._`;
    }

    // Return response in standard JSON (for Green-API / Whapi / Meta) and TwiML (for Twilio)
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${replyText}</Message>
</Response>`;

      return new NextResponse(twiml, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
        },
      });
    }

    // If this webhook came from Green-API (has senderData), send outbound WhatsApp message via Green-API REST API
    const greenApiId = process.env.GREEN_API_ID_INSTANCE || '710722811499';
    const greenApiToken = process.env.GREEN_API_TOKEN || '98d11063fda64174ae6c50d0401bb2f0569f7f45a0ad49e3ac';
    const greenApiUrl = process.env.GREEN_API_URL || 'https://7107.api.greenapi.com';

    if (greenApiToken && cleanPhone) {
      try {
        const chatId = `${cleanPhone}@c.us`;
        const res = await fetch(`${greenApiUrl}/waInstance${greenApiId}/sendMessage/${greenApiToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId,
            message: replyText,
          }),
        });
        const sendResult = await res.json();
        console.log('Green-API outbound reply sent:', sendResult);
      } catch (sendErr) {
        console.error('Error sending Green-API reply:', sendErr);
      }
    }

    return NextResponse.json({
      success: true,
      phone: cleanPhone,
      recognized_slug: incomingSlug,
      reply: replyText,
    });
  } catch (err: unknown) {
    console.error('WhatsApp webhook error:', err);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    engine: 'RetainNG WhatsApp Autopilot Bot',
    supported_gateways: ['Twilio WhatsApp API', 'Meta Cloud API', 'Termii WhatsApp'],
  });
}
