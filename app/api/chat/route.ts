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

// Calculate tokens from conversation history
function calculateHistoryTokens(messages: any[]): number {
  return messages.reduce((total, msg) => {
    return total + Math.ceil(msg.content.length / 4) // 4 chars ≈ 1 token
  }, 0)
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
        return NextResponse.json({ success: false, error: 'Failed to create thread' }, { status: 500 })
      }

      currentThreadId = newThread.id
    }

    // Ensure Zep thread exists
    try {
      await createZepThread(currentThreadId, actualUserId)
    } catch (error: any) {
      if (error.statusCode === 400 || error.statusCode === 409) {
        console.log('✅ Zep thread already exists')
      }
    }

    // Fetch Zep memory context
    const zepMemory = await getZepMemory(currentThreadId)
    let zepContext = ''
    if (zepMemory?.context) {
      zepContext = zepMemory.context
      console.log(`✅ Retrieved Zep context (${zepContext.length} chars)`)
    }

    // Get conversation history for token calculation
    const { data: historyMessages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('thread_id', currentThreadId)
      .order('created_at', { ascending: true })
      .limit(50)

    const conversationHistory = historyMessages || []
    const historyTokens = calculateHistoryTokens(conversationHistory)

    console.log(`📊 Context tokens from history: ${historyTokens}`)

    // Save user message
    await supabase.from('messages').insert({
      thread_id: currentThreadId,
      role: 'user',
      content: message,
    })

    // ✅ BUILD VISION CONTENT FOR N8N
    const imageFiles = fileUrls.filter((f: any) => f.type?.startsWith('image/'))
    const hasImages = imageFiles.length > 0

    // Build Claude vision format
    let messageContent: any = message
    if (hasImages) {
      console.log(`🖼️ Processing ${imageFiles.length} images for vision`)
      messageContent = [
        { type: "text", text: message },
        ...imageFiles.map((img: any) => ({
          type: "image",
          source: {
            type: "url",
            url: img.url
          }
        }))
      ]
    }

    // Call N8N webhook with vision support
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL
    if (!n8nWebhookUrl) throw new Error('N8N webhook not configured')

    console.log('📤 Calling N8N webhook with vision support:', hasImages)

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        messageContent: messageContent, // ✅ Vision content
        hasImages: hasImages, // ✅ Flag for n8n
        userId: actualUserId,
        projectId,
        projectSlug: _projectSlug,
        model: getModelString(model || 'Claude Haiku 4.5'),
        threadId: currentThreadId,
        zepContext,
        systemPrompt: systemPrompt || 'You are a helpful AI assistant.',
        fileUrls,
        conversationHistory: conversationHistory // ✅ For context
      })
    })

    const n8nData = await n8nResponse.json()

    console.log('🔍 N8N Response:', JSON.stringify(n8nData, null, 2))

    // Handle both array and object responses from n8n
    let responseData = n8nData
    if (Array.isArray(n8nData) && n8nData.length > 0) {
      responseData = n8nData[0]
    }

    const aiReply = responseData?.reply || responseData?.output || 'No response'

    // Get actual token usage from n8n response (try multiple paths)
    const newInputTokens = responseData?.usage?.input_tokens ||
                           responseData?.usage?.inputTokens ||
                           responseData?.usage?.tokens ||
                           responseData?.tokens ||
                           0
    const outputTokens = responseData?.usage?.output_tokens ||
                         responseData?.usage?.outputTokens ||
                         responseData?.usage?.tokens ||
                         responseData?.tokens ||
                         0

    console.log('🔍 Token extraction:', {
      responseData_usage: responseData?.usage,
      newInputTokens,
      outputTokens
    })

    // If no tokens from n8n, estimate from text length
    const fallbackInputTokens = newInputTokens || Math.ceil((message.length + (zepContext?.length || 0)) / 4)
    const fallbackOutputTokens = outputTokens || Math.ceil(aiReply.length / 4)

    const totalInputTokens = (newInputTokens || fallbackInputTokens) + historyTokens

    const estimatedCost = calculateCost(
      getModelString(model || 'Claude Haiku 4.5'),
      totalInputTokens,
      fallbackOutputTokens
    )

    console.log('📊 Final token usage:', {
      model: model || 'Claude Haiku 4.5',
      historyTokens,
      newInputTokens: newInputTokens || fallbackInputTokens,
      totalInputTokens,
      outputTokens: fallbackOutputTokens,
      cost: estimatedCost.toFixed(6),
      usingFallback: !newInputTokens || !outputTokens
    })

    // Save AI reply
    await supabase.from('messages').insert({
      thread_id: currentThreadId,
      role: 'assistant',
      content: aiReply,
      model: model || 'Claude Haiku 4.5',
      tokens_used: totalInputTokens + fallbackOutputTokens,
    })

    // Save to Zep
    console.log('💾 Saving to Zep memory...')
    const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'User'
    await addZepMemory(currentThreadId, message, aiReply, userName)
    console.log('✅ Saved to Zep memory')

    // Store usage with TOTAL input tokens (including history)
    const { error: usageError } = await supabase
      .from('usage_logs')
      .insert({
        user_id: actualUserId,
        thread_id: currentThreadId,
        model: model || 'Claude Haiku 4.5',
        tokens_input: totalInputTokens,
        tokens_output: fallbackOutputTokens,
        estimated_cost: estimatedCost,
      })

    if (usageError) {
      console.error('❌ Usage logging error:', usageError)
    } else {
      console.log('✅ Usage logged:', { totalInputTokens, outputTokens: fallbackOutputTokens, estimatedCost })
    }

    // Update thread timestamp
    await supabase.from('chat_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', currentThreadId)

    // ✅ MUST RETURN RESPONSE
    return NextResponse.json({
      success: true,
      reply: aiReply,
      threadId: currentThreadId,
      usage: {
        inputTokens: totalInputTokens,
        outputTokens: fallbackOutputTokens,
        estimatedCost,
        historyTokens
      }
    })

  } catch (error: any) {
    console.error('❌ Chat API error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal error'
    }, { status: 500 })
  }
}