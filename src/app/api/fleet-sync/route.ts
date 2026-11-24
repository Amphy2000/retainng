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
      const now = new Date();
      const trialExpiry = new Date(now);
      trialExpiry.setDate(trialExpiry.getDate() + 14);
      const defaultRenewal = trialExpiry.toISOString().split('T')[0];

      const rawStatus = payload.subscription_status;
      const normalizedStatus = (rawStatus === '14-Day Free Pilot' || rawStatus === 'trial') ? 'trial' : (rawStatus || 'trial');

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
          monthly_retainer_ngn: payload.monthly_retainer_ngn || 25000,
          subscription_status: normalizedStatus,
          subscription_renewal_date: payload.subscription_renewal_date || defaultRenewal,
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
      const sanitizedUpdates = { ...updates };
      if (sanitizedUpdates.subscription_status === '14-Day Free Pilot') {
        sanitizedUpdates.subscription_status = 'trial';
      }

      let res = await supabaseAdmin
        .from('businesses')
        .update({
          ...sanitizedUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      // If new subscription columns don't exist yet in Supabase schema, fall back safely
      if (res.error && (res.error.message.includes('column') || res.error.code === '42703')) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { monthly_retainer_ngn, subscription_status, subscription_renewal_date, ...standardUpdates } = updates;
        res = await supabaseAdmin
          .from('businesses')
          .update({
            ...standardUpdates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();
      }

      if (res.error) {
        return NextResponse.json({ error: res.error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, business: res.data });
    }

    if (action === 'register_opt_in') {
      const { business_id, full_name, phone, email, tags, notes, category, visit_date } = payload;

      const custRes = await supabaseAdmin
        .from('customers')
        .upsert(
          {
            business_id,
            full_name,
            phone,
            email: email || null,
            tags: tags || ['Bag Slip Scan'],
            notes: notes || `Registered via Counter QR. Care: ${category || 'General'}`,
            consent_status: 'consented',
            consent_source: 'qr_optin',
            total_visits: 1,
            last_visit_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'business_id,phone' }
        )
        .select()
        .single();

      let saleRes;
      if (custRes.data) {
        saleRes = await supabaseAdmin
          .from('sales_or_visits')
          .insert({
            business_id,
            customer_id: custRes.data.id,
            customer_name: full_name,
            customer_phone: phone,
            service_or_product: category || 'Bag Slip QR Registration',
            amount_ngn: 0,
            visit_date: visit_date || new Date().toISOString().split('T')[0],
            is_manual_entry: false,
          })
          .select()
          .single();
      }

      return NextResponse.json({
        success: true,
        customer: custRes.data,
        sale: saleRes?.data,
      });
    }

    if (action === 'create_sale') {
      const { data, error } = await supabaseAdmin
        .from('sales_or_visits')
        .insert({
          business_id: payload.business_id,
          customer_id: payload.customer_id,
          customer_name: payload.customer_name,
          customer_phone: payload.customer_phone,
          service_or_product: payload.service_or_product,
          amount_ngn: payload.amount_ngn || 0,
          visit_date: payload.visit_date || new Date().toISOString().split('T')[0],
          is_manual_entry: payload.is_manual_entry ?? true,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, sale: data });
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

    if (action === 'delete_business') {
      const { id } = payload;
      const { error } = await supabaseAdmin
        .from('businesses')
        .delete()
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, deleted_id: id });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    console.error('Fleet sync POST error:', err);
    return NextResponse.json({ error: 'Failed to process sync action' }, { status: 500 });
  }
}
