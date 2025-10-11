import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { message, userId, projectSlug, model } = await req.json()

    if (!message || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!process.env.N8N_WEBHOOK_URL) {
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    const supabase = await createClient()

    // Save user message
    await supabase.from('messages').insert({
      thread_id: userId,
      role: 'user',
      content: message,
    })

    console.log('Sending to n8n:', { message, userId, projectSlug, model })

    // Send to n8n
    const n8nResponse = await fetch(process.env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, userId, projectSlug, model }),
    })

    console.log('n8n status:', n8nResponse.status)

    const contentType = n8nResponse.headers.get('content-type')
    let aiResponse

    if (contentType?.includes('application/json')) {
      aiResponse = await n8nResponse.json()
    } else {
      const text = await n8nResponse.text()
      console.log('n8n raw response:', text)
      aiResponse = { output: text, reply: text }
    }

    const replyContent = aiResponse.output || aiResponse.reply || aiResponse.message || 'No response'

    // Save AI response
    await supabase.from('messages').insert({
      thread_id: userId,
      role: 'assistant',
      content: replyContent,
      model: model || 'claude-sonnet-4',
    })

    return NextResponse.json({ reply: replyContent, success: true })
  } catch (error: any) {
    console.error('Chat API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}