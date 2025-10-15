import {NextRequest, NextResponse} from "next/server";
import { createClient } from '@/lib/supabase/server'

// Token estimation (approximate)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4) // Rough estimate: 1 token ≈ 4 characters
}

// Cost estimation per model (per 1M tokens)
const MODEL_COSTS = {
  'Claude Sonnet 4': { input: 3.0, output: 15.0 },
  'GPT-4o': { input: 2.5, output: 10.0 },
  'Gemini Pro': { input: 0.5, output: 1.5 },
  'Deepseek': { input: 0.14, output: 0.28 },
  'xAI': { input: 5.0, output: 15.0 },
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS[model as keyof typeof MODEL_COSTS] || { input: 1.0, output: 3.0 }
  return ((inputTokens * costs.input) + (outputTokens * costs.output)) / 1_000_000
}

export async function POST(req: NextRequest) {
  try {
    const { message, userId, projectSlug, model, threadId, fileUrls } = await req.json()

    if (!message || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get authenticated user
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

    // Create thread if needed
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

      if (threadError || !newThread) {
        console.error('Error creating thread:', threadError)
        return NextResponse.json({ error: threadError?.message || 'Failed to create thread' }, { status: 500 })
      }

      currentThreadId = newThread.id
    }

    // Estimate input tokens
    const inputTokens = estimateTokens(message)

    // Save user message
    await supabase.from('messages').insert({
      thread_id: currentThreadId,
      role: 'user',
      content: message,
    })

    // Send to n8n or fallback
    let replyContent = 'AI response received'
    let outputTokens = 0
    
    if (process.env.N8N_WEBHOOK_URL) {
      try {
        const n8nResponse = await fetch(process.env.N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message, 
            userId: actualUserId, 
            projectSlug, 
            model: model || 'Claude Sonnet 4',
            fileUrls 
          }),
          signal: AbortSignal.timeout(30000)
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
        replyContent = `I received: "${message}". AI service temporarily unavailable.`
      }
    } else {
      replyContent = `Echo: ${message} (Configure N8N_WEBHOOK_URL)`
    }

    // Estimate output tokens
    outputTokens = estimateTokens(replyContent)

    // Calculate cost
    const estimatedCost = calculateCost(model || 'Claude Sonnet 4', inputTokens, outputTokens)

    // Save AI response
    await supabase.from('messages').insert({
      thread_id: currentThreadId,
      role: 'assistant',
      content: replyContent,
      model: model || 'claude-sonnet-4',
    })

    // Log usage - CRITICAL FIX
    // Log usage - safer insert
const { error: usageError } = await supabase
  .from('usage_logs')
  .insert([
    {
      user_id: actualUserId,
      thread_id: currentThreadId,
      model: model || 'Claude Sonnet 4',
      tokens_input: inputTokens,
      tokens_output: outputTokens,
      estimated_cost: estimatedCost,
    },
  ])
  .select()

if (usageError) {
  console.error('❌ Usage logging error:', usageError.message)
} else {
  console.log(`✅ Logged usage for ${actualUserId}:`, {
    model,
    inputTokens,
    outputTokens,
    estimatedCost,
  })
}

  } catch (error: any) {
    console.error('Chat API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}