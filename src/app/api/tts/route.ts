import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get('text') || searchParams.get('q') || '';
  let lang = searchParams.get('lang') || searchParams.get('tl') || 'en';

  if (!text.trim()) {
    return NextResponse.json({ error: 'Text parameter is required' }, { status: 400 });
  }

  // Sanitize text for audio
  const sanitized = text
    .replace(/\*+/g, '')
    .replace(/\[ref:[^\]]+\]/gi, '')
    .replace(/ORDER_DETECTED:[^\n]+/gi, '')
    .replace(/[^\p{L}\p{N}\p{P}\s]/gu, '')
    .trim()
    .slice(0, 200);

  // If language is unsupported by legacy endpoint (e.g. Yoruba or Igbo), fall back to Hausa or English
  const targetLang = lang === 'yo' || lang === 'ig' ? 'en' : lang;

  try {
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(
      targetLang
    )}&client=tw-ob&q=${encodeURIComponent(sanitized)}`;

    const response = await fetch(ttsUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://translate.google.com/',
      },
    });

    if (!response.ok) {
      // Fallback to English
      const fallbackUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(
        sanitized
      )}`;
      const fbRes = await fetch(fallbackUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://translate.google.com/',
        },
      });
      if (fbRes.ok) {
        const audioBuffer = await fbRes.arrayBuffer();
        return new NextResponse(audioBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.byteLength.toString(),
            'Cache-Control': 'public, max-age=86400, s-maxage=86400',
          },
        });
      }
      return NextResponse.json({ error: 'TTS upstream unavailable' }, { status: 502 });
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (err: unknown) {
    console.error('TTS generation error:', err);
    return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 });
  }
}
