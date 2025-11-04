import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Product configuration with MONTHLY credits (not one-time)
const PRODUCT_CONFIG: Record<number, { tier: string; monthlyCredits: number; price: number }> = {
  7: { tier: 'tier1', monthlyCredits: 10, price: 29 },
  8: { tier: 'tier2', monthlyCredits: 40, price: 99 }
};

export async function POST(req: Request) {
  try {
    // 1. Parse webhook payload
    const body = await req.json();

    // 2. Enhanced logging
    console.log('='.repeat(60));
    console.log('🔔 ThriveCart Webhook Received');
    console.log('='.repeat(60));
    console.log('Event Type:', body.event);
    console.log('Product ID:', body.product_id);
    console.log('Customer Email:', body.customer?.email);
    console.log('Full Payload:', JSON.stringify(body, null, 2));
    console.log('='.repeat(60));

    // 3. Extract data (ThriveCart uses different field names for different events)
    const email = body.customer?.email || body.customer_email || body.email;
    const productId = parseInt(body.product_id || body.product?.id);
    const event = body.event || body.event_type || 'order.success';
    const orderId = body.order_id || body.id;
    const subscriptionId = body.subscription?.id || body.subscription_id;

    // 4. Validate required fields
    if (!email) {
      console.error('❌ No email found in webhook');
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    if (!productId || isNaN(productId)) {
      console.error('❌ No valid product_id found in webhook');
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    // 5. Get product configuration
    const config = PRODUCT_CONFIG[productId];
    if (!config) {
      console.error(`❌ Unknown product ID: ${productId}`);
      return NextResponse.json({
        error: `Unknown product ID: ${productId}. Valid IDs: 7, 8`
      }, { status: 400 });
    }

    console.log(`✅ Product Config: Tier=${config.tier}, Credits=${config.monthlyCredits}`);

    // 6. Initialize Supabase
    const supabase = await createClient();

    // 7. Find or create user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, credits, email, subscription_tier')
      .eq('email', email)
      .single();

    if (userError || !user) {
      console.log('⚠️ User not found, creating new user...');
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: email,
          name: body.customer?.name || email.split('@')[0],
          credits: 0,
          subscription_tier: 'free'
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Failed to create user:', createError);
        return NextResponse.json({ error: 'User creation failed' }, { status: 500 });
      }
      const user = newUser;
    }

    // Type guard to ensure user is not null
    if (!user) {
      console.error('❌ User is null after creation attempt');
      return NextResponse.json({ error: 'User creation failed' }, { status: 500 });
    }

    console.log(`✅ User found: ${user.email} (ID: ${user.id})`);

    // 8. Handle different webhook events
    switch (event) {
      case 'order.success':
      case 'subscription.charge.success':
        // SUBSCRIPTION ACTIVATION OR RENEWAL
        console.log(`💳 Processing ${event === 'order.success' ? 'initial purchase' : 'renewal'}`);

        const newCredits = (user.credits || 0) + config.monthlyCredits;
        const renewalDate = new Date();
        renewalDate.setMonth(renewalDate.getMonth() + 1);

        // Update users table
        const { error: updateError } = await supabase
          .from('users')
          .update({
            subscription_tier: config.tier,
            credits: newCredits
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('❌ Failed to update users table:', updateError);
          return NextResponse.json({ error: 'Update failed' }, { status: 500 });
        }

        // Update or insert into user_credits table
        const { data: existingCredit } = await supabase
          .from('user_credits')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (existingCredit) {
          await supabase
            .from('user_credits')
            .update({
              tier: config.tier,
              credits: newCredits,
              monthly_allowance: config.monthlyCredits,
              renewal_date: renewalDate.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);
        } else {
          await supabase
            .from('user_credits')
            .insert({
              user_id: user.id,
              tier: config.tier,
              credits: newCredits,
              monthly_allowance: config.monthlyCredits,
              renewal_date: renewalDate.toISOString()
            });
        }

        console.log(`✅ Credits added: ${config.monthlyCredits} (New total: ${newCredits})`);

        return NextResponse.json({
          success: true,
          message: `${event === 'order.success' ? 'Subscription activated' : 'Subscription renewed'}`,
          credits: newCredits,
          tier: config.tier
        });

      case 'subscription.cancelled':
      case 'subscription.paused':
        // SUBSCRIPTION CANCELLATION
        console.log(`🚫 Processing subscription ${event === 'subscription.cancelled' ? 'cancellation' : 'pause'}`);

        await supabase
          .from('users')
          .update({ subscription_tier: 'free' })
          .eq('id', user.id);

        await supabase
          .from('user_credits')
          .update({
            tier: 'free',
            monthly_allowance: 0,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        console.log(`✅ Subscription ${event === 'subscription.cancelled' ? 'cancelled' : 'paused'}`);

        return NextResponse.json({
          success: true,
          message: `Subscription ${event === 'subscription.cancelled' ? 'cancelled' : 'paused'}`
        });

      case 'order.refund':
        // REFUND - Remove credits
        console.log('💸 Processing refund');

        const creditsToRemove = config.monthlyCredits;
        const newCreditBalance = Math.max(0, (user.credits || 0) - creditsToRemove);

        await supabase
          .from('users')
          .update({
            subscription_tier: 'free',
            credits: newCreditBalance
          })
          .eq('id', user.id);

        console.log(`✅ Refund processed. Credits removed: ${creditsToRemove}`);

        return NextResponse.json({
          success: true,
          message: 'Refund processed',
          credits: newCreditBalance
        });

      default:
        console.log(`⚠️ Unhandled event type: ${event}`);
        return NextResponse.json({
          success: true,
          message: `Event ${event} received but not processed`
        });
    }

  } catch (err) {
    const error = err as Error;
    console.error('='.repeat(60));
    console.error('❌ WEBHOOK ERROR');
    console.error('='.repeat(60));
    console.error('Error:', error);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('='.repeat(60));

    return NextResponse.json({
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}

// Add GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    status: 'ThriveCart webhook endpoint is active',
    timestamp: new Date().toISOString(),
    supportedEvents: [
      'order.success',
      'subscription.charge.success',
      'subscription.cancelled',
      'subscription.paused',
      'order.refund'
    ]
  });
}