// @ts-nocheck
/// <reference types="https://deno.land/x/types/index.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRODUCT_CONFIG: Record<number, { tier: string; monthlyCredits: number; price: number }> = {
  8: { tier: 'tier2', monthlyCredits: 40000, price: 99 },
  7: { tier: 'tier1', monthlyCredits: 10000, price: 29 }
};

// Parse form-encoded data
// Helper to parse form data
async function parseFormData(req: Request): Promise<Record<string, any>> {
  try {
    // Get raw text first
    const text = await req.text();

    // Parse as URLSearchParams
    const params = new URLSearchParams(text);
    const data: Record<string, any> = {};

    for (const [key, value] of params.entries()) {
      if (key.includes('[')) {
        // Parse nested: customer[email] -> data.customer.email
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
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Handle HEAD
  if (req.method === 'HEAD') {
    console.log('🔍 HEAD request - ThriveCart verification');
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Handle GET (health check)
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

  // Handle POST request (webhook)
  if (req.method === 'POST') {
  try {
    const body = await parseFormData(req);
    // After parsing, add this:
    console.log('Event value:', body.event);
    console.log('Event type:', typeof body.event);
    console.log('Event length:', body.event?.length);
    console.log('Event comparison:', body.event === 'order.success');
    console.log('='.repeat(60));
    console.log('🔔 ThriveCart Webhook Received');
    console.log('='.repeat(60));
    console.log('Parsed keys:', Object.keys(body));
    console.log('Event:', body.event);
    console.log('Mode:', body.mode);
    console.log('Base Product:', body.base_product);
    console.log('Customer Email:', body.customer?.email);
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

      // Extract data
      const event = (body.event || '').toString().trim();
      const email = body.customer?.email;
      const productId = parseInt(body.base_product);
      const mode = body.mode;

      console.log('Extracted event:', event);
      console.log('Extracted email:', email);
      console.log('Extracted productId:', productId);

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

      console.log(`✅ Config found: ${config.tier}, ${config.monthlyCredits} credits`);

      // Initialize Supabase
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      // Validate environment
      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase environment variables', {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseServiceKey
        });
        return new Response(JSON.stringify({
          error: 'Server configuration error - missing credentials'
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

      // Handle events
    console.log('Checking event:', event, 'against order.success');

if (event === 'order.success' || event === 'order.subscription_payment') {
  console.log('💳 Processing subscription activation/renewal');
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

          console.log(`✅ Credits: ${config.monthlyCredits} added (Total: ${newCredits})`);

          return new Response(JSON.stringify({
            success: true,
            message: event === 'order.success' ? 'Subscription activated' : 'Subscription renewed',
            credits: newCredits,
            tier: config.tier,
            mode: mode
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });

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
            .update({
              subscription_tier: 'free',
              credits: newCreditBalance
            })
            .eq('id', user.id);

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
        message: `Event ${event} received but not handled`,
        availableEvents: ['order.success', 'order.subscription_payment', 'order.subscription_cancelled', 'order.refund']
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