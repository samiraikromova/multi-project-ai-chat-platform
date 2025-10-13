import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { message, userId, projectSlug, model, threadId } = await req.json()

    if (!message || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current authenticated user or use demo user
    const { data: { user } } = await supabase.auth.getUser()
    const actualUserId = user?.id || userId

    // Get project
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('slug', projectSlug)
      .single()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    let currentThreadId = threadId

    // Create or get thread
    if (!currentThreadId) {
      const { data: newThread, error: threadError } = await supabase
        .from('chat_threads')
        .insert({
          user_id: actualUserId,
          project_id: project.id,
          title: message.slice(0, 50),
          model: model || 'Claude Sonnet 4'
        })
        .select()
        .single()

      if (threadError) {
        console.error('Error creating thread:', threadError)
        return NextResponse.json({ error: threadError.message }, { status: 500 })
      }

      currentThreadId = newThread.id
    }

    // Save user message
    await supabase.from('messages').insert({
      thread_id: currentThreadId,
      role: 'user',
      content: message,
    })

    // Try n8n or fallback
    let replyContent = 'AI response received'

    if (process.env.N8N_WEBHOOK_URL) {
      try {
        const n8nResponse = await fetch(process.env.N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, userId: actualUserId, projectSlug, model }),
          signal: AbortSignal.timeout(25000) // 25 second timeout
        })

        if (n8nResponse.ok) {
          const contentType = n8nResponse.headers.get('content-type')
          if (contentType?.includes('application/json')) {
            const aiResponse = await n8nResponse.json()
            replyContent = aiResponse.output || aiResponse.reply || aiResponse.message || replyContent
          } else {
            replyContent = await n8nResponse.text()
          }
        }
      } catch (error) {
        console.error('n8n error:', error)
        replyContent = `I received your message: "${message}". The AI service is temporarily unavailable.`
      }
    } else {
      replyContent = `Echo: ${message} (n8n not configured)`
    }

    // Save AI response
    await supabase.from('messages').insert({
      thread_id: currentThreadId,
      role: 'assistant',
      content: replyContent,
      model: model || 'claude-sonnet-4',
    })

    return NextResponse.json({
      reply: replyContent,
      success: true,
      threadId: currentThreadId
    })
  } catch (error: any) {
    console.error('Chat API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}