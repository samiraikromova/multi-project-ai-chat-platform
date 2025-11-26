// app/api/generate-image/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as https from "node:https";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ✅ MARKUP MULTIPLIER - Charge users 3x actual cost
const MARKUP_MULTIPLIER = 3

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      message,
      userId,
      projectId,
      projectSlug,
      quality = 'BALANCED',
      numImages = 1,
      aspectRatio = 'square_hd',
      threadId
    } = body

    console.log('🎨 Image generation request:', { userId, quality, numImages, aspectRatio })

    // Check credits
    const { data: user } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single()

    // ✅ Calculate cost with 3x markup BEFORE checking
    const basePricing: Record<string, number> = {
      'TURBO': 0.03,
      'BALANCED': 0.06,
      'QUALITY': 0.09
    }

    const baseCost = basePricing[quality] || 0.06
    const totalCost = (baseCost * numImages * MARKUP_MULTIPLIER) // ✅ 3x markup

    console.log(`💰 Base cost: $${baseCost} x ${numImages} images x ${MARKUP_MULTIPLIER}x markup = $${totalCost.toFixed(4)}`)

    if (!user || Number(user.credits) < totalCost) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please top up or upgrade your plan.' },
        { status: 402 }
      )
    }

    let currentThreadId = threadId

    // Create thread if needed
    if (!currentThreadId) {
      const { data: newThread } = await supabase
        .from('chat_threads')
        .insert({
          user_id: userId,
          project_id: projectId,
          title: message.substring(0, 50),
          model: 'Ideogram'
        })
        .select()
        .single()

      if (newThread) {
        currentThreadId = newThread.id
      }
    }

    // Save user message
    await supabase.from('messages').insert({
      thread_id: currentThreadId,
      role: 'user',
      content: message,
      model: `Ideogram - ${quality}`
    })

    // Call N8N
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'https://n8n.leveragedcreator.ai/webhook/cb4-chat'

    const n8nPayload = {
      message,
      userId,
      projectId,
      projectSlug,
      quality,
      numImages,
      aspectRatio,
      threadId: currentThreadId,
      isImageGeneration: true
    }

    console.log('🔄 Calling N8N image webhook...')

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(n8nPayload),
      signal: AbortSignal.timeout(300000)
    })

    if (!n8nResponse.ok) {
      throw new Error('Image generation failed')
    }

    const result = await n8nResponse.json()

    // Deduct credits (already marked up)
    const newCredits = Number(user.credits) - totalCost

    await supabase
      .from('users')
      .update({
        credits: newCredits,
        last_credit_update: new Date().toISOString()
      })
      .eq('id', userId)

    // ✅ Log usage with proper error handling
    const { error: usageError } = await supabase.from('usage_logs').insert({
      user_id: userId,
      model: `Ideogram - ${quality}`,
      tokens_input: 0,
      tokens_output: 0,
      estimated_cost: totalCost,
    })

    if (usageError) {
      console.error('❌ Failed to log usage:', usageError)
    }

    // Save assistant messages (one per image)
    if (result.imageUrls && result.imageUrls.length > 0) {
      for (const imageUrl of result.imageUrls) {
        await supabase.from('messages').insert({
          thread_id: currentThreadId,
          role: 'assistant',
          content: imageUrl,
          model: `Ideogram - ${quality}`
        })
      }
    }

    return NextResponse.json({
      success: true,
      imageUrls: result.imageUrls || [],
      cost: totalCost,
      remainingCredits: newCredits,
      threadId: currentThreadId,
      isTextResponse: result.isTextResponse || false,
      message: result.message || result.reply
    })

  } catch (error: any) {
    console.error('❌ Image generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}