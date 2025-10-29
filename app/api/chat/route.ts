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
  return ((inputTokens / 1000000) * rates.input) + ((outputTokens / 1000000) * rates.output)
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
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
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
    let isNewThread = false

    if (!currentThreadId) {
      isNewThread = true
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

      // Create thread in Zep
      await createZepThread(currentThreadId, actualUserId)
    }

    // Get Zep memory
    console.log('📥 Fetching Zep memory for thread:', currentThreadId)
    const zepMemory = await getZepMemory(currentThreadId)

    let zepContext = ''
    if (zepMemory && zepMemory.context) {
      zepContext = zepMemory.context
      console.log(`✅ Retrieved context block (${zepContext.length} chars)`)
    }

    // Save user message to Supabase
    const { data: userMessage, error: userMessageError } = await supabase
      .from('messages')
      .insert({
        thread_id: currentThreadId,
        role: 'user',
        content: message,
      })
      .select()
      .single()

    if (userMessageError) {
      console.error('User message error:', userMessageError)
      return NextResponse.json({
        success: false,
        error: 'Failed to save user message'
      }, { status: 500 })
    }

    // Handle file attachments
    let fileContext = ''
    if (fileUrls && fileUrls.length > 0) {
      fileContext = fileUrls.map((f: any) =>
        `[Attached file: ${f.name}${f.type ? ` (${f.type})` : ''}]`
      ).join('\n')
    }

    // Call N8N webhook
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL

    if (!n8nWebhookUrl) {
      console.error('❌ N8N_WEBHOOK_URL not configured')
      return NextResponse.json({
        success: false,
        error: 'N8N webhook not configured'
      }, { status: 500 })
    }

    console.log('📤 Calling N8N webhook')

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: fileContext ? `${message}\n\n${fileContext}` : message,
        userId: actualUserId,
        projectId,
        projectSlug: _projectSlug,
        model: getModelString(model || 'Claude Haiku 4.5'),
        threadId: currentThreadId,
        zepContext: zepContext,
        systemPrompt: systemPrompt || 'You are a helpful AI assistant.',
        fileUrls
      })
    })

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text()
      console.error('❌ N8N webhook error:', errorText)
      throw new Error(`N8N webhook failed: ${n8nResponse.status}`)
    }

    let n8nData
    try {
      const text = await n8nResponse.text()

      if (!text || text.trim() === '') {
        throw new Error('Empty response from N8N')
      }

      n8nData = JSON.parse(text)
    } catch (parseError) {
      console.error('❌ Failed to parse N8N response:', parseError)
      throw new Error('N8N returned invalid response')
    }

    // Extract response
    let aiReply = 'No response from N8N'

    if (Array.isArray(n8nData) && n8nData.length > 0) {
      const responseData = n8nData[0]

      if (typeof responseData.reply === 'string') {
        aiReply = responseData.reply
      } else if (Array.isArray(responseData.reply)) {
        const textBlock = responseData.reply.find((block: any) => block.type === 'text')
        aiReply = textBlock?.text || 'No text response'
      } else if (responseData.output) {
        aiReply = responseData.output
      }
    } else if (typeof n8nData.reply === 'string') {
      aiReply = n8nData.reply
    }

    // Extract tokens
    let inputTokens = 0
    let outputTokens = 0

    if (Array.isArray(n8nData) && n8nData.length > 0) {
      const responseData = n8nData[0]
      if (responseData.usage) {
        inputTokens = responseData.usage.input_tokens || responseData.usage.tokens || 0
        outputTokens = responseData.usage.output_tokens || responseData.usage.tokens || 0
      }
    }

    const estimatedCost = calculateCost(
      getModelString(model || 'Claude Haiku 4.5'),
      inputTokens,
      outputTokens
    )

    console.log('📊 Token usage:', {
      model: model || 'Claude Haiku 4.5',
      inputTokens,
      outputTokens,
      cost: estimatedCost
    })

    // Save to Zep memory
    console.log('💾 Saving to Zep memory...')
    const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'User'
    await addZepMemory(
      currentThreadId,
      message,
      aiReply,
      userName
    )
    console.log('✅ Saved to Zep memory')

    // Save assistant message to Supabase
    const { data: assistantMessage, error: assistantMessageError } = await supabase
      .from('messages')
      .insert({
        thread_id: currentThreadId,
        role: 'assistant',
        content: aiReply,
        model: model || 'Claude Haiku 4.5',
        tokens_used: inputTokens + outputTokens,
      })
      .select()
      .single()

    if (assistantMessageError) {
      console.error('Assistant message error:', assistantMessageError)
    }

    // Log usage
    const { error: usageError } = await supabase
      .from('usage_logs')
      .insert({
        user_id: actualUserId,
        thread_id: currentThreadId,
        model: model || 'Claude Haiku 4.5',
        tokens_input: parseInt(String(inputTokens)) || 0,
        tokens_output: parseInt(String(outputTokens)) || 0,
        estimated_cost: parseFloat(String(estimatedCost)) || 0,
      })

    if (usageError) {
      console.error('❌ Usage logging error:', usageError)
    }

    // Update thread timestamp
    await supabase
      .from('chat_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', currentThreadId)

    return NextResponse.json({
      success: true,
      reply: aiReply,
      threadId: currentThreadId,
      userMessageId: userMessage.id,
      assistantMessageId: assistantMessage?.id,
      usage: {
        inputTokens,
        outputTokens,
        estimatedCost: estimatedCost.toFixed(6)
      }
    })

  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}