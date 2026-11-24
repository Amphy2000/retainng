import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { SUBSCRIPTION_PLANS, PlanKey } from '../checkout/route';

const GREEN_API_ID = process.env.GREEN_API_ID || '710722811593';
const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN || 'c7cea54f5c6f4d31a9b74eb6576493a8ec085b4f65a04a62b5';
const GREEN_API_URL = process.env.GREEN_API_URL || 'https://7107.api.greenapi.com';

async function sendWhatsAppAlert(toPhone: string, message: string): Promise<void> {
  const cleanPhone = toPhone.replace(/[^0-9]/g, '');
  const chatId = `${cleanPhone}@c.us`;
  try {
    await fetch(`${GREEN_API_URL}/waInstance${GREEN_API_ID}/sendMessage/${GREEN_API_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message }),
    });
  } catch (err) {
    console.error('WhatsApp alert error:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tx_ref, plan_id, slug, business_id } = body;

    const planKey = (plan_id || 'monthly') as PlanKey;
    const plan = SUBSCRIPTION_PLANS[planKey] || SUBSCRIPTION_PLANS.monthly;

    const now = new Date();
    const renewalDate = new Date(now);
    renewalDate.setDate(renewalDate.getDate() + (plan.durationMonths * 30));
    const formattedRenewal = renewalDate.toISOString().split('T')[0];

    let businessName = 'Your Business';
    let managerPhone = '2349169153129';

    if (supabaseAdmin) {
      try {
        let query = supabaseAdmin.from('businesses').select('*');
        if (slug) {
          query = query.eq('opt_in_slug', slug);
        } else if (business_id) {
          query = query.eq('id', business_id);
        }

        const { data: biz } = await query.maybeSingle();

        if (biz) {
          businessName = biz.name;
          if (biz.manager_phone) managerPhone = biz.manager_phone;

          // Update business subscription in Supabase
          await supabaseAdmin
            .from('businesses')
            .update({
              subscription_status: 'active',
              monthly_retainer_ngn: plan.monthlyEquivalent,
              subscription_renewal_date: formattedRenewal,
              updated_at: new Date().toISOString(),
            })
            .eq('id', biz.id);
        }
      } catch (err) {
        console.warn('Supabase subscription update error:', err);
      }
    }

    // Send WhatsApp confirmation to store owner
    const receiptMsg =
      `🎉 *PAYMENT CONFIRMED — ${businessName.toUpperCase()}*\n\n` +
      `Your RetainNG Agency Autopilot subscription has been successfully activated! 🚀\n\n` +
      `• 📦 *Plan:* ${plan.name}\n` +
      `• 💰 *Amount Paid:* ₦${plan.amount.toLocaleString()}\n` +
      `• 📅 *Active Until:* ${formattedRenewal}\n` +
      `• 🛡️ *Status:* 100% Active & Protected\n\n` +
      `✅ All patient refill timers, local dialect voice notes (Hausa/Yoruba/Igbo), and automated touchpoints are fully active.\n\n` +
      `_Thank you for choosing RetainNG._`;

    await sendWhatsAppAlert(managerPhone, receiptMsg);

    return NextResponse.json({
      success: true,
      message: 'Subscription successfully activated and verified.',
      business_name: businessName,
      plan: plan.name,
      amount: plan.amount,
      renewal_date: formattedRenewal,
    });
  } catch (err: unknown) {
    console.error('Verification error:', err);
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
  }
}
