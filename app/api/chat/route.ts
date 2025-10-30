import { NextResponse } from "next/server"
import { createClient } from '@/lib/supabase/server'
import { getZepMemory, addZepMemory, ensureZepUser, createZepThread } from '@/lib/zep/client'

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'claude-haiku-4.5-20251001': { input: 0.80, output: 4.00 },
    'claude-sonnet-4.5-20250929': { input: 3.00, output: 15.00 },
    'claude-opus-4.1-20250805': { input: 15.00, output: 75.00 },
  }

  const rates = pricing[model] || { input: 0.80, output: 4.00 }
  return ((inputTokens / 1_000_000) * rates.input) + ((outputTokens / 1_000_000) * rates.output)
}

function getModelString(modelName: string): string {
  const modelMap: Record<string, string> = {
    'Claude Haiku 4.5': 'claude-haiku-4.5-20251001',
    'Claude Sonnet 4.5': 'claude-sonnet-4.5-20250929',
    'Claude Opus 4.1': 'claude-opus-4.1-20250805',
  }
  return modelMap[modelName] || 'claude-haiku-4.5-20251001'
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      message,
      userId,
      projectId,
      projectSlug: _projectSlug,
      model,
      threadId,
      fileUrls = [],
      systemPrompt = ''
    } = body

    if (!message || !userId || !projectId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const actualUserId = user?.id || userId

    // Ensure user exists in Zep
    const userMetadata = user?.user_metadata || {}
    await ensureZepUser(
      actualUserId,
      user?.email || undefined,
      userMetadata.full_name?.split(' ')[0] || userMetadata.first_name || undefined,
      userMetadata.full_name?.split(' ')[1] || userMetadata.last_name || undefined
    )

    let currentThreadId = threadId
    let threadTitle = 'New Chat'

    // Create thread if not exists
    if (!currentThreadId) {
      const firstWords = message.split(' ').slice(0, 6).join(' ')
      threadTitle = firstWords.length > 50 ? firstWords.substring(0, 50) + '...' : firstWords

      const { data: newThread, error: threadError } = await supabase
        .from('chat_threads')
        .insert({
          user_id: actualUserId,
          project_id: projectId,
          title: threadTitle,
          model: model || 'Claude Haiku 4.5',
        })
        .select()
        .single()

      if (threadError) {
        console.error('Thread creation error:', threadError)
        return NextResponse.json({
          success: false,
          error: 'Failed to create thread'
        }, { status: 500 })
      }

      currentThreadId = newThread.id
    }

    // Always ensure Zep thread exists
    try {
      console.log('🧵 Creating Zep thread:', currentThreadId, 'for user:', actualUserId)
      await createZepThread(currentThreadId, actualUserId)
      console.log('✅ Zep thread created')
    } catch (error: any) {
      if (error.statusCode === 409 || error.status === 409 ||
          error.statusCode === 400 || error.status === 400) {
        console.log('✅ Zep thread already exists:', currentThreadId)
      } else {
        console.error('❌ Zep thread creation failed:', error)
      }
    }

    // Fetch Zep memory context
    console.log('📥 Fetching Zep memory for thread:', currentThreadId)
    const zepMemory = await getZepMemory(currentThreadId)

    let zepContext = ''
    if (zepMemory) {
      console.log('🔍 Zep memory structure:', JSON.stringify(zepMemory, null, 2))

      // Extract context from Zep response
      if (zepMemory.context) {
        zepContext = zepMemory.context
        console.log(`✅ Retrieved context (${zepContext.length} chars)`)
      } else {
        console.log('⚠️ Available properties:', Object.keys(zepMemory))
      }
    }

    // Save user message
    await supabase.from('messages').insert({
      thread_id: currentThreadId,
      role: 'user',
      content: message,
    })

    // Handle file attachments
    const fileContext = fileUrls.length
      ? fileUrls.map((f: any) => `[Attached file: ${f.name}${f.type ? ` (${f.type})` : ''}]`).join('\n')
      : ''

    // Call N8N webhook
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL
    if (!n8nWebhookUrl) throw new Error('N8N webhook not configured')

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: fileContext ? `${message}\n\n${fileContext}` : message,
        userId: actualUserId,
        projectId,
        projectSlug: _projectSlug,
        model: getModelString(model || 'Claude Haiku 4.5'),
        threadId: currentThreadId,
        zepContext,
        systemPrompt: systemPrompt || 'You are a helpful AI assistant.',
        fileUrls
      })
    })

    const n8nData = await n8nResponse.json()
    const aiReply = n8nData?.[0]?.reply || n8nData?.reply || 'No response'
    const inputTokens = n8nData?.[0]?.usage?.input_tokens || 0
    const outputTokens = n8nData?.[0]?.usage?.output_tokens || 0
    const estimatedCost = calculateCost(getModelString(model || 'Claude Haiku 4.5'), inputTokens, outputTokens)

    // Save AI reply to Supabase
    await supabase.from('messages').insert({
      thread_id: currentThreadId,
      role: 'assistant',
      content: aiReply,
      model: model || 'Claude Haiku 4.5',
      tokens_used: inputTokens + outputTokens,
    })

    // Save to Zep memory
    console.log('💾 Saving to Zep memory...')
    const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'User'
    const savedToZep = await addZepMemory(currentThreadId, message, aiReply, userName)

    if (savedToZep) {
      console.log('✅ Saved to Zep memory')
    } else {
      console.log('⚠️ Failed to save to Zep memory')
    }

    // Store usage in Supabase
    await supabase.from('usage_logs').insert({
      user_id: actualUserId,
      thread_id: currentThreadId,
      model: model || 'Claude Haiku 4.5',
      tokens_input: inputTokens,
      tokens_output: outputTokens,
      estimated_cost: estimatedCost,
      created_at: new Date().toISOString()
    })

    // Update thread timestamp
    await supabase.from('chat_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', currentThreadId)

    return NextResponse.json({
      success: true,
      reply: aiReply,
      threadId: currentThreadId,
      usage: { inputTokens, outputTokens, estimatedCost }
    })

  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 })
  }
}