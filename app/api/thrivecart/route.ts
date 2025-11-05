import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Product configuration with MONTHLY credits (not one-time)
const PRODUCT_CONFIG: Record<number, { tier: string; monthlyCredits: number; price: number }> = {
  7: { tier: 'tier1', monthlyCredits: 10, price: 29 },
  8: { tier: 'tier2', monthlyCredits: 40, price: 99 }
};

// Your ThriveCart secret word - get from Settings > API & Webhooks > ThriveCart order validation
const THRIVECART_SECRET = process.env.THRIVECART_SECRET || 'YOUR_SECRET_WORD';

// Helper to parse form data
async function parseFormData(req: Request): Promise<Record<string, any>> {
  const formData = await req.formData();
  const data: Record<string, any> = {};

  formData.forEach((value, key) => {
    // Handle nested keys like customer[email]
    if (key.includes('[')) {
      const parts = key.split(/\[|\]/).filter(Boolean);
      let current = data;

      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
    } else {
      data[key] = value;
    }
  });

  return data;
}

export async function HEAD() {
  // ThriveCart pings with HEAD to verify endpoint is alive
  console.log('🔍 HEAD request received - ThriveCart verification');
  return new NextResponse(null, { status: 200 });
}

export async function GET() {
  // Health check endpoint
  console.log('🔍 GET request to webhook endpoint');

  try {
    const supabase = await createClient();
    const { error } = await supabase.from('users').select('count').limit(1);

    return NextResponse.json({
      status: 'ThriveCart webhook endpoint is active',
      timestamp: new Date().toISOString(),
      supabaseConnected: !error,
      supportedEvents: [
        'order.success',
        'order.subscription_payment',
        'order.subscription_cancelled',
        'order.subscription_paused',
        'order.subscription_resumed',
        'order.refund'
      ],
      productConfig: {
        7: 'Tier 1 - $29/month - 10 credits',
        8: 'Tier 2 - $99/month - 40 credits'
      },
      format: 'application/x-www-form-urlencoded',
      security: THRIVECART_SECRET !== 'YOUR_SECRET_WORD' ? 'Secret configured ✅' : 'Secret NOT configured ❌'
    });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({
      status: 'Error',
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // 1. Parse form-encoded data (ThriveCart format)
    const body = await parseFormData(req);

    // 2. Enhanced logging
    console.log('='.repeat(60));
    console.log('🔔 ThriveCart Webhook Received');
    console.log('='.repeat(60));
    console.log('Timestamp:', new Date().toISOString());
    console.log('Mode:', body.mode, `(${body.mode_int === '1' ? 'TEST' : 'LIVE'})`);
    console.log('Event:', body.event);
    console.log('Base Product:', body.base_product);
    console.log('Customer Email:', body.customer?.email);
    console.log('Order ID:', body.order_id);
    console.log('Full Data:', JSON.stringify(body, null, 2));
    console.log('='.repeat(60));

    // 3. Verify ThriveCart secret (security check)
    if (THRIVECART_SECRET !== 'YOUR_SECRET_WORD' && body.thrivecart_secret !== THRIVECART_SECRET) {
      console.error('❌ Invalid ThriveCart secret');
      console.error('Expected:', THRIVECART_SECRET);
      console.error('Received:', body.thrivecart_secret);
      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 });
    }

    // 4. Extract data
    const email = body.customer?.email || body.customer_email;
    const productId = parseInt(body.base_product);
    const event = body.event;
    const _orderId = body.order_id;
    const mode = body.mode; // 'test' or 'live'

    console.log('📧 Extracted Email:', email);
    console.log('🆔 Extracted Product ID:', productId);
    console.log('🎯 Event:', event);
    console.log('🧪 Mode:', mode);

    // 5. Validate required fields
    if (!email) {
      console.error('❌ No email found in webhook');
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    if (!productId || isNaN(productId)) {
      console.error('❌ No valid base_product found in webhook');
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    // 6. Get product configuration
    const config = PRODUCT_CONFIG[productId];
    if (!config) {
      console.error(`❌ Unknown product ID: ${productId}`);
      console.log('Available product IDs:', Object.keys(PRODUCT_CONFIG));
      return NextResponse.json({
        error: `Unknown product ID: ${productId}. Valid IDs: ${Object.keys(PRODUCT_CONFIG).join(', ')}`
      }, { status: 400 });
    }

    console.log(`✅ Product Config Found: Tier=${config.tier}, Credits=${config.monthlyCredits}`);

    // 7. Initialize Supabase
    console.log('🔌 Connecting to Supabase...');
    const supabase = await createClient();

    // Test connection
    const { error: testError } = await supabase.from('users').select('count').limit(1);
    if (testError) {
      console.error('❌ Supabase connection failed:', testError);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    console.log('✅ Supabase connected successfully');

    // 8. Find or create user
    console.log(`🔍 Looking for user with email: ${email}`);
    const { data: existingUser, error: _userError } = await supabase
    .from('users')
    .select('id, credits, email, subscription_tier')
    .eq('email', email)
    .maybeSingle();

  let user = existingUser;


    if (!user) {
      console.log('⚠️ User not found, creating new user...');

      const customerName = body.customer?.name || body.customer?.first_name || email.split('@')[0];

      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: email,
          name: customerName,
          credits: 0,
          subscription_tier: 'free'
        })
        .select()
        .single();

      if (createError || !newUser) {
        console.error('❌ Failed to create user:', createError);
        return NextResponse.json({
          error: 'User creation failed',
          details: createError?.message
        }, { status: 500 });
      }

      user = newUser;
      console.log('✅ New user created:', newUser.id);

    } else {
      console.log('✅ Existing user found:', user.id);
    }

    // 👇 ADD THIS BLOCK RIGHT HERE
    // After the null-check
    if (!user) throw new Error('User creation failed — user is null after creation attempt.');
    const safeUser = user!;


    console.log(`✅ User ready: ${safeUser.email} (ID: ${safeUser.id}, Current Credits: ${safeUser.credits})`);


    // 9. Handle different webhook events
    switch (event) {
      case 'order.success':
      case 'order.subscription_payment':
        // SUBSCRIPTION ACTIVATION OR RENEWAL
        const isInitial = event === 'order.success';
        console.log(`💳 Processing ${isInitial ? 'initial purchase' : 'subscription renewal'}`);
        console.log(`Current credits: ${user.credits}, Adding: ${config.monthlyCredits}`);

        const newCredits = (user.credits || 0) + config.monthlyCredits;
        const renewalDate = new Date();
        renewalDate.setMonth(renewalDate.getMonth() + 1);

        console.log(`Updating users table...`);
        const { error: updateError } = await supabase
          .from('users')
          .update({
            subscription_tier: config.tier,
            credits: newCredits
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('❌ Failed to update users table:', updateError);
          return NextResponse.json({
            error: 'Update failed',
            details: updateError.message
          }, { status: 500 });
        }
        console.log('✅ Users table updated');

        // Update user_credits table
        console.log('Updating user_credits table...');
        const { data: existingCredit } = await supabase
          .from('user_credits')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingCredit) {
          const { error: creditUpdateError } = await supabase
            .from('user_credits')
            .update({
              tier: config.tier,
              credits: newCredits,
              monthly_allowance: config.monthlyCredits,
              renewal_date: renewalDate.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

          if (creditUpdateError) {
            console.error('❌ Failed to update user_credits:', creditUpdateError);
          } else {
            console.log('✅ user_credits updated');
          }
        } else {
          const { error: creditInsertError } = await supabase
            .from('user_credits')
            .insert({
              user_id: user.id,
              tier: config.tier,
              credits: newCredits,
              monthly_allowance: config.monthlyCredits,
              renewal_date: renewalDate.toISOString()
            });

          if (creditInsertError) {
            console.error('❌ Failed to insert user_credits:', creditInsertError);
          } else {
            console.log('✅ user_credits created');
          }
        }

        console.log(`✅ Credits added: ${config.monthlyCredits} (New total: ${newCredits})`);
        console.log('='.repeat(60));

        return NextResponse.json({
          success: true,
          message: isInitial ? 'Subscription activated' : 'Subscription renewed',
          credits: newCredits,
          tier: config.tier,
          user_id: user.id,
          mode: mode
        });

      case 'order.subscription_cancelled':
      case 'order.subscription_paused':
        // SUBSCRIPTION CANCELLATION/PAUSE
        console.log(`🚫 Processing subscription ${event.includes('cancelled') ? 'cancellation' : 'pause'}`);

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

        console.log(`✅ Subscription ${event.includes('cancelled') ? 'cancelled' : 'paused'}`);
        console.log('='.repeat(60));

        return NextResponse.json({
          success: true,
          message: `Subscription ${event.includes('cancelled') ? 'cancelled' : 'paused'}`,
          mode: mode
        });

      case 'order.subscription_resumed':
        // SUBSCRIPTION RESUMED
        console.log('▶️ Processing subscription resume');

        await supabase
          .from('users')
          .update({ subscription_tier: config.tier })
          .eq('id', user.id);

        await supabase
          .from('user_credits')
          .update({
            tier: config.tier,
            monthly_allowance: config.monthlyCredits,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        console.log('✅ Subscription resumed');
        console.log('='.repeat(60));

        return NextResponse.json({
          success: true,
          message: 'Subscription resumed',
          mode: mode
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
        console.log('='.repeat(60));

        return NextResponse.json({
          success: true,
          message: 'Refund processed',
          credits: newCreditBalance,
          mode: mode
        });

      default:
        console.log(`⚠️ Unhandled event type: ${event}`);
        console.log('='.repeat(60));
        return NextResponse.json({
          success: true,
          message: `Event ${event} received but not processed`,
          mode: mode
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

    // Still return 200 to avoid ThriveCart retrying
    return NextResponse.json({
      error: error.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 200 }); // Return 200 even on error to prevent retries
  }
}