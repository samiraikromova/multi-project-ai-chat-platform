"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export default function CB4Chat({ userId }: { userId: string }) {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // Load messages on mount
  useEffect(() => {
    loadMessages()
  }, [])

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', userId)
      .order('created_at', { ascending: true })

    if (data) {
      setMessages(data)
    }
  }

  const sendMessage = async () => {
    if (!message.trim()) return

    setLoading(true)

    // Optimistically add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMessage])
    setMessage("")

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          userId,
          projectSlug: 'cb4'
        }),
      })

      const data = await res.json()

      if (data.success) {
        // Add AI response
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
          created_at: new Date().toISOString()
        }
        setMessages(prev => [...prev, aiMessage])
      } else {
        console.error('Error:', data.error)
      }
    } catch (error) {
      console.error('Send message error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#f7f5ef]">
      {/* Header */}
      <div className="border-b border-[#e0ddd4] p-4 bg-[#f7f5ef]">
        <h2 className="text-xl font-semibold text-[#2d2d2d]">CB4 - Cam's Brain v4</h2>
        <p className="text-sm text-[#6b6b6b]">Vector search enabled</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-[#d97757] rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl">
                🧠
              </div>
              <h3 className="text-2xl font-light text-[#2d2d2d] mb-2">
                Welcome to CB4
              </h3>
              <p className="text-[#6b6b6b]">Ask me anything...</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    msg.role === 'user'
                      ? 'bg-[#d97757] text-white'
                      : 'bg-white border border-[#e0ddd4] text-[#2d2d2d]'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-[#e0ddd4] rounded-lg p-4">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-[#d97757] rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-[#d97757] rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-[#d97757] rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-[#e0ddd4] p-6 bg-[#f7f5ef]">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white border-2 border-[#e0ddd4] rounded-2xl p-3 flex items-center gap-3 shadow-sm">
            <button className="text-[#6b6b6b] hover:bg-gray-100 p-2 rounded-full">
              +
            </button>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              className="flex-1 outline-none text-[#2d2d2d] text-base bg-transparent"
              placeholder="Ask CB4 anything..."
            />
            <select className="text-sm text-[#6b6b6b] bg-transparent border-none outline-none">
              <option>Claude Sonnet 4</option>
              <option>GPT-4o</option>
              <option>Gemini Pro</option>
            </select>
            <button
              onClick={sendMessage}
              disabled={loading || !message.trim()}
              className="bg-[#d97757] hover:bg-[#c86545] disabled:bg-gray-300 text-white p-2 rounded-full transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 3.5a.75.75 0 0 1 .53.22l4 4a.75.75 0 0 1-1.06 1.06L10.75 6.06V12.25a.75.75 0 0 1-1.5 0V6.06L6.53 8.78a.75.75 0 0 1-1.06-1.06l4-4A.75.75 0 0 1 10 3.5z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}