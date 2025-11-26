// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MARKUP_MULTIPLIER = 3

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

  return (inputCost + outputCost) * MARKUP_MULTIPLIER // ✅ Apply 3x markup
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// ✅ Export config to disable body size limit and extend timeout
export const maxDuration = 300 // 5 minutes (Vercel Pro)
export const dynamic = 'force-dynamic'

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

    // Check credits
    const { data: user } = await supabase
      .from('users')
      .select('credits, subscription_tier')
      .eq('id', userId)
      .single()

    if (!user || Number(user.credits) < 0.001) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please top up or upgrade your plan.' },
        { status: 402 }
      )
    }

    let currentThreadId = threadId

    // Create thread if needed
    if (!currentThreadId) {
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

    // ✅ Load FULL conversation history (not just last 20)
    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('thread_id', currentThreadId)
      .order('created_at', { ascending: true })

    const conversationHistory = history?.map((m) => ({
      role: m.role,
      content: m.content,
    })) || []

    console.log(`📚 Loaded ${conversationHistory.length} previous messages`)

    // Save user message
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

    // ✅ Call N8N with extended timeout (5 minutes)
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
      conversationHistory: conversationHistory,
    }

    console.log('🔄 Calling N8N webhook...')

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(n8nPayload),
      signal: AbortSignal.timeout(300000) // ✅ 5 minute timeout
    })

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text()
      console.error('N8N webhook failed:', errorText)
      return NextResponse.json({ error: 'AI processing failed' }, { status: 500 })
    }

    const n8nResult = await n8nResponse.json()
    const aiReply = n8nResult.reply || n8nResult.output || 'No response'

    console.log('✅ AI response received')

    // Calculate tokens and cost
    const inputTokens = estimateTokens(
      systemPrompt +
      conversationHistory.map((m) => m.content).join('\n') +
      message
    )
    const outputTokens = estimateTokens(aiReply)
    const totalTokens = inputTokens + outputTokens
    const cost = calculateCost(model, inputTokens, outputTokens) // ✅ Already includes 3x markup

    console.log(`💰 Tokens: ${inputTokens} in, ${outputTokens} out | User Cost (3x): $${cost.toFixed(6)}`)

    // Deduct credits
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

    // ✅ Log usage with proper error handling
    const { error: usageError } = await supabase.from('usage_logs').insert({
      user_id: userId,
      model: model,
      tokens_input: inputTokens,
      tokens_output: outputTokens,
      estimated_cost: cost,
    })

    if (usageError) {
      console.error('❌ Failed to log usage:', usageError)
    }

    // Save assistant message
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