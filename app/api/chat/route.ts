import { NextResponse } from "next/server"
import { createClient } from '@/lib/supabase/server'

// Calculate token cost based on model
function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'claude-sonnet-4.5-20250514': { input: 0.003, output: 0.015 },
    'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
    'gpt-5': { input: 0.005, output: 0.015 },
    'gpt-4o': { input: 0.0025, output: 0.01 },
    'gemini-pro': { input: 0.00125, output: 0.00375 },
    'deepseek-r1': { input: 0.00014, output: 0.00028 },
    'deepseek-chat': { input: 0.0001, output: 0.0002 },
    'grok-4': { input: 0.00002, output: 0.00002 },
    'grok-beta': { input: 0.00001, output: 0.00001 },
  }

  const rates = pricing[model] || { input: 0.003, output: 0.015 }
  return ((inputTokens / 1000) * rates.input) + ((outputTokens / 1000) * rates.output)
}

function getModelString(modelName: string): string {
  const modelMap: Record<string, string> = {
    'Claude Sonnet 4.5': 'claude-sonnet-4.5-20250514',
    'Claude Sonnet 4': 'claude-sonnet-4-20250514',
    'GPT-5': 'gpt-5',
    'GPT-4o': 'gpt-4o',
    'Gemini Pro': 'gemini-pro',
    'DeepSeek R1': 'deepseek-r1',
    'Deepseek': 'deepseek-chat',
    'Grok 4': 'grok-4',
    'xAI': 'grok-beta',
  }
  return modelMap[modelName] || 'claude-sonnet-4.5-20250514'
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

    // Get or create thread
    let currentThreadId = threadId
    let threadTitle = 'New Chat'

    if (!currentThreadId) {
      const firstWords = message.split(' ').slice(0, 6).join(' ')
      threadTitle = firstWords.length > 50 ? firstWords.substring(0, 50) + '...' : firstWords

      const { data: newThread, error: threadError } = await supabase
        .from('chat_threads')
        .insert({
          user_id: actualUserId,
          project_id: projectId,
          title: threadTitle,
          model: model || 'Claude Sonnet 4.5',
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

    // Handle file attachments
    if (fileUrls && fileUrls.length > 0) {
      const lastMessage = conversationMessages[conversationMessages.length - 1]
      if (lastMessage && lastMessage.role === 'user') {
        const fileContext = fileUrls.map((f: any) =>
          `[Attached file: ${f.name}${f.type ? ` (${f.type})` : ''}]`
        ).join('\n')
        lastMessage.content = `${lastMessage.content}\n\n${fileContext}`
      }
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

    console.log('📤 Calling N8N webhook:', n8nWebhookUrl)

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        userId: actualUserId,
        projectId,
        projectSlug: _projectSlug,
        model: getModelString(model || 'Claude Sonnet 4.5'),
        threadId: currentThreadId,
        conversationHistory: conversationMessages,
        systemPrompt: systemPrompt || 'You are a helpful AI assistant.',
        fileUrls
      })
    })

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text()
      console.error('❌ N8N webhook error:', errorText)
      throw new Error(`N8N webhook failed: ${n8nResponse.status}`)
    }

    const n8nData = await n8nResponse.json()
    console.log('✅ N8N response received:', n8nData)

    // Extract response from N8N - handle nested array format
    let aiReply = 'No response from N8N'

    if (Array.isArray(n8nData) && n8nData.length > 0) {
      // N8N returns array with single object
      const responseData = n8nData[0]

      if (typeof responseData.reply === 'string') {
        aiReply = responseData.reply
      } else if (Array.isArray(responseData.reply)) {
        const textBlock = responseData.reply.find((block: any) => block.type === 'text')
        aiReply = textBlock?.text || 'No text response'
      } else if (responseData.output) {
        aiReply = responseData.output
      }

      const inputTokens = responseData.usage?.tokens || 0
      const outputTokens = responseData.usage?.tokens || 0
      const estimatedCost = responseData.usage?.cost || calculateCost(
        getModelString(model || 'Claude Sonnet 4.5'),
        inputTokens,
        outputTokens
      )
    } else if (typeof n8nData.reply === 'string') {
      aiReply = n8nData.reply
    }

    // Extract tokens and cost from N8N response
    let inputTokens = 0
    let outputTokens = 0
    let estimatedCost = 0

    if (Array.isArray(n8nData) && n8nData.length > 0) {
      const responseData = n8nData[0]

      // Get usage data from N8N
      if (responseData.usage) {
        inputTokens = responseData.usage.input_tokens || responseData.usage.tokens || 0
        outputTokens = responseData.usage.output_tokens || responseData.usage.tokens || 0
        estimatedCost = responseData.usage.cost || 0
      }
    }

    // Fallback calculation if N8N doesn't provide usage
    if (estimatedCost === 0 && (inputTokens > 0 || outputTokens > 0)) {
      estimatedCost = calculateCost(
        getModelString(model || 'Claude Sonnet 4.5'),
        inputTokens,
        outputTokens
      )
    }

    console.log('📊 Token usage:', {
      model: model || 'Claude Sonnet 4.5',
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

    // Log usage with proper data types
    const { error: usageError } = await supabase
      .from('usage_logs')
      .insert({
        user_id: actualUserId,
        thread_id: currentThreadId,
        model: model || 'Claude Sonnet 4.5',
        tokens_input: parseInt(String(inputTokens)) || 0,
        tokens_output: parseInt(String(outputTokens)) || 0,
        estimated_cost: parseFloat(String(estimatedCost)) || 0,
      })

    if (usageError) {
      console.error('❌ Usage logging error:', usageError)
    } else {
      console.log('✅ Usage logged successfully:', {
        user_id: actualUserId,
        tokens_input: inputTokens,
        tokens_output: outputTokens,
        cost: estimatedCost
      })
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



