// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const priceMap: Record<string, { input: number; output: number }> = {
    'Claude Sonnet 4.5': { input: 3.00, output: 15.00 },
    'Claude Haiku 4.5': { input: 0.80, output: 4.00 },
    'Claude Opus 4.1': { input: 15.00, output: 75.00 },
  }

  const costs = priceMap[model] || priceMap['Claude Haiku 4.5']

  // Cost per 1M tokens
  const inputCost = (inputTokens / 1_000_000) * costs.input
  const outputCost = (outputTokens / 1_000_000) * costs.output

  return inputCost + outputCost
}

function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      message,
      userId,
      projectId,
      projectSlug,
      model,
      threadId,
      fileUrls = [],
      systemPrompt = '',
    } = body

    console.log('📨 Chat request:', { userId, projectSlug, model, hasThread: !!threadId })

    // ========================================
    // 1. CHECK USER CREDITS
    // ========================================
    const { data: user } = await supabase
      .from('users')
      .select('credits, subscription_tier')
      .eq('id', userId)
      .single()

    if (!user || Number(user.credits) <= 0) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please top up or upgrade your plan.' },
        { status: 402 }
      )
    }

    // ========================================
    // 2. HANDLE THREAD CREATION/RETRIEVAL
    // ========================================
    let currentThreadId = threadId

    if (!currentThreadId) {
      // Create new thread
      const { data: newThread, error: threadError } = await supabase
        .from('chat_threads')
        .insert({
          user_id: userId,
          project_id: projectId,
          title: message.substring(0, 50),
          model: model,
        })
        .select()
        .single()

      if (threadError || !newThread) {
        console.error('Thread creation failed:', threadError)
        return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 })
      }

      currentThreadId = newThread.id
      console.log('✅ New thread created:', currentThreadId)
    }

    // ========================================
    // 3. FETCH CONVERSATION HISTORY (Last 20 messages)
    // ========================================
    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('thread_id', currentThreadId)
      .order('created_at', { ascending: true })
      .limit(20)

    const conversationHistory = history?.map((m) => ({
      role: m.role,
      content: m.content,
    })) || []

    console.log(`📚 Loaded ${conversationHistory.length} previous messages`)

    // ========================================
    // 4. SAVE USER MESSAGE
    // ========================================
    const { data: userMessage, error: userMsgError } = await supabase
      .from('messages')
      .insert({
        thread_id: currentThreadId,
        role: 'user',
        content: message,
        model: model,
      })
      .select()
      .single()

    if (userMsgError || !userMessage) {
      console.error('Failed to save user message:', userMsgError)
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
    }

    // ========================================
    // 5. CALL N8N WEBHOOK
    // ========================================
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'https://n8n.leveragedcreator.ai/webhook/cb4-chat'

    const n8nPayload = {
      message: message,
      userId: userId,
      projectId: projectId,
      projectSlug: projectSlug,
      model: model,
      threadId: currentThreadId,
      fileUrls: fileUrls,
      systemPrompt: systemPrompt,
      conversationHistory: conversationHistory, // ✅ Pass history for context
    }

    console.log('🔄 Calling N8N webhook...')

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(n8nPayload),
    })

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text()
      console.error('N8N webhook failed:', errorText)
      return NextResponse.json({ error: 'AI processing failed' }, { status: 500 })
    }

    const n8nResult = await n8nResponse.json()
    const aiReply = n8nResult.reply || n8nResult.output || 'No response'

    console.log('✅ AI response received')

    // ========================================
    // 6. ESTIMATE TOKEN USAGE & CALCULATE COST
    // ========================================
    const inputTokens = estimateTokens(
      systemPrompt +
      conversationHistory.map((m) => m.content).join('\n') +
      message
    )
    const outputTokens = estimateTokens(aiReply)
    const totalTokens = inputTokens + outputTokens
    const cost = calculateCost(model, inputTokens, outputTokens)

    console.log(`💰 Tokens: ${inputTokens} in, ${outputTokens} out | Cost: $${cost.toFixed(6)}`)

    // ========================================
    // 7. DEDUCT CREDITS
    // ========================================
    const newCredits = Number(user.credits) - cost

    const { error: creditError } = await supabase
      .from('users')
      .update({
        credits: newCredits,
        last_credit_update: new Date().toISOString()
      })
      .eq('id', userId)

    if (creditError) {
      console.error('Failed to deduct credits:', creditError)
    }

    // ========================================
    // 8. LOG USAGE
    // ========================================
    await supabase.from('usage_logs').insert({
      user_id: userId,
      model: model,
      tokens_input: inputTokens,
      tokens_output: outputTokens,
      estimated_cost: cost,
      project_id: projectId,
    })

    // ========================================
    // 9. SAVE AI MESSAGE
    // ========================================
    const { data: assistantMessage } = await supabase
      .from('messages')
      .insert({
        thread_id: currentThreadId,
        role: 'assistant',
        content: aiReply,
        model: model,
        tokens_used: totalTokens,
      })
      .select()
      .single()

    // ========================================
    // 10. RETURN RESPONSE
    // ========================================
    return NextResponse.json({
      success: true,
      reply: aiReply,
      threadId: currentThreadId,
      userMessageId: userMessage.id,
      assistantMessageId: assistantMessage?.id,
      tokensUsed: totalTokens,
      cost: cost,
      remainingCredits: newCredits,
    })

  } catch (error: any) {
    console.error('❌ Chat API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}