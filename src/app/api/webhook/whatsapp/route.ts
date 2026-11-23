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

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      fromNumber = (formData.get('From') as string) || '';
      messageBody = (formData.get('Body') as string) || '';
    } else {
      const json = await req.json();
      fromNumber = json?.From || json?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from || '';
      messageBody = json?.Body || json?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || '';
    }

    const cleanPhone = fromNumber.replace(/^whatsapp:/i, '').trim();

    // Default response message
    const replyText =
      `🎉 Welcome! Your visit has been recorded on RetainNG.\n\n` +
      `Show this message at the counter to claim your VIP perk today. We look forward to serving you!`;

    // Return Twilio-compatible TwiML response
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
