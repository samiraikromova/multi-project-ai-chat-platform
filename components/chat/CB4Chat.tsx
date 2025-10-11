"use client"
import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface CB4ChatProps {
  userId: string
  projectName: string
  projectSlug: string
}

export default function CB4Chat({ userId, projectName, projectSlug }: CB4ChatProps) {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('Claude Sonnet 4')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const supabase = createClient()

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', userId)
      .order('created_at', { ascending: true })

    if (data) {
      setMessages(data)
    }
  }, [supabase, userId])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  const sendMessage = async () => {
    if (!message.trim()) return

    setLoading(true)
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMessage])
    const msgToSend = message
    setMessage("")

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msgToSend,
          userId,
          projectSlug,
          model: selectedModel
        }),
      })

      const data = await res.json()

      if (data.success) {
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
    <div className="flex h-screen bg-[#f7f5ef]">
      {/* Sidebar */}
      <aside
        className={`bg-[#eeebe3] border-r border-[#e0ddd4] transition-all duration-300 flex flex-col ${
          sidebarOpen ? 'w-64' : 'w-0'
        } overflow-hidden`}
      >
        <div className="p-4 border-b border-[#e0ddd4]">
          <button className="w-full bg-[#d97757] hover:bg-[#c86545] text-white rounded-lg px-4 py-2.5 text-[14px] font-medium transition-colors flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-4">
            <button className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-[#2d2d2d] hover:bg-[#e0ddd4] rounded-lg transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3 8l5-5 5 5M8 3v10"/>
              </svg>
              All Projects
            </button>
          </div>

          <div className="text-[11px] text-[#8b8b8b] font-medium uppercase tracking-wider px-3 mb-2">
            History
          </div>
          <div className="space-y-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="group px-3 py-2 rounded-lg hover:bg-[#e0ddd4] cursor-pointer flex items-center justify-between transition-colors"
              >
                <span className="text-[14px] text-[#2d2d2d] truncate">Previous chat {i}</span>
                <button className="opacity-0 group-hover:opacity-100 text-[#6b6b6b] hover:text-[#2d2d2d]">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="8" cy="4" r="1.5"/>
                    <circle cx="8" cy="8" r="1.5"/>
                    <circle cx="8" cy="12" r="1.5"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-[#e0ddd4]">
          <div className="flex items-center gap-3 px-3 py-2 hover:bg-[#e0ddd4] rounded-lg cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-[#d97757] flex items-center justify-center text-white text-[14px] font-medium">
              C
            </div>
            <span className="text-[14px] text-[#2d2d2d] font-medium">Cameron</span>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        <header className="bg-[#f7f5ef] border-b border-[#e0ddd4] px-6 py-3 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-[#e0ddd4] rounded-lg transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="4" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="8" y1="4" x2="8" y2="16" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>
          <h2 className="text-[15px] font-medium text-[#2d2d2d]">{projectName}</h2>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[800px] mx-auto px-6 py-8">
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-[#d97757] rounded-2xl mx-auto mb-6 flex items-center justify-center text-3xl">
                  🧠
                </div>
                <h3 className="text-[24px] font-normal text-[#2d2d2d] mb-2">
                  Welcome to {projectName}
                </h3>
                <p className="text-[15px] text-[#6b6b6b]">Ask me anything...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-[#d97757] text-white'
                          : 'bg-white border border-[#e0ddd4] text-[#2d2d2d]'
                      }`}
                    >
                      <p className="text-[15px] leading-[1.6] whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-[#e0ddd4] rounded-2xl px-4 py-3">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-[#d97757] rounded-full animate-bounce"/>
                        <div className="w-2 h-2 bg-[#d97757] rounded-full animate-bounce delay-100"/>
                        <div className="w-2 h-2 bg-[#d97757] rounded-full animate-bounce delay-200"/>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-[#e0ddd4] bg-[#f7f5ef] p-6">
          <div className="max-w-[800px] mx-auto">
            <div className="bg-white border-2 border-[#e0ddd4] rounded-2xl shadow-sm focus-within:border-[#d97757] transition-colors">
              <div className="flex items-center gap-2 px-4 py-3">
                <button className="p-2 text-[#6b6b6b] hover:bg-[#f5f5f5] rounded-lg transition-colors">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 5v10M5 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  className="flex-1 outline-none text-[15px] text-[#2d2d2d] bg-transparent placeholder:text-[#999]"
                  placeholder={`Message ${projectName}...`}
                />
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="text-[13px] text-[#6b6b6b] bg-transparent border-none outline-none cursor-pointer"
                >
                  <option>Claude Sonnet 4</option>
                  <option>GPT-4o</option>
                  <option>Gemini Pro</option>
                  <option>Deepseek</option>
                  <option>xAI</option>
                </select>
                <button
                  onClick={sendMessage}
                  disabled={loading || !message.trim()}
                  className="p-2 bg-[#d97757] hover:bg-[#c86545] disabled:bg-[#ccc] text-white rounded-lg transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                    <path d="M9 3l6 6-6 6V3z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}