import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  try {
    const [bizRes, custRes, salesRes] = await Promise.all([
      supabaseAdmin.from('businesses').select('*').order('created_at', { ascending: true }),
      supabaseAdmin.from('customers').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('sales_or_visits').select('*').order('created_at', { ascending: false }),
    ]);

    return NextResponse.json({
      success: true,
      businesses: bizRes.data || [],
      customers: custRes.data || [],
      sales: salesRes.data || [],
    });
  } catch (err: unknown) {
    console.error('Fleet sync GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch cloud fleet data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { action, payload } = body;

    if (action === 'create_business') {
      const { data, error } = await supabaseAdmin
        .from('businesses')
        .insert({
          id: payload.id,
          name: payload.name,
          business_type: payload.business_type || 'pharmacy',
          phone: payload.phone,
          email: payload.email,
          address: payload.address,
          city: payload.city || 'Kaduna',
          state: payload.state || 'Kaduna',
          currency: payload.currency || 'NGN',
          timezone: payload.timezone || 'Africa/Lagos',
          opt_in_slug: payload.opt_in_slug,
          is_demo: false,
          manager_alert_phone: payload.manager_alert_phone || payload.phone || '2349169153129',
          concierge_phone: payload.concierge_phone || '+234 703 267 3310',
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase create_business error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, business: data });
    }

    if (action === 'update_business') {
      const { id, updates } = payload;
      const { data, error } = await supabaseAdmin
        .from('businesses')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, business: data });
    }

    if (action === 'create_customer') {
      const { data, error } = await supabaseAdmin
        .from('customers')
        .insert({
          id: payload.id,
          business_id: payload.business_id,
          full_name: payload.full_name,
          phone: payload.phone,
          email: payload.email,
          address: payload.address,
          tags: payload.tags || [],
          notes: payload.notes,
          consent_status: payload.consent_status || 'consented',
          consent_source: payload.consent_source || 'manual_entry',
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, customer: data });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    console.error('Fleet sync POST error:', err);
    return NextResponse.json({ error: 'Failed to process sync action' }, { status: 500 });
  }
}
