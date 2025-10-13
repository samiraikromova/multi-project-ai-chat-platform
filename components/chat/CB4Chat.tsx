"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface ChatThread {
  id: string
  title: string
  created_at: string
}

interface AttachedFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  file: File
}

interface CB4ChatProps {
  userId: string
  projectName?: string
  projectSlug?: string
}

export default function CB4Chat({
  userId,
  projectName = "CB4",
  projectSlug = "cb4",
}: CB4ChatProps) {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)
  const [currentThreadTitle, setCurrentThreadTitle] = useState("New Chat")
  const [loading, setLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('Claude Sonnet 4')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [deleteMenuOpen, setDeleteMenuOpen] = useState<string | null>(null)
  const [fileMenuOpen, setFileMenuOpen] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const supabase = createClient()
  const router = useRouter()
  const modelDropdownRef = useRef<HTMLDivElement>(null)
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const deleteMenuRef = useRef<HTMLDivElement>(null)
  const fileMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setModelDropdownOpen(false)
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false)
      }
      if (deleteMenuRef.current && !deleteMenuRef.current.contains(event.target as Node)) {
        setDeleteMenuOpen(null)
      }
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) {
        setFileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget === e.target) setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      handleFiles(files)
    }
    setFileMenuOpen(false)
  }

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/') ||
        file.type === 'application/pdf' ||
        file.type === 'text/plain'
      const isValidSize = file.size <= 5 * 1024 * 1024 // 5MB

      if (!isValidType) {
        alert(`${file.name}: Only images, PDFs, and text files are allowed`)
        return false
      }
      if (!isValidSize) {
        alert(`${file.name}: File size must be less than 5MB`)
        return false
      }
      return true
    })

    const newFiles: AttachedFile[] = validFiles.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      file
    }))

    setAttachedFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (fileId: string) => {
    setAttachedFiles(prev => {
      const file = prev.find(f => f.id === fileId)
      if (file) URL.revokeObjectURL(file.url)
      return prev.filter(f => f.id !== fileId)
    })
  }

  const loadThreads = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const actualUserId = user?.id || userId

    const { data: projects } = await supabase.from('projects').select('id').eq('slug', projectSlug).single()
    if (!projects) return

    const { data } = await supabase
      .from('chat_threads')
      .select('*')
      .eq('user_id', actualUserId)
      .eq('project_id', projects.id)
      .order('created_at', { ascending: false })

    if (data) setThreads(data)
  }, [supabase, userId, projectSlug])

  const loadMessages = useCallback(async () => {
    if (!currentThreadId) return
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', currentThreadId)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)

    const thread = threads.find(t => t.id === currentThreadId)
    if (thread) setCurrentThreadTitle(thread.title)
  }, [supabase, currentThreadId, threads])

  useEffect(() => { loadThreads() }, [loadThreads])
  useEffect(() => { loadMessages() }, [loadMessages])

  const createNewThread = async () => {
    setCurrentThreadId(null)
    setMessages([])
    setCurrentThreadTitle("New Chat")
    setAttachedFiles([])
  }

  const deleteThread = async (threadId: string) => {
    await supabase.from('chat_threads').delete().eq('id', threadId)
    if (currentThreadId === threadId) createNewThread()
    loadThreads()
    setDeleteMenuOpen(null)
  }

  const uploadFiles = async () => {
    const uploadedUrls: string[] = []
    for (const attachedFile of attachedFiles) {
      const filePath = `${userId}/${Date.now()}-${attachedFile.name}`
      const { error } = await supabase.storage.from('chat-files').upload(filePath, attachedFile.file)
      if (!error) {
        const { data } = supabase.storage.from('chat-files').getPublicUrl(filePath)
        uploadedUrls.push(data.publicUrl)
      } else {
        console.error('Upload error:', error)
      }
    }
    return uploadedUrls
  }

  const sendMessage = async () => {
    if (!message.trim() && attachedFiles.length === 0) return
    setLoading(true)

    let fileUrls: string[] = []
    if (attachedFiles.length > 0) fileUrls = await uploadFiles()

    const contentWithFiles = message + (fileUrls.length > 0 ? `\n\nAttached files: ${fileUrls.join(', ')}` : '')

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: contentWithFiles,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMessage])
    const msgToSend = message
    setMessage("")
    setAttachedFiles([])

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msgToSend,
          userId,
          projectSlug,
          model: selectedModel,
          threadId: currentThreadId,
          fileUrls
        }),
      })

      // handle non-json / empty body
      const text = await res.text()
      let data: any = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        console.error('Non-JSON response from /api/chat:', text)
        alert('Unexpected response from server')
      }

      if (data.success) {
        if (data.threadId && !currentThreadId) {
          setCurrentThreadId(data.threadId)
          setCurrentThreadTitle(msgToSend.slice(0, 50) || "New chat")
        }

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply || 'No response',
          created_at: new Date().toISOString()
        }
        setMessages(prev => [...prev, aiMessage])
        loadThreads()
      } else {
        alert('Error: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Send message error:', error)
      alert('Failed to send message')
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const models = [
    { name: 'Claude Sonnet 4', provider: 'Anthropic' },
    { name: 'GPT-4o', provider: 'OpenAI' },
    { name: 'Gemini Pro', provider: 'Google' },
    { name: 'Deepseek', provider: 'Deepseek' },
    { name: 'xAI', provider: 'xAI' },
  ]

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div
      className="flex h-screen bg-[#f7f5ef] relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-[#f7f5ef]/95 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 border-4 border-dashed border-[#d97757] rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="#d97757">
                <path d="M24 8v24M12 20l12-12 12 12" />
              </svg>
            </div>
            <p className="text-[20px] font-medium text-[#2d2d2d]">Drop files here to add to chat</p>
            <p className="text-[14px] text-[#6b6b6b] mt-2">Images, PDFs, and text files only (max 5MB)</p>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Sidebar */}
      <aside className={`bg-[#eeebe3] border-r border-[#e0ddd4] transition-all duration-300 flex flex-col ${sidebarOpen ? 'w-64' : 'w-16'}`}>
        <div className="p-4 border-b border-[#e0ddd4]">
          {sidebarOpen ? (
            <button onClick={createNewThread} className="w-full bg-[#d97757] hover:bg-[#c86545] text-white rounded-lg px-4 py-2.5 text-[14px] font-medium transition-colors flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              New chat
            </button>
          ) : (
            <button onClick={createNewThread} className="w-8 h-8 bg-[#d97757] hover:bg-[#c86545] text-white rounded-full flex items-center justify-center mx-auto transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          )}
        </div>

        {sidebarOpen ? (
          <>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="mb-4">
                <button onClick={() => router.push('/dashboard')} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-[#2d2d2d] hover:bg-[#e0ddd4] rounded-lg transition-colors border border-[#d4d1c8]">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13 8L8 3 3 8h3v5h4V8h3z"/></svg>
                  All Projects
                </button>
              </div>

              <div className="text-[11px] text-[#8b8b8b] font-medium uppercase tracking-wider px-3 mb-2">Recent</div>
              <div className="space-y-1">
                {threads.map((thread) => (
                  <div key={thread.id} className={`group px-3 py-2 rounded-lg hover:bg-[#e0ddd4] cursor-pointer flex items-center justify-between transition-colors ${currentThreadId === thread.id ? 'bg-[#e0ddd4]' : ''}`} onClick={() => { setCurrentThreadId(thread.id); setCurrentThreadTitle(thread.title) }}>
                    <span className="text-[14px] text-[#2d2d2d] truncate flex-1">{thread.title}</span>
                    <div className="relative" ref={deleteMenuOpen === thread.id ? deleteMenuRef : null}>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteMenuOpen(deleteMenuOpen === thread.id ? null : thread.id) }} className="opacity-0 group-hover:opacity-100 text-[#6b6b6b] hover:text-[#2d2d2d] p-1">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="4" cy="8" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="12" cy="8" r="1"/></svg>
                      </button>
                      {deleteMenuOpen === thread.id && (
                        <div className="absolute right-0 top-6 bg-white border border-[#e0ddd4] rounded-lg shadow-lg py-1 z-10 w-32">
                          <button onClick={(e) => { e.stopPropagation(); deleteThread(thread.id) }} className="w-full px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50 transition-colors">Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-[#e0ddd4]">
              <div className="relative" ref={userDropdownRef}>
                <div onClick={() => setUserDropdownOpen(!userDropdownOpen)} className="flex items-center gap-3 px-3 py-2 hover:bg-[#e0ddd4] rounded-lg cursor-pointer transition-colors">
                  <div className="w-8 h-8 rounded-full bg-[#3d3d3a] flex items-center justify-center text-white text-[14px] font-medium">C</div>
                  <span className="text-[14px] text-[#2d2d2d] font-medium">Cameron</span>
                </div>
                {userDropdownOpen && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-[#e0ddd4] rounded-lg shadow-lg py-1">
                    <button onClick={handleLogout} className="w-full px-4 py-2 text-left text-[14px] text-[#2d2d2d] hover:bg-[#f5f5f5] transition-colors">Log out</button>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center py-4 gap-4">
            <button onClick={() => setSidebarOpen(true)} className="w-8 h-8 flex items-center justify-center text-[#6b6b6b] hover:bg-[#e0ddd4] rounded-lg transition-colors" title="History">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3C6.134 3 3 6.134 3 10s3.134 7 7 7 7-3.134 7-7h-2c0 2.757-2.243 5-5 5s-5-2.243-5-5 2.243-5 5-5V3zm7 7h-4l3-3 1 3z"/></svg>
            </button>
            <button onClick={() => router.push('/dashboard')} className="w-8 h-8 flex items-center justify-center text-[#6b6b6b] hover:bg-[#e0ddd4] rounded-lg transition-colors" title="All Projects">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/><rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/></svg>
            </button>
            <div className="flex-1"/>
            <div onClick={handleLogout} className="w-8 h-8 rounded-full bg-[#3d3d3a] flex items-center justify-center text-white text-[14px] font-medium cursor-pointer hover:bg-[#2d2d2a] transition-colors">C</div>
          </div>
        )}
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        <header className="bg-[#f7f5ef] border-b border-[#e0ddd4] px-6 py-3 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-[#e0ddd4] rounded-lg transition-colors">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><line x1="8" y1="4" x2="8" y2="16" stroke="currentColor" strokeWidth="1.5"/></svg>
          </button>
          <h2 className="text-[15px] font-medium text-[#2d2d2d]">{currentThreadTitle}</h2>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[800px] mx-auto px-6 py-8">
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-[#d97757] rounded-2xl mx-auto mb-6 flex items-center justify-center text-3xl">🧠</div>
                <h3 className="text-[24px] font-normal text-[#2d2d2d] mb-2">Welcome to {projectName}</h3>
                <p className="text-[15px] text-[#6b6b6b]">Ask me anything...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-[#d97757] text-white' : 'bg-white border border-[#e0ddd4] text-[#2d2d2d]'}`}>
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
            {/* Attached files preview */}
            {attachedFiles.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {attachedFiles.map((file) => (
                  <div key={file.id} className="relative bg-white border border-[#e0ddd4] rounded-lg p-2 pr-8 flex items-center gap-2">
                    {file.type.startsWith('image/') ? (
                      <img src={file.url} alt={file.name} className="w-10 h-10 object-cover rounded" />
                    ) : (
                      <div className="w-10 h-10 bg-[#f5f5f5] rounded flex items-center justify-center text-[#6b6b6b]">📄</div>
                    )}
                    <div className="text-[12px]">
                      <div className="text-[#2d2d2d] font-medium max-w-[150px] truncate">{file.name}</div>
                      <div className="text-[#8b8b8b]">{formatFileSize(file.size)}</div>
                    </div>
                    <button onClick={() => removeFile(file.id)} className="absolute top-1 right-1 w-5 h-5 bg-[#f5f5f5] hover:bg-[#e0ddd4] rounded-full flex items-center justify-center text-[#6b6b6b] hover:text-[#2d2d2d] transition-colors">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white border-2 border-[#e0ddd4] rounded-2xl shadow-sm focus-within:border-[#d97757] transition-colors">
              <div className="flex items-center gap-2 px-4 py-3">
                <div className="relative" ref={fileMenuRef}>
                  <button onClick={() => { setFileMenuOpen(!fileMenuOpen) }} className="p-2 text-[#6b6b6b] hover:bg-[#f5f5f5] rounded-lg transition-colors" title="Add file">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M10 5v10M5 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                  {fileMenuOpen && (
                    <div className="absolute bottom-full left-0 mb-2 bg-white border border-[#e0ddd4] rounded-lg shadow-lg py-1 w-48 z-50">
                      <button onClick={() => { fileInputRef.current?.click(); setFileMenuOpen(false) }} className="w-full px-4 py-2 text-left text-[14px] hover:bg-[#f5f5f5] transition-colors">Upload file</button>
                    </div>
                  )}
                </div>

                <input value={message} onChange={(e) => setMessage(e.target.value)} onKeyPress={handleKeyPress} disabled={loading} className="flex-1 outline-none text-[15px] text-[#2d2d2d] bg-transparent placeholder:text-[#999]" placeholder={`Message ${projectName}...`} />

                <div className="relative" ref={modelDropdownRef}>
                  <button onClick={() => setModelDropdownOpen(!modelDropdownOpen)} className="flex items-center gap-1 text-[13px] text-[#6b6b6b] hover:bg-[#f5f5f5] px-3 py-1.5 rounded transition-colors">
                    {selectedModel}
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 8L3 5h6L6 8z"/></svg>
                  </button>
                  {modelDropdownOpen && (
                    <div className="absolute right-0 bottom-full mb-2 bg-white border border-[#e0ddd4] rounded-lg shadow-lg py-2 w-56 z-50">
                      {models.map((model) => (
                        <button key={model.name} onClick={() => { setSelectedModel(model.name); setModelDropdownOpen(false) }} className="w-full px-4 py-2 text-left hover:bg-[#f5f5f5] transition-colors flex items-center justify-between">
                          <div>
                            <div className="text-[14px] text-[#2d2d2d] font-medium">{model.name}</div>
                            <div className="text-[12px] text-[#8b8b8b]">{model.provider}</div>
                          </div>
                          {selectedModel === model.name && (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="#d97757"><path d="M13 4L6 11 3 8l1-1 2 2 6-6 1 1z"/></svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={sendMessage} disabled={loading || (!message.trim() && attachedFiles.length === 0)} className="p-2 bg-[#d97757] hover:bg-[#c86545] disabled:bg-gray-300 text-white rounded-full transition-colors">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5a.75.75 0 0 1 .53.22l4 4a.75.75 0 0 1-1.06 1.06L10.75 6.06V12.25a.75.75 0 0 1-1.5 0V6.06L6.53 8.78a.75.75 0 0 1-1.06-1.06l4-4A.75.75 0 0 1 10 3.5z"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
