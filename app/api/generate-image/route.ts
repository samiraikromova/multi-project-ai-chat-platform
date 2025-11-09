// app/api/generate-image/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { prompt, style, aspectRatio, userId, projectId } = await req.json()

    // Check credits (image generation costs ~$0.04 for DALL-E 3)
    const IMAGE_COST = 0.04

    const { data: user } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single()

    if (!user || Number(user.credits) < IMAGE_COST) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 402 }
      )
    }

    // Map aspect ratio to DALL-E size
    const sizeMap: Record<string, string> = {
      '1:1': '1024x1024',
      '16:9': '1792x1024',
      '9:16': '1024x1792'
    }

    // Call OpenAI DALL-E 3
    const openaiResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: `${style} style: ${prompt}`,
        size: sizeMap[aspectRatio] || '1024x1024',
        quality: 'standard',
        n: 1
      })
    })

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text()
      console.error('DALL-E error:', error)
      return NextResponse.json({ error: 'Image generation failed' }, { status: 500 })
    }

    const openaiData = await openaiResponse.json()
    const imageUrl = openaiData.data[0].url

    // Deduct credits
    const newCredits = Number(user.credits) - IMAGE_COST

    await supabase
      .from('users')
      .update({ credits: newCredits })
      .eq('id', userId)

    // Log usage
    await supabase.from('usage_logs').insert({
      user_id: userId,
      model: 'DALL-E 3',
      tokens_input: 0,
      tokens_output: 0,
      estimated_cost: IMAGE_COST,
      project_id: projectId,
      metadata: { type: 'image_generation', style, aspectRatio }
    })

    return NextResponse.json({
      success: true,
      imageUrl,
      cost: IMAGE_COST,
      remainingCredits: newCredits
    })

  } catch (error: any) {
    console.error('Image generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}