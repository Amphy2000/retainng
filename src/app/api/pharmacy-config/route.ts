/**
 * RetainNG Pharmacy Config API
 *
 * This is the server-side "bridge" that lets the webhook know:
 * - What manager phone number to alert for each pharmacy slug
 * - What the pharmacy display name is
 *
 * When Supabase is connected, this will simply query the businesses table.
 * For now, it maintains an in-memory map that grows as pharmacies register.
 *
 * The Settings page POSTs to this endpoint when the owner saves their profile.
 * The WhatsApp webhook GETs from this endpoint when it needs the manager phone.
 *
 * Zero env variables needed per pharmacy — ever.
 */

import { NextRequest, NextResponse } from 'next/server';

// In-memory store (server process lifetime)
// In production: replace with Supabase DB query
const pharmacyConfig: Record<
  string,
  { pharmacyName: string; managerPhone: string; conciergePhone: string }
> = {
  // Pre-seeded from the active business on RetainNG
  'apex-pharmacy': {
    pharmacyName: 'Apex Health & Community Pharmacy',
    managerPhone: '', // Set via Settings page
    conciergePhone: '+234 916 915 3129',
  },
};

/** GET /api/pharmacy-config?slug=apex-pharmacy — webhook calls this */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') || '';
  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  const config = pharmacyConfig[slug];
  if (!config) {
    return NextResponse.json({ found: false, slug }, { status: 404 });
  }

  return NextResponse.json({ found: true, slug, ...config });
}

/** POST /api/pharmacy-config — Settings page calls this on Save Profile */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, pharmacyName, managerPhone, conciergePhone } = body;

    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 });
    }

    pharmacyConfig[slug] = {
      pharmacyName: pharmacyName || slug,
      managerPhone: managerPhone || '',
      conciergePhone: conciergePhone || '',
    };

    return NextResponse.json({ success: true, slug, saved: pharmacyConfig[slug] });
  } catch (err) {
    console.error('pharmacy-config POST error:', err);
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}
