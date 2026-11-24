import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // Verify secret hash if configured on Flutterwave webhook settings
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH || 'retainng_secret_hash_2026';
    const signature = req.headers.get('verif-hash');
    if (signature && secretHash && signature !== secretHash) {
      return NextResponse.json({ error: 'Unauthorized webhook call' }, { status: 401 });
    }

    const event = payload?.event || payload?.['event.type'];
    const data = payload?.data;

    if (event === 'charge.completed' && data?.status === 'successful') {
      const txRef = data.tx_ref || '';
      const amount = data.amount || 0;

      // Determine duration from tx_ref
      let durationMonths = 1;
      if (txRef.includes('quarterly') || amount >= 60000) durationMonths = 3;
      if (txRef.includes('annual') || amount >= 200000) durationMonths = 12;

      const now = new Date();
      now.setDate(now.getDate() + (durationMonths * 30));
      const formattedRenewal = now.toISOString().split('T')[0];

      if (supabaseAdmin) {
        let query = supabaseAdmin.from('businesses').select('id, name');
        if (data?.meta?.slug) {
          query = query.eq('opt_in_slug', data.meta.slug);
        } else if (data?.meta?.business_id) {
          query = query.eq('id', data.meta.business_id);
        }

        const { data: matchedBiz } = await query.maybeSingle();
        if (matchedBiz) {
          await supabaseAdmin
            .from('businesses')
            .update({
              subscription_status: 'active',
              subscription_renewal_date: formattedRenewal,
              updated_at: new Date().toISOString(),
            })
            .eq('id', matchedBiz.id);
        }
      }
    }

    return NextResponse.json({ status: 'success' });
  } catch (err: unknown) {
    console.error('Flutterwave webhook processing error:', err);
    return NextResponse.json({ error: 'Webhook handling failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'healthy', provider: 'Flutterwave v4 Webhook' });
}
