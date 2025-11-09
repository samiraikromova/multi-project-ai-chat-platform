import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TOPUP_PRODUCT_CONFIG: Record<number, { amount: number }> = {
  9: { amount: 10 },
  10: { amount: 25 },
  11: { amount: 50 },
  12: { amount: 100 }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    console.log('🔔 ThriveCart Top-Up Webhook:', body.event, body.customer?.email)

    // Verify secret
    const THRIVECART_SECRET = process.env.THRIVECART_SECRET
    if (THRIVECART_SECRET && body.thrivecart_secret !== THRIVECART_SECRET) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 })
    }

    const event = body.event
    const email = body.customer?.email
    const productId = parseInt(body.base_product)

    if (!email || !productId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const config = TOPUP_PRODUCT_CONFIG[productId]
    if (!config) {
      return NextResponse.json({ error: 'Unknown product' }, { status: 400 })
    }

    // Find user by email
    const { data: user } = await supabase
      .from('users')
      .select('id, credits')
      .eq('email', email)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Handle top-up purchase
    if (event === 'order.success') {
      const newCredits = (Number(user.credits) || 0) + config.amount

      await supabase
        .from('users')
        .update({ credits: newCredits })
        .eq('id', user.id)

      // Log transaction
      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: config.amount,
        type: 'purchase',
        payment_method: 'thrivecart',
        metadata: {
          order_id: body.order?.id,
          product_id: productId
        }
      })

      console.log(`✅ Top-up successful: +$${config.amount} for ${email}`)

      return NextResponse.json({
        success: true,
        message: 'Credits added',
        credits: newCredits
      })
    }

    // Handle refund
    if (event === 'order.refund') {
      const newCredits = Math.max(0, (Number(user.credits) || 0) - config.amount)

      await supabase
        .from('users')
        .update({ credits: newCredits })
        .eq('id', user.id)

      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: -config.amount,
        type: 'refund',
        payment_method: 'thrivecart',
        metadata: { order_id: body.order?.id }
      })

      console.log(`💸 Refund processed: -$${config.amount} for ${email}`)

      return NextResponse.json({
        success: true,
        message: 'Refund processed',
        credits: newCredits
      })
    }

    return NextResponse.json({ success: true, message: 'Event not handled' })
  } catch (error: any) {
    console.error('❌ Top-up webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}