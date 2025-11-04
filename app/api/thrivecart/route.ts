import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // ✅ LOG EVERYTHING
    console.log('🔔 ThriveCart Webhook Received:', JSON.stringify(body, null, 2))

    const email = body.customer?.email || body.customer_email || body.email
    const productId = body.product_id || body.product?.id
    const event = body.event || body.event_type

    console.log('📧 Email:', email)
    console.log('📦 Product ID:', productId)
    console.log('🎯 Event:', event)

    if (!email) {
      console.error('❌ No email found in webhook')
      return NextResponse.json({ error: 'No email' }, { status: 400 })
    }

    // Map product IDs (UPDATE WITH YOUR REAL IDs)
    const tierMap: Record<string, { tier: string, credits: number }> = {
      '7': { tier: 'tier1', credits: 10000 },  // Your Tier 1 ID
      '8': { tier: 'tier2', credits: 40000 },  // Your Tier 2 ID
      'product_7': { tier: 'tier1', credits: 10000 },
      'product_8': { tier: 'tier2', credits: 40000 }
    }

    const config = tierMap[productId] || tierMap[`product_${productId}`]

    if (!config) {
      console.error('❌ Unknown product ID:', productId)
      return NextResponse.json({ error: 'Unknown product' }, { status: 400 })
    }

    console.log('💳 Config:', config)

    const supabase = await createClient()

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, credits, email')
      .eq('email', email)
      .single()

    console.log('👤 Found user:', user)
    console.log('❌ User error:', userError)

    if (!user) {
      console.error('❌ User not found with email:', email)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Handle events
    if (event === 'order.success' || event === 'subscription.charge.success' || !event) {
      const newCredits = (user.credits || 0) + config.credits

      console.log('💰 Adding credits:', {
        current: user.credits,
        adding: config.credits,
        new: newCredits
      })

      const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update({
          subscription_tier: config.tier,
          credits: newCredits
        })
        .eq('email', email)
        .select()

      console.log('✅ Update result:', updateData)
      console.log('❌ Update error:', updateError)

      if (updateError) {
        console.error('❌ Failed to update user:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Credits added',
        credits: newCredits
      })
    }

    return NextResponse.json({ success: true, event })

  } catch (error: any) {
    console.error('❌ Webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}