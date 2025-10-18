'use client'

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
  projectEmoji?: string
}

export default function CB4Chat({
  userId,
  projectName = "CB4",
  projectSlug = "cb4",
  projectEmoji = "🧠"
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
  const [userName, setUserName] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()
  const modelDropdownRef = useRef<HTMLDivElement>(null)
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const deleteMenuRef = useRef<HTMLDivElement>(null)
  const fileMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) setModelDropdownOpen(false)
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) setUserDropdownOpen(false)
      if (deleteMenuRef.current && !deleteMenuRef.current.contains(event.target as Node)) setDeleteMenuOpen(null)
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) setFileMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Drag and drop
  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true) }
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.currentTarget === e.target) setIsDragging(false) }
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation() }
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); handleFiles(Array.from(e.dataTransfer.files)) }
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) handleFiles(Array.from(e.target.files)); setFileMenuOpen(false) }

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf' || file.type === 'text/plain'
      const isValidSize = file.size <= 5 * 1024 * 1024
      if (!isValidType) alert(`${file.name}: Only images, PDFs, and text files are allowed`)
      if (!isValidSize) alert(`${file.name}: File size must be less than 5MB`)
      return isValidType && isValidSize
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

  // Load threads
  const loadThreads = useCallback(async () => {
    const { data: projects } = await supabase.from('projects').select('id').eq('slug', projectSlug).single()
    if (!projects) return
    const { data } = await supabase.from('chat_threads').select('*').eq('user_id', userId).eq('project_id', projects.id).order('created_at', { ascending: false })
    if (data) setThreads(data)
  }, [supabase, userId, projectSlug])

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!currentThreadId) return
    const { data } = await supabase.from('messages').select('*').eq('thread_id', currentThreadId).order('created_at', { ascending: true })
    if (data) setMessages(data)
    const thread = threads.find(t => t.id === currentThreadId)
    if (thread) setCurrentThreadTitle(thread.title)
  }, [supabase, currentThreadId, threads])

  useEffect(() => { loadThreads() }, [loadThreads])
  useEffect(() => { loadMessages() }, [loadMessages])

  const createNewThread = async () => { setCurrentThreadId(null); setMessages([]); setCurrentThreadTitle("New Chat"); setAttachedFiles([]) }
  const deleteThread = async (threadId: string) => { await supabase.from('chat_threads').delete().eq('id', threadId); if (currentThreadId === threadId) createNewThread(); loadThreads(); setDeleteMenuOpen(null) }

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) { setUserName(user.user_metadata?.full_name || user.user_metadata?.name || null); setUserEmail(user.email || null) }
    }
    fetchUser()
  }, [supabase])

  const uploadFiles = async () => {
    const uploaded: Array<{ url: string; name: string; type?: string; size?: number }> = []
    for (const attachedFile of attachedFiles) {
      const filePath = `${userId}/${Date.now()}-${attachedFile.name}`
      const { error: uploadErr } = await supabase.storage.from('chat-files').upload(filePath, attachedFile.file, { cacheControl: '3600', upsert: false })
      if (uploadErr) { console.error('Upload error:', uploadErr); continue }
      const { data } = supabase.storage.from('chat-files').getPublicUrl(filePath)
      if (data?.publicUrl) uploaded.push({ url: data.publicUrl, name: attachedFile.name, type: attachedFile.type, size: attachedFile.size })
    }
    return uploaded
  }

  const sendMessage = async () => {
    if (!message.trim() && attachedFiles.length === 0) return
    setLoading(true)
    const userDisplayContent = message + (attachedFiles.length ? `\n\nAttached: ${attachedFiles.map(f => f.name).join(", ")}` : "")
    const tempId = `tmp-${Date.now()}`
    setMessages(prev => [...prev, { id: tempId, role: 'user', content: userDisplayContent, created_at: new Date().toISOString() }])
    const msgToSend = message; setMessage(""); const filesToUpload = [...attachedFiles]; setAttachedFiles([])

    try {
      let fileObjs: any[] = []
      if (filesToUpload.length > 0) fileObjs = await uploadFiles()
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: msgToSend, userId, projectSlug, model: selectedModel, threadId: currentThreadId, fileUrls: fileObjs }) })
      const text = await res.text(); let data: any = {}; try { data = text ? JSON.parse(text) : {} } catch { data = {} }
      if (data.success) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: data.userMessageId || m.id } : m))
        if (data.threadId && !currentThreadId) setCurrentThreadId(data.threadId)
        setMessages(prev => [...prev, { id: data.assistantMessageId || `ai-${Date.now()}`, role: 'assistant', content: data.reply || 'No response', created_at: new Date().toISOString() }])
        loadThreads()
      } else { alert('Error: ' + (data.error || 'Unknown error')) }
    } catch (error) { console.error('Send message error:', error); alert('Failed to send message') }
    finally { setLoading(false) }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/auth/login') }
  const models = [
    { name: 'Claude Sonnet 4', provider: 'Anthropic' },
    { name: 'GPT-4o', provider: 'OpenAI' },
    { name: 'Gemini Pro', provider: 'Google' },
    { name: 'Deepseek', provider: 'Deepseek' },
    { name: 'xAI', provider: 'xAI' },
  ]
  const formatFileSize = (bytes: number) => bytes < 1024 ? bytes + ' B' : bytes < 1024 * 1024 ? (bytes / 1024).toFixed(1) + ' KB' : (bytes / (1024 * 1024)).toFixed(1) + ' MB'

  return (
    <div className="flex h-screen bg-[#f7f5ef] relative" onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-[#f7f5ef]/95 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 border-4 border-dashed border-[#d97757] rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="#d97757"><path d="M24 8v24M12 20l12-12 12 12" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <p className="text-[20px] font-medium text-[#2d2d2d]">Drop files here to add to chat</p>
            <p className="text-[14px] text-[#6b6b6b] mt-2">Images, PDFs, and text files only (max 5MB)</p>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.txt" onChange={handleFileSelect} className="hidden" />

      {/* Sidebar */}
      {/* ... sidebar code unchanged ... */}

      {/* Main chat area */}
      <main className="flex-1 flex flex-col">
        <header className="bg-[#f7f5ef] border-b border-[#e0ddd4] px-6 py-3 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-[#e0ddd4] rounded-lg transition-colors">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><line x1="8" y1="4" x2="8" y2="16" stroke="currentColor" strokeWidth="1.5"/></svg>
          </button>
          {/* Show project emoji next to thread title */}
          <span className="text-xl">{projectEmoji}</span>
          <h2 className="text-[15px] font-medium text-[#2d2d2d]">{currentThreadTitle}</h2>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[800px] mx-auto px-6 py-8">
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center text-3xl">{projectEmoji}</div>
                <h3 className="text-[24px] font-normal text-[#2d2d2d] mb-2">Welcome to {projectName}</h3>
                <p className="text-[15px] text-[#6b6b6b]">Ask me anything...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map(msg => (
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

        {/* Message input */}
        <div className="border-t border-[#e0ddd4] bg-[#f7f5ef] p-6">
          <div className="max-w-[800px] mx-auto">
            {attachedFiles.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {attachedFiles.map(file => (
                  <div key={file.id} className="relative bg-white border border-[#e0ddd4] rounded-lg p-2 pr-8 flex items-center gap-2">
                    {file.type.startsWith('image/') ? <img src={file.url} alt={file.name} className="w-10 h-10 object-cover rounded" /> : <div className="w-10 h-10 bg-[#f5f5f5] rounded flex items-center justify-center text-[#6b6b6b]">📄</div>}
                    <div className="text-[12px]">
                      <div className="text-[#2d2d2d] font-medium max-w-[150px] truncate">{file.name}</div>
                      <div className="text-[#8b8b8b]">{formatFileSize(file.size)}</div>
                    </div>
                    <button onClick={() => removeFile(file.id)} className="absolute top-1 right-1 w-5 h-5 bg-[#f5f5f5] hover:bg-[#e0ddd4] rounded-full flex items-center justify-center text-[#6b6b6b] hover:text-[#2d2d2d] transition-colors">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white border-2 border-[#e0ddd4] rounded-2xl shadow-sm focus-within:border-[#d97757] transition-colors flex items-center gap-2 px-4 py-3">
              <div className="relative" ref={fileMenuRef}>
                <button onClick={() => setFileMenuOpen(!fileMenuOpen)} className="p-2 text-[#6b6b6b] hover:bg-[#f5f5f5] rounded-lg transition-colors" title="Add file">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 5v10M5 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
                {fileMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white border border-[#e0ddd4] rounded-lg shadow-lg py-1 w-48 z-50">
                    <button onClick={() => { fileInputRef.current?.click(); setFileMenuOpen(false) }} className="w-full px-4 py-2 text-left text-[14px] hover:bg-[#f5f5f5] transition-colors">Upload file</button>
                  </div>
                )}
              </div>

              <input value={message} onChange={(e) => setMessage(e.target.value)} onKeyPress={handleKeyPress} disabled={loading} className="flex-1 outline-none text-[15px] text-[#2d2d2d] bg-transparent placeholder:text-[#999]" placeholder={`Message ${projectName}...`} />

              <div className="relative" ref={modelDropdownRef}>
                <button onClick={() => setModelDropdownOpen(!modelDropdownOpen)} className="flex items-center gap-1 text-[13px] text-[#6b6b6b] hover:bg-[#f5f5f5] px-3 py-1.5 rounded transition-colors">{selectedModel}<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 8L3 5h6L6 8z"/></svg></button>
                {modelDropdownOpen && (
                  <div className="absolute right-0 bottom-full mb-2 bg-white border border-[#e0ddd4] rounded-lg shadow-lg py-2 w-56 z-50">
                    {models.map(model => (
                      <button key={model.name} onClick={() => { setSelectedModel(model.name); setModelDropdownOpen(false) }} className="w-full px-4 py-2 text-left hover:bg-[#f5f5f5] transition-colors flex items-center justify-between">
                        <div>
                          <div className="text-[14px] text-[#2d2d2d] font-medium">{model.name}</div>
                          <div className="text-[12px] text-[#8b8b8b]">{model.provider}</div>
                        </div>
                        {selectedModel === model.name && <svg width="16" height="16" viewBox="0 0 16 16" fill="#d97757"><path d="M13 4L6 11 3 8l1-1 2 2 6-6 1 1z"/></svg>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={sendMessage} disabled={loading} className="bg-[#d97757] hover:bg-[#c86545] text-white rounded-xl px-4 py-2 text-[14px] font-medium transition-colors">Send</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
