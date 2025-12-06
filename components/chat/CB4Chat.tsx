'use client'

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import CreditBalance from "@/components/CreditBalance"
import ReactMarkdown from 'react-markdown'
import Link from "next/link";


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
  projectId: string
  projectName?: string
  projectSlug?: string
  projectEmoji?: string
  systemPrompt?: string
  _projectColor?: string
}

export default function CB4Chat({
  userId,
  projectId,
  projectName = "CB4",
  projectSlug = "cb4",
  projectEmoji = "🧠",
  systemPrompt = "",
  _projectColor = "#d97757"
}: CB4ChatProps) {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)
  const [currentThreadTitle, setCurrentThreadTitle] = useState("New Chat")
  const [loading, setLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('Claude Sonnet 4.5')
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarOpen')
      return saved !== null ? JSON.parse(saved) : true
    }
    return true
  })
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [deleteMenuOpen, setDeleteMenuOpen] = useState<string | null>(null)
  const [fileMenuOpen, setFileMenuOpen] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [contextWarning, setContextWarning] = useState(false)
  const [renameThreadId, setRenameThreadId] = useState<string | null>(null)
  const [newThreadName, setNewThreadName] = useState("")

  const supabase = createClient()
  const router = useRouter()
  const modelDropdownRef = useRef<HTMLDivElement>(null)
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const deleteMenuRef = useRef<HTMLDivElement>(null)
  const fileMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen))
  }, [sidebarOpen])

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


  const renameThread = async () => {
  if (!renameThreadId || !newThreadName.trim()) return

  const { error } = await supabase
    .from('chat_threads')
    .update({ title: newThreadName.trim() })
    .eq('id', renameThreadId)

  if (error) {
    console.error('Rename error:', error)
    alert('Failed to rename')
  } else {
    setRenameThreadId(null)
    setNewThreadName("")
    loadThreads()
  }
}
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY

    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFiles(files)
      setTimeout(() => setIsDragging(false), 300)
    } else {
      setIsDragging(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(Array.from(e.target.files))
    setFileMenuOpen(false)
  }

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

  const loadThreads = useCallback(async () => {
    const { data } = await supabase
      .from('chat_threads')
      .select('*')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (data) setThreads(data)
  }, [supabase, userId, projectId])

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

  // Check context size
  useEffect(() => {
    const totalMessages = messages.length
    const estimatedTokens = messages.reduce((sum, msg) =>
      sum + Math.ceil(msg.content.length / 4), 0
    )

    if (estimatedTokens > 20000 || totalMessages > 50) {
      setContextWarning(true)
    } else {
      setContextWarning(false)
    }
  }, [messages])

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

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserName(user.user_metadata?.full_name || user.user_metadata?.name || null)
        setUserEmail(user.email || null)
      }
    }
    fetchUser()
  }, [supabase])

  const uploadFiles = async () => {
    const uploaded: Array<{ url: string; name: string; type?: string; size?: number }> = []
    for (const attachedFile of attachedFiles) {
      const filePath = `${userId}/${Date.now()}-${attachedFile.name}`
      const { error: uploadErr } = await supabase.storage
        .from('chat-files')
        .upload(filePath, attachedFile.file, { cacheControl: '3600', upsert: false })

      if (uploadErr) {
        console.error('Upload error:', uploadErr)
        continue
      }

      const { data } = supabase.storage.from('chat-files').getPublicUrl(filePath)
      if (data?.publicUrl) {
        uploaded.push({
          url: data.publicUrl,
          name: attachedFile.name,
          type: attachedFile.type,
          size: attachedFile.size
        })
      }
    }
    return uploaded
  }

  const sendMessage = async () => {
    if (!message.trim() && attachedFiles.length === 0) return

    setLoading(true)
    const userDisplayContent = message + (attachedFiles.length ? `\n\nAttached: ${attachedFiles.map(f => f.name).join(", ")}` : "")
    const tempId = `tmp-${Date.now()}`

    setMessages(prev => [...prev, {
      id: tempId,
      role: 'user',
      content: userDisplayContent,
      created_at: new Date().toISOString()
    }])

    const msgToSend = message
    setMessage("")
    const filesToUpload = [...attachedFiles]
    setAttachedFiles([])

    try {
      let fileObjs: any[] = []
      if (filesToUpload.length > 0) fileObjs = await uploadFiles()

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msgToSend,
          userId,
          projectId,
          projectSlug,
          model: selectedModel,
          threadId: currentThreadId,
          fileUrls: fileObjs,
          systemPrompt
        })
      })

      const text = await res.text()
      let data: any = {}
      try { data = text ? JSON.parse(text) : {} } catch { data = {} }

      if (data.success) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: data.userMessageId || m.id } : m))
        if (data.threadId && !currentThreadId) setCurrentThreadId(data.threadId)
        setMessages(prev => [...prev, {
          id: data.assistantMessageId || `ai-${Date.now()}`,
          role: 'assistant',
          content: data.reply || 'No response',
          created_at: new Date().toISOString()
        }])
        loadThreads()
      } else {
        alert('Error: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Send message error:', error)
      alert('Failed to send message')
    }
    finally { setLoading(false) }
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
    { name: 'Claude Sonnet 4.5', value: 'Claude Sonnet 4.5', tier: 'Most Capable' },
    { name: 'Claude Haiku 4.5', value: 'Claude Haiku 4.5', tier: 'Fast & Efficient' },
    { name: 'Claude Opus 4.1', value: 'Claude Opus 4.1', tier: 'Advanced Reasoning' },
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatMessageContent = (content: string) => {
    // Add custom styling for scores like "3/10", "Energy: 4/10"
    const scorePattern = /(\w+[\w\s]*:\s*)(\d+\/10)/g
    const styledContent = content.replace(
      scorePattern,
      (match, label, score) => {
        const numScore = parseInt(score.split('/')[0])
        const color = numScore <= 3 ? '#ef4444' : numScore <= 6 ? '#f59e0b' : '#22c55e'
        return `${label}**<span style="color: ${color}; font-weight: 700;">${score}</span>**`
      }
    )
    return styledContent
  }

  const MarkdownComponents = {
      h1: ({ children }: any) => (
        <h1 className="text-[24px] font-bold mt-6 mb-3 pb-2 border-b-2 border-[#d97757]">
          {children}
        </h1>
      ),
      h2: ({ children }: any) => (
        <h2 className="text-[20px] font-semibold mt-5 mb-2 pl-3 border-l-4 border-[#d97757]">
          {children}
        </h2>
      ),
      h3: ({ children }: any) => (
        <h3 className="text-[18px] font-semibold mt-4 mb-2">
          {children}
        </h3>
      ),
      strong: ({ children }: any) => (
        <strong className="font-bold text-[#d97757]">
          {children}
        </strong>
      ),
      code: ({ inline, children }: any) => (
        inline ? (
          <code className="bg-[#f7f5ef] border border-[#e0ddd4] px-2 py-0.5 rounded text-[#d97757] font-semibold text-[14px]">
            {children}
          </code>
        ) : (
          <code>{children}</code>
        )
      ),
      ul: ({ children }: any) => (
        <ul className="my-3 space-y-2">
          {children}
        </ul>
      ),
      li: ({ children }: any) => (
        <li className="relative pl-6 before:content-['•'] before:absolute before:left-0 before:text-[#d97757] before:font-bold before:text-[18px]">
          {children}
        </li>
      )
    }
  const addSectionSeparators = (content: string) => {
    return content.replace(/Section \d+:/g, (match) => `\n---\n\n${match}`)
  }

  return (
    <div className="flex h-screen bg-[#f7f5ef] relative" onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {isDragging && (
        <div className="absolute inset-0 bg-[#f7f5ef]/95 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
          <div className="text-center pointer-events-auto">
            <div className="w-32 h-32 border-4 border-dashed border-[#d97757] rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="#d97757">
                <path d="M24 8v24M12 20l12-12 12 12" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-[20px] font-medium text-[#2d2d2d]">Drop files here to add to chat</p>
            <p className="text-[14px] text-[#6b6b6b] mt-2">Images, PDFs, and text files only (max 5MB)</p>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.txt" onChange={handleFileSelect} className="hidden" />

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-[260px]' : 'w-[60px]'} bg-background border-r border-border flex flex-col transition-all duration-300 flex-shrink-0`}>
        {!sidebarOpen && (
        <div className="flex flex-col h-full items-center py-3 gap-2">
          <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 rounded-lg hover:bg-[#e8e6df] transition-colors flex items-center justify-center text-[#6b6b6b]" title="Open sidebar">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="4" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="8" y1="4" x2="8" y2="16" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </button>

            <button onClick={() => router.push('/dashboard')} className="w-10 h-10 rounded-lg hover:bg-[#e8e6df] transition-colors flex items-center justify-center text-[#6b6b6b]" title="Dashboard">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </button>

            <button onClick={createNewThread} className="w-10 h-10 rounded-full bg-[#d97757] hover:bg-[#c86545] transition-colors flex items-center justify-center text-white" title="New chat">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 5v10M5 10h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            {threads.length > 0 && (
              <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 rounded-lg hover:bg-[#e8e6df] transition-colors flex items-center justify-center text-[#6b6b6b]" title="View chats">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 7h14M3 10h14M3 13h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}

            <div className="flex-1"></div>

            <div className="relative" ref={userDropdownRef}>
              <button onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-medium hover:opacity-80 transition-opacity bg-primary">
                {userName ? userName.charAt(0).toUpperCase() : (userEmail?.charAt(0).toUpperCase() || 'U')}
              </button>
              {userDropdownOpen && (
              <div className="absolute bottom-full left-12 mb-2 bg-surface border border-border rounded-lg shadow-lg py-1 w-48 z-50">
                <Link href="/app/analytics">
                  <button className="w-full text-left px-4 py-2 text-[14px] text-foreground hover:bg-surface-hover transition-colors">
                    Analytics
                  </button>
                </Link>
                <Link href="/app/settings">
                  <button className="w-full text-left px-4 py-2 text-[14px] text-foreground hover:bg-surface-hover transition-colors">
                    Settings
                  </button>
                </Link>
                <Link href="/app/pricing">
                  <button className="w-full text-left px-4 py-2 text-[14px] text-foreground hover:bg-surface-hover transition-colors">
                    Upgrade to Pro
                  </button>
                </Link>
                <button onClick={handleLogout} className="w-full px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50/10 transition-colors">
                  Logout
                </button>
              </div>
            )}
            </div>
        </div>
        )}

        {sidebarOpen && (
            <>
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{projectEmoji}</span>
                  <h2 className="text-[15px] font-semibold text-foreground">{projectName}</h2>
                </div>
                <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-1.5 hover:bg-[#e8e6df] rounded-lg transition-colors"
                    title="Close sidebar"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                    <rect x="3" y="4" width="14" height="12" rx="1.5" strokeWidth="1.5"/>
                    <line x1="12" y1="4" x2="12" y2="16" strokeWidth="1.5"/>
                  </svg>
                </button>
              </div>

              <div className="p-3 space-y-2">
                <button onClick={() => router.push('/dashboard')}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors text-[13px] text-muted-foreground">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M14 8H2M6 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  All Projects
                </button>

                <button onClick={createNewThread}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-accent hover:bg-accent/90 transition-colors text-[14px] text-white font-medium">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 4v8M4 8h8" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  New Chat
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-2">
                {threads.length > 0 && (
                  <div className="text-[11px] text-muted-foreground px-3 py-2 font-medium">RECENT CHATS</div>
                )}
                {threads.map(thread => (
                    <div key={thread.id} className="relative group mb-1">
                      <button onClick={() => setCurrentThreadId(thread.id)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-[13px] transition-colors ${currentThreadId === thread.id ? 'bg-[#e8e6df] text-[#2d2d2d] font-medium' : 'text-[#6b6b6b] hover:bg-[#e8e6df]/50'}`}>
                        <div className="truncate">{thread.title}</div>
                      </button>
                      {currentThreadId === thread.id && (
                          <div className="absolute right-2 top-2">
                            <button onClick={() => setDeleteMenuOpen(deleteMenuOpen === thread.id ? null : thread.id)}
                                    className="p-1 hover:bg-[#f7f5ef] rounded transition-colors">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                              <circle cx="3" cy="7" r="1"/>
                              <circle cx="7" cy="7" r="1"/>
                              <circle cx="11" cy="7" r="1"/>
                            </svg>
                      </button>
                      {deleteMenuOpen === thread.id && (
                          <div
                              className="absolute right-0 top-full mt-1 bg-white border border-[#e0ddd4] rounded-lg shadow-lg py-1 w-32 z-50">
                            <button onClick={() => {
                              setNewThreadName(thread.title);
                              setRenameThreadId(thread.id);
                              setDeleteMenuOpen(null);
                            }} className="w-full px-3 py-1.5 text-left text-[13px] hover:bg-[#f5f5f5]">Rename
                            </button>
                            <button onClick={() => deleteThread(thread.id)}
                                    className="w-full px-3 py-1.5 text-left text-[13px] text-red-600 hover:bg-red-50">Delete
                            </button>
                          </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-border p-3">
            <div className="relative" ref={userDropdownRef}>
              <button onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[13px] font-medium flex-shrink-0 bg-primary">
                  {userName ? userName.charAt(0).toUpperCase() : (userEmail?.charAt(0).toUpperCase() || 'U')}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-[13px] text-foreground truncate font-medium">{userName || userEmail || 'User'}</div>
                </div>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M6 8L3 5h6L6 8z"/>
                </svg>
              </button>
              {userDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-full bg-surface border border-border rounded-lg shadow-lg py-1">
                  <div className="px-3 py-2 border-b border-border">
                    <div className="text-[13px] text-foreground font-medium truncate">{userName || 'User'}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{userEmail}</div>
                  </div>
                  <Link href="/app/analytics">
                    <button className="w-full text-left px-4 py-2 text-[14px] text-foreground hover:bg-surface-hover transition-colors">
                      Analytics
                    </button>
                  </Link>
                  <Link href="/app/settings">
                    <button className="w-full text-left px-4 py-2 text-[14px] text-foreground hover:bg-surface-hover transition-colors">
                      Settings
                    </button>
                  </Link>
                  <Link href="/app/pricing">
                    <button className="w-full text-left px-4 py-2 text-[14px] text-foreground hover:bg-surface-hover transition-colors">
                      Upgrade to Pro
                    </button>
                  </Link>
                  <button onClick={handleLogout} className="w-full px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50/10 transition-colors">
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          </>
        )}
      </aside>


      {renameThreadId && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96">
          <h3 className="text-lg font-semibold mb-4">Rename Chat</h3>
          <input
            type="text"
            value={newThreadName}
            onChange={(e) => setNewThreadName(e.target.value)}
            className="w-full px-3 py-2 border border-[#e0ddd4] rounded-lg mb-4"
            placeholder="New chat name"
          />
          <div className="flex gap-2">
            <button onClick={renameThread} className="flex-1 px-4 py-2 bg-[#d97757] text-white rounded-lg">Save</button>
            <button onClick={() => setRenameThreadId(null)} className="flex-1 px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
          </div>
        </div>
      </div>
    )}
      {/* Main chat area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-background border-b border-border px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xl">{projectEmoji}</span>
            <h2 className="text-[15px] font-medium text-foreground">{currentThreadTitle}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-lg">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" fill="none" className="text-accent"/>
              </svg>
              <CreditBalance userId={userId}/>
            </div>
          </div>
        </header>

        {contextWarning && (
            <div className="bg-[#fff3cd] border-b border-[#ffc107] px-6 py-3">
              <div className="max-w-[800px] mx-auto flex items-center gap-3">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="#856404">
                  <path d="M10 2L2 18h16L10 2 zm0 3l6 11H4l6-11zm0 3v4h1V8h-1zm0 5v1h1v-1h-1z"/>
                </svg>
                <p className="text-[14px] text-[#856404]">
                  <strong>Warning:</strong> Longer chats will use credits faster due to increased context
                </p>
              </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[800px] mx-auto px-6 py-8">
            {messages.length === 0 ? (
                <div className="text-center py-16">
                  <div
                      className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center text-3xl">{projectEmoji}</div>
                  <h3 className="text-[24px] font-normal text-[#2d2d2d] mb-2">Welcome to {projectName}</h3>
                  <p className="text-[15px] text-[#6b6b6b]">Ask me anything...</p>
                </div>
            ) : (
                <div className="space-y-6">
                  {messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                            msg.role === 'user'
                                ? 'text-white bg-accent' 
                                : 'bg-surface border border-border text-foreground'
                        }`}>
                          <div className="text-[15px] leading-[1.6] prose prose-sm max-w-none">
                            <ReactMarkdown components={MarkdownComponents}>
                              {msg.role === 'assistant'
                                  ? addSectionSeparators(formatMessageContent(msg.content))
                                  : msg.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                  ))}
                  {loading && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-[#e0ddd4] rounded-2xl px-4 py-3">
                          <div className="flex gap-1.5">
                            <div className="w-2 h-2 rounded-full animate-bounce" style={{backgroundColor: '#d97757'}}/>
                            <div className="w-2 h-2 rounded-full animate-bounce delay-100"
                                 style={{backgroundColor: '#d97757'}}/>
                            <div className="w-2 h-2 rounded-full animate-bounce delay-200"
                                 style={{backgroundColor: '#d97757'}}/>
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
                      <div key={file.id}
                           className="relative bg-white border border-[#e0ddd4] rounded-lg p-2 pr-8 flex items-center gap-2">
                        {file.type.startsWith('image/') ? (
                            <img src={file.url} alt={file.name} className="w-10 h-10 object-cover rounded"/>
                        ) : (
                            <div
                                className="w-10 h-10 bg-[#f5f5f5] rounded flex items-center justify-center text-[#6b6b6b]">📄</div>
                        )}
                        <div className="text-[12px]">
                          <div className="text-[#2d2d2d] font-medium max-w-[150px] truncate">{file.name}</div>
                          <div className="text-[#8b8b8b]">{formatFileSize(file.size)}</div>
                        </div>
                        <button onClick={() => removeFile(file.id)}
                                className="absolute top-1 right-1 w-5 h-5 bg-[#f5f5f5] hover:bg-[#e0ddd4] rounded-full flex items-center justify-center text-[#6b6b6b] hover:text-[#2d2d2d] transition-colors">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                  ))}
                </div>
            )}

            <div
                className="bg-white border-2 border-[#e0ddd4] rounded-2xl shadow-sm focus-within:border-[#d97757] transition-colors flex items-center gap-2 px-4 py-3">
              <div className="relative" ref={fileMenuRef}>
                <button onClick={() => setFileMenuOpen(!fileMenuOpen)}
                        className="p-2 text-[#6b6b6b] hover:bg-[#f5f5f5] rounded-lg transition-colors" title="Add file">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 5v10M5 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
                {fileMenuOpen && (
                    <div
                        className="absolute bottom-full left-0 mb-2 bg-white border border-[#e0ddd4] rounded-lg shadow-lg py-1 w-48 z-50">
                      <button onClick={() => {
                        fileInputRef.current?.click();
                        setFileMenuOpen(false);
                      }} className="w-full px-4 py-2 text-left text-[14px] hover:bg-[#f5f5f5] transition-colors">
                        Upload file
                      </button>
                    </div>
                )}
              </div>

              <textarea
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value)
                    // Auto-resize textarea
                    e.target.style.height = 'auto'
                    e.target.style.height = e.target.scrollHeight + 'px'
                  }}
                  onKeyDown={handleKeyPress}
                  disabled={loading}
                  rows={1}
                  className="flex-1 outline-none text-[15px] text-[#2d2d2d] bg-transparent placeholder:text-[#999] resize-none max-h-[200px] overflow-y-auto"
                  placeholder={`Message ${projectName}...`}
                  style={{minHeight: '24px'}}
              />

              <div className="relative" ref={modelDropdownRef}>
                <button onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                        className="flex items-center gap-1 text-[13px] text-[#6b6b6b] hover:bg-[#f5f5f5] px-3 py-1.5 rounded transition-colors">
                  {selectedModel}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M6 8L3 5h6L6 8z"/>
                  </svg>
                </button>
                {modelDropdownOpen && (
                    <div
                        className="absolute right-0 bottom-full mb-2 bg-white border border-[#e0ddd4] rounded-lg shadow-lg py-2 w-48 z-50">
                      {models.map(model => (
                          <button key={model.name} onClick={() => {
                            setSelectedModel(model.name);
                            setModelDropdownOpen(false);
                          }}
                                  className="w-full px-4 py-2 text-left hover:bg-[#f5f5f5] transition-colors flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-[14px] text-[#2d2d2d] font-medium">{model.name}</div>
                              <div className="text-[11px] text-[#8b8b8b]">{model.tier}</div>
                            </div>
                            {selectedModel === model.name && (
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="#d97757">
                                  <path d="M13 4L6 11 3 8l1-1 2 2 6-6 1 1z"/>
                                </svg>
                            )}
                          </button>
                      ))}
                    </div>
                )}
              </div>

              <button onClick={sendMessage} disabled={loading}
                      className="w-10 h-10 bg-[#d97757] hover:bg-[#c86545] text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 15V5M5 10l5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                        strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}