import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { message, userId, projectSlug } = await req.json()

    if (!message || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Save user message to database
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        thread_id: userId, // temporary - will be replaced with actual thread_id
        role: 'user',
        content: message,
      })

    if (insertError) {
      console.error('Error saving message:', insertError)
    }

    // Send to n8n webhook
    const n8nResponse = await fetch(process.env.N8N_WEBHOOK_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        userId,
        projectSlug,
      }),
    })

    if (!n8nResponse.ok) {
      throw new Error('n8n webhook failed')
    }

    const aiResponse = await n8nResponse.json()

    // Save AI response to database
    await supabase.from('messages').insert({
      thread_id: userId,
      role: 'assistant',
      content: aiResponse.output || aiResponse.reply || 'No response',
      model: aiResponse.model || 'claude-sonnet-4',
    })

    return NextResponse.json({
      reply: aiResponse.output || aiResponse.reply || 'No response',
      success: true,
    })
  } catch (error: any) {
    console.error('Chat API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}