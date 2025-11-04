import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('🔔 ThriveCart Webhook Received:', JSON.stringify(body, null, 2));

    // Return 200 immediately for test webhooks
    if (!body.customer && !body.customer_email && !body.email) {
      console.log('✅ Test webhook received successfully');
      return NextResponse.json({ success: true, message: 'Test webhook received' }, { status: 200 });
    }

    const email = body.customer?.email || body.customer_email || body.email;
    const productId = body.product_id || body.product?.id;
    const event = body.event || body.event_type;

    console.log('📧 Email:', email);
    console.log('📦 Product ID:', productId);
    console.log('🎯 Event:', event);

    const tierMap: Record<string, { tier: string; credits: number }> = {
      '7': { tier: 'tier1', credits: 10000 },
      '8': { tier: 'tier2', credits: 40000 },
      'product_7': { tier: 'tier1', credits: 10000 },
      'product_8': { tier: 'tier2', credits: 40000 }
    };

    const config = tierMap[String(productId)] || tierMap[`product_${productId}`];

    if (!config) {
      console.log('⚠️ Unknown product ID:', productId);
      return NextResponse.json({ success: true, message: 'Webhook received' }, { status: 200 });
    }

    const supabase = await createClient();
    const { data: user } = await supabase
      .from('users')
      .select('id, credits, email')
      .eq('email', email)
      .single();

    if (!user) {
      console.log('⚠️ User not found:', email);
      return NextResponse.json({ success: true, message: 'Webhook received' }, { status: 200 });
    }

    if (event === 'order.success' || event === 'subscription.charge.success' || !event) {
      const newCredits = (user.credits || 0) + config.credits;

      await supabase
        .from('users')
        .update({
          subscription_tier: config.tier,
          credits: newCredits
        })
        .eq('email', email);

      console.log('✅ Credits added:', newCredits);
      return NextResponse.json({
        success: true,
        message: 'Credits added',
        credits: newCredits
      }, { status: 200 });
    }

    return NextResponse.json({ success: true, event }, { status: 200 });

  } catch (err) {
    console.error('❌ Webhook error:', err);
    // Still return 200 so ThriveCart doesn't retry
    return NextResponse.json({
      success: true,
      message: 'Webhook received but had processing error'
    }, { status: 200 });
  }
}