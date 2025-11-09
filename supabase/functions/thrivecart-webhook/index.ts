// @ts-nocheck
/// <reference types="https://deno.land/x/types/index.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRODUCT_CONFIG: Record<number, { tier: string; monthlyCredits: number; price: number; type: string }> = {
  // Subscriptions
  8: { tier: 'tier2', monthlyCredits: 40000, price: 99, type: 'subscription' },
  7: { tier: 'tier1', monthlyCredits: 10000, price: 29, type: 'subscription' },

  // Top-ups (one-time purchases)
  9: { tier: 'free', monthlyCredits: 1000, price: 10, type: 'topup' },
  10: { tier: 'free', monthlyCredits: 2500, price: 25, type: 'topup' },
  11: { tier: 'free', monthlyCredits: 5000, price: 50, type: 'topup' },
  12: { tier: 'free', monthlyCredits: 10000, price: 100, type: 'topup' },
};

// Parse form-encoded data
async function parseFormData(req: Request): Promise<Record<string, any>> {
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const data: Record<string, any> = {};

    for (const [key, value] of params.entries()) {
      if (key.includes('[')) {
        const match = key.match(/^([^\[]+)\[([^\]]+)\]$/);
        if (match) {
          const parent = match[1];
          const child = match[2];
          if (!data[parent]) data[parent] = {};
          data[parent][child] = value;
        }
      } else {
        data[key] = value;
      }
    }

    return data;
  } catch (err) {
    console.error('Parse error:', err);
    return {};
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method === 'HEAD') {
    console.log('🔍 HEAD request - ThriveCart verification');
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method === 'GET') {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Missing Supabase credentials'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await supabase.from('users').select('count').limit(1);

    return new Response(JSON.stringify({
      status: 'active',
      timestamp: new Date().toISOString(),
      supabaseConnected: !error
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (req.method === 'POST') {
    try {
      const body = await parseFormData(req);

      console.log('='.repeat(60));
      console.log('🔔 ThriveCart Webhook Received');
      console.log('Event:', body.event);
      console.log('Customer Email:', body.customer?.email);
      console.log('Product ID:', body.base_product);
      console.log('Coupon Code:', body.coupon_code || 'None');
      console.log('='.repeat(60));

      // Verify secret
      const THRIVECART_SECRET = Deno.env.get('THRIVECART_SECRET');
      if (THRIVECART_SECRET && body.thrivecart_secret !== THRIVECART_SECRET) {
        console.error('❌ Invalid secret');
        return new Response(JSON.stringify({ error: 'Invalid secret' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const event = (body.event || '').toString().trim();
      const email = body.customer?.email;
      const productId = parseInt(body.base_product);
      const couponCode = body.coupon_code;

      if (!email) {
        console.error('❌ No email');
        return new Response(JSON.stringify({ error: 'Email required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!productId || isNaN(productId)) {
        console.error('❌ Invalid product ID');
        return new Response(JSON.stringify({ error: 'Product ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const config = PRODUCT_CONFIG[productId];
      if (!config) {
        console.error(`❌ Unknown product: ${productId}`);
        return new Response(JSON.stringify({ error: `Unknown product: ${productId}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Initialize Supabase
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase environment variables');
        return new Response(JSON.stringify({
          error: 'Server configuration error'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      // Find or create user
      let { data: user } = await supabase
        .from('users')
        .select('id, credits, email, subscription_tier')
        .eq('email', email)
        .maybeSingle();

      if (!user) {
        console.log('Creating new user...');
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            email: email,
            name: body.customer?.name || body.customer?.first_name || email.split('@')[0],
            credits: 0,
            subscription_tier: 'free'
          })
          .select()
          .single();

        if (createError || !newUser) {
          console.error('Failed to create user:', createError);
          return new Response(JSON.stringify({ error: 'User creation failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        user = newUser;
      }

      console.log(`✅ User: ${user.email} (${user.id})`);

      // ========================================
      // HANDLE COUPON CODE
      // ========================================
      if (couponCode && event === 'order.success') {
        const { data: coupon } = await supabase
          .from('coupons')
          .select('*')
          .eq('code', couponCode)
          .single();

        if (coupon) {
          // Check if coupon is still valid
          const now = new Date();
          const isExpired = coupon.expires_at && new Date(coupon.expires_at) < now;
          const maxUsesReached = coupon.max_uses && coupon.uses >= coupon.max_uses;

          if (isExpired) {
            console.log(`⚠️ Coupon ${couponCode} has expired`);
          } else if (maxUsesReached) {
            console.log(`⚠️ Coupon ${couponCode} max uses reached`);
          } else {
            // Apply coupon
            if (coupon.type === 'trial') {
              console.log(`🎁 Applying trial coupon: ${coupon.months} months`);

              const trialCredits = config.monthlyCredits * coupon.months;
              const newCredits = (user.credits || 0) + trialCredits;

              await supabase
                .from('users')
                .update({
                  credits: newCredits,
                  subscription_tier: config.tier
                })
                .eq('id', user.id);

              // Log transaction
              await supabase.from('credit_transactions').insert({
                user_id: user.id,
                amount: trialCredits,
                type: 'trial',
                payment_method: 'coupon',
                metadata: {
                  coupon_code: couponCode,
                  months: coupon.months,
                  order_id: body.order?.id
                }
              });

              // Increment coupon usage
              await supabase
                .from('coupons')
                .update({ uses: coupon.uses + 1 })
                .eq('code', couponCode);

              console.log(`✅ Trial applied: +${trialCredits} credits`);
            } else if (coupon.type === 'discount') {
              console.log(`💰 Discount coupon applied: ${coupon.discount_percent}%`);
              // Note: ThriveCart handles price discount, we just log it
              await supabase
                .from('coupons')
                .update({ uses: coupon.uses + 1 })
                .eq('code', couponCode);
            }
          }
        }
      }

      // ========================================
      // HANDLE EVENTS
      // ========================================
      if (event === 'order.success' || event === 'order.subscription_payment') {
        console.log('💳 Processing purchase/renewal');

        // Check if this is a top-up or subscription
        if (config.type === 'topup') {
          // One-time credit purchase
          const newCredits = (user.credits || 0) + config.monthlyCredits;

          await supabase
            .from('users')
            .update({ credits: newCredits })
            .eq('id', user.id);

          // Log transaction
          await supabase.from('credit_transactions').insert({
            user_id: user.id,
            amount: config.monthlyCredits,
            type: 'purchase',
            payment_method: 'thrivecart',
            metadata: {
              product_id: productId,
              price: config.price,
              order_id: body.order?.id
            }
          });

          console.log(`✅ Top-up: +${config.monthlyCredits} credits (Total: ${newCredits})`);

          return new Response(JSON.stringify({
            success: true,
            message: 'Credits added',
            credits: newCredits
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });

        } else {
          // Subscription
          const newCredits = (user.credits || 0) + config.monthlyCredits;
          const renewalDate = new Date();
          renewalDate.setMonth(renewalDate.getMonth() + 1);

          await supabase
            .from('users')
            .update({
              subscription_tier: config.tier,
              credits: newCredits
            })
            .eq('id', user.id);

          const { data: existingCredit } = await supabase
            .from('user_credits')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

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

          // Log transaction
          await supabase.from('credit_transactions').insert({
            user_id: user.id,
            amount: config.monthlyCredits,
            type: 'subscription',
            payment_method: 'thrivecart',
            metadata: {
              product_id: productId,
              tier: config.tier,
              order_id: body.order?.id
            }
          });

          console.log(`✅ Subscription: +${config.monthlyCredits} credits (Total: ${newCredits})`);

          return new Response(JSON.stringify({
            success: true,
            message: event === 'order.success' ? 'Subscription activated' : 'Subscription renewed',
            credits: newCredits,
            tier: config.tier
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

      } else if (event === 'order.subscription_cancelled' || event === 'order.subscription_paused') {
        console.log('🚫 Processing cancellation/pause');

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

        return new Response(JSON.stringify({
          success: true,
          message: event.includes('cancelled') ? 'Subscription cancelled' : 'Subscription paused'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });

      } else if (event === 'order.refund') {
        console.log('💸 Processing refund');

        const creditsToRemove = config.monthlyCredits;
        const newCreditBalance = Math.max(0, (user.credits || 0) - creditsToRemove);

        await supabase
          .from('users')
          .update({ credits: newCreditBalance })
          .eq('id', user.id);

        // Log refund
        await supabase.from('credit_transactions').insert({
          user_id: user.id,
          amount: -creditsToRemove,
          type: 'refund',
          payment_method: 'thrivecart',
          metadata: {
            product_id: productId,
            order_id: body.order?.id
          }
        });

        return new Response(JSON.stringify({
          success: true,
          message: 'Refund processed',
          credits: newCreditBalance
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });

      } else {
        console.log('⚠️ Unhandled event:', event);
        return new Response(JSON.stringify({
          success: true,
          message: `Event ${event} received but not handled`
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

    } catch (err) {
      const error = err as Error;
      console.error('❌ Webhook error:', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});