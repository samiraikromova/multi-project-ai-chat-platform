import { NextRequest, NextResponse } from "next/server"
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Calculate token cost based on model
function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
    'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
    'claude-opus-4-20250514': { input: 0.015, output: 0.075 },
    'gpt-4o': { input: 0.0025, output: 0.01 },
    'gemini-pro': { input: 0.00125, output: 0.00375 },
    'deepseek-chat': { input: 0.0001, output: 0.0002 },
    'grok-beta': { input: 0.00001, output: 0.00001 },
  }

  const rates = pricing[model] || { input: 0.003, output: 0.015 }
  return ((inputTokens / 1000) * rates.input) + ((outputTokens / 1000) * rates.output)
}

function getModelString(modelName: string): string {
  const modelMap: Record<string, string> = {
    'Claude Sonnet 4': 'claude-sonnet-4-20250514',
    'Claude Sonnet 3.5': 'claude-3-5-sonnet-20241022',
    'Claude Opus 4': 'claude-opus-4-20250514',
    'GPT-4o': 'gpt-4o',
    'Gemini Pro': 'gemini-pro',
    'Deepseek': 'deepseek-chat',
    'xAI': 'grok-beta',
  }
  return modelMap[modelName] || 'claude-sonnet-4-20250514'
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      message,
      userId,
      projectId,
      projectSlug,
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

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    const actualUserId = user?.id || userId

    // Get or create thread
    let currentThreadId = threadId
    let threadTitle = 'New Chat'

    if (!currentThreadId) {
      // Create new thread
      const firstWords = message.split(' ').slice(0, 6).join(' ')
      threadTitle = firstWords.length > 50 ? firstWords.substring(0, 50) + '...' : firstWords

      const { data: newThread, error: threadError } = await supabase
        .from('chat_threads')
        .insert({
          user_id: actualUserId,
          project_id: projectId,
          title: threadTitle,
          model: model || 'Claude Sonnet 4',
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

    // Save user message
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

    // Get conversation history
    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('thread_id', currentThreadId)
      .order('created_at', { ascending: true })
      .limit(20)

    // Build messages for Claude
    const conversationMessages: any[] = []

    if (history) {
      history.forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          conversationMessages.push({
            role: msg.role,
            content: msg.content
          })
        }
      })
    }

    // Handle file attachments if any
    if (fileUrls && fileUrls.length > 0) {
      const lastMessage = conversationMessages[conversationMessages.length - 1]
      if (lastMessage && lastMessage.role === 'user') {
        const fileContext = fileUrls.map((f: any) =>
          `[Attached file: ${f.name}${f.type ? ` (${f.type})` : ''}]`
        ).join('\n')
        lastMessage.content = `${lastMessage.content}\n\n${fileContext}`
      }
    }

    // Call Claude API
    const modelString = getModelString(model || 'Claude Sonnet 4')
    const claudeResponse = await anthropic.messages.create({
      model: modelString,
      max_tokens: 4096,
      system: systemPrompt || 'You are a helpful AI assistant.',
      messages: conversationMessages,
    })

    const aiReply = claudeResponse.content[0].type === 'text'
      ? claudeResponse.content[0].text
      : 'No response'

    // Extract token usage
    const inputTokens = claudeResponse.usage.input_tokens || 0
    const outputTokens = claudeResponse.usage.output_tokens || 0
    const estimatedCost = calculateCost(modelString, inputTokens, outputTokens)

    console.log('📊 Token usage:', {
      model: modelString,
      inputTokens,
      outputTokens,
      cost: estimatedCost
    })

    // Save assistant message
    const { data: assistantMessage, error: assistantMessageError } = await supabase
      .from('messages')
      .insert({
        thread_id: currentThreadId,
        role: 'assistant',
        content: aiReply,
      })
      .select()
      .single()

    if (assistantMessageError) {
      console.error('Assistant message error:', assistantMessageError)
    }

    // Log usage to database
    const { error: usageError } = await supabase
      .from('usage_logs')
      .insert({
        user_id: actualUserId,
        thread_id: currentThreadId,
        model: model || 'Claude Sonnet 4',
        tokens_input: inputTokens,
        tokens_output: outputTokens,
        estimated_cost: estimatedCost,
      })

    if (usageError) {
      console.error('❌ Usage logging error:', usageError)
    } else {
      console.log('✅ Usage logged successfully for user:', actualUserId)
    }

    // Update thread's updated_at timestamp
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