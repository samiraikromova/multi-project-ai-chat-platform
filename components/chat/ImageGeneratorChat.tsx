'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import CreditBalance from '@/components/CreditBalance'

interface ImageGeneratorChatProps {
  userId: string
  projectId: string
  projectSlug: string
  projectName:string
}

interface GeneratedImage {
  id: string
  prompt: string
  image_url: string
  style: string
  aspect_ratio: string
  created_at: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  type: 'text' | 'image'
  imageUrl?: string,
  aspectRatio?: string
}

export default function ImageGeneratorChat({ userId, projectId, projectSlug, projectName }: ImageGeneratorChatProps) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [quality, setQuality] = useState('BALANCED')
  const [currentThreadTitle, setCurrentThreadTitle] = useState("New Chat")
  const [numImages, setNumImages] = useState(1)
  const [threadTotalCost, setThreadTotalCost] = useState(0)
  const [imageSize, setImageSize] = useState('square_hd')
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('imageGenSidebarOpen')
      return saved !== null ? JSON.parse(saved) : true
    }
    return true
  })
  const [qualityDropdownOpen, setQualityDropdownOpen] = useState(false)
  const [numImagesDropdownOpen, setNumImagesDropdownOpen] = useState(false)
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
    const [threads, setThreads] = useState<any[]>([])
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)
    const [showThreadMenu, setShowThreadMenu] = useState(false)
    const [editingThreadId, setEditingThreadId] = useState<string | null>(null)
    const [editingThreadName, setEditingThreadName] = useState('')
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const qualityDropdownRef = useRef<HTMLDivElement>(null)
  const numImagesDropdownRef = useRef<HTMLDivElement>(null)
  const sizeDropdownRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    localStorage.setItem('imageGenSidebarOpen', JSON.stringify(sidebarOpen))
  }, [sidebarOpen])

  useEffect(() => {
  // ✅ Reset state when component mounts
  setCurrentThreadId(null)
  setMessages([])
  setThreads([])

  loadThreads()
}, [projectId, userId])

  useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) setUserDropdownOpen(false)

    // ✅ Close all selector dropdowns
    if (qualityDropdownRef.current && !qualityDropdownRef.current.contains(event.target as Node)) setQualityDropdownOpen(false)
    if (numImagesDropdownRef.current && !numImagesDropdownRef.current.contains(event.target as Node)) setNumImagesDropdownOpen(false)
    if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(event.target as Node)) setSizeDropdownOpen(false)
  }
  document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [])

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

  useEffect(() => {
    loadImages()
  }, [projectId])

  useEffect(() => {
    loadThreads()
  }, [projectId, userId])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [prompt])

  useEffect(() => {
  loadThreads()
}, [projectId, userId])



  useEffect(() => {
  if (!currentThreadId) return

  let lastMessageCount = messages.length

  const pollInterval = setInterval(async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', currentThreadId)
      .order('created_at', { ascending: true })

    if (data && data.length > lastMessageCount) {
      console.log('📨 New messages detected via polling')
      switchThread(currentThreadId) // Reload messages
      lastMessageCount = data.length
    }
  }, 2000) // Check every 2 seconds

  return () => clearInterval(pollInterval)
}, [currentThreadId, messages.length])
  const loadImages = async () => {
  if (!currentThreadId) {
    setImages([])
    return
  }

  const { data } = await supabase
    .from('generated_images')
    .select('*')
    .eq('user_id', userId)
    .eq('thread_id', currentThreadId) // ✅ Filter by current thread
    .order('created_at', { ascending: false })
    .limit(50)

  if (data) {
    setImages(data)
  }
}


    const ImageLightbox = () => {
      if (!lightboxImage) return null

      return (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              setLightboxImage(null)
            }}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              downloadImage(lightboxImage, `image-${Date.now()}.png`)
            }}
            className="absolute top-4 right-20 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            title="Download"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
          </button>

          <div className="relative max-w-7xl max-h-[90vh]">
            <Image
              src={lightboxImage}
              alt="Expanded view"
              width={1920}
              height={1080}
              className="object-contain max-h-[90vh] w-auto"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )
    }


  const generateImage = async () => {
  if (!prompt.trim()) return

  setLoading(true)

  let activeThreadId = currentThreadId

  if (!activeThreadId) {
    const { data: newThread } = await supabase
      .from('chat_threads')
      .insert({
        user_id: userId,
        project_id: projectId,
        title: prompt.substring(0, 50),
        model: 'Ideogram'
      })
      .select()
      .single()

    if (newThread) {
      activeThreadId = newThread.id
      setCurrentThreadId(newThread.id)
      loadThreads()
    }
  }

  const currentPrompt = prompt
  setPrompt("")

  // ✅ Add user message immediately
  const userMsgId = `user-${Date.now()}`
  setMessages(prev => [...prev, {
    id: userMsgId,
    role: 'user',
    content: currentPrompt,
    type: 'text'
  }])

  try {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: currentPrompt,
        userId,
        projectId,
        projectSlug,
        quality,
        numImages,
        aspectRatio: imageSize,
        threadId: activeThreadId
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || data.details || 'Generation failed')
    }

    if (data.error || !data.success) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: data.error || data.details || 'Failed to generate image',
        type: 'text'
      }])
      setLoading(false)
      return
    }

    if (data.isTextResponse) {
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        type: 'text'
      }])
    } else if (data.imageUrls && data.imageUrls.length > 0) {

      const imageMessages = data.imageUrls.map((url: string, idx: number) => ({
      id: `img-${Date.now()}-${idx}`,
      role: 'assistant' as const,
      content: currentPrompt,
      type: 'image' as const,
      imageUrl: url,
      aspectRatio: imageSize // ✅ Add this
    }))

      setMessages(prev => [...prev, ...imageMessages])
    }

    if (data.cost) {
    setThreadTotalCost(prev => prev + data.cost)
  }
    // ✅ Update thread title
    if (activeThreadId && data.success && !data.isTextResponse) {
      const currentThread = threads.find(t => t.id === activeThreadId)
      if (currentThread && currentThread.title === 'New Image Chat') {
        await supabase
          .from('chat_threads')
          .update({ title: currentPrompt.substring(0, 50) })
          .eq('id', activeThreadId)

        loadThreads()
      }
    }

  } catch (error: any) {
    console.error('Image generation error:', error)
    setMessages(prev => [...prev, {
      id: `error-${Date.now()}`,
      role: 'assistant',
      content: `Error: ${error.message || 'Failed to generate image'}`,
      type: 'text'
    }])
  } finally {
    setLoading(false)
  }
}
  const downloadImage = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
      alert('Failed to download image')
    }
  }

  const deleteImage = async (imageId: string) => {
    if (!confirm('Delete this image?')) return

    const { error } = await supabase
      .from('generated_images')
      .delete()
      .eq('id', imageId)

    if (!error) {
      setImages(prev => prev.filter(img => img.id !== imageId))
      if (selectedImage?.id === imageId) {
        setSelectedImage(null)
      }
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const calculateCost = () => {
  const pricing: Record<string, Record<string, number>> = {
    'Ideogram': { 'TURBO': 0.03, 'BALANCED': 0.06, 'QUALITY': 0.09 },
  }
  const cost = pricing['Ideogram']?.[quality] || 0.06
  return (cost * numImages).toFixed(2)
}
  const loadThreads = async () => {
  console.log('=== LOADING THREADS ===')
  console.log('User ID:', userId)
  console.log('Project ID:', projectId)
setCurrentThreadId
  const { data, error } = await supabase
    .from('chat_threads')
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('❌ Error loading threads:', error)
    return
  }

  if (data) {
    console.log(`✅ Loaded ${data.length} threads:`)
    data.forEach((t, idx) => {
      console.log(`  ${idx + 1}. ${t.id.substring(0, 8)}... - ${t.title}`)
    })
    setThreads(data)

    // Auto-select first thread if none selected
    if (!currentThreadId && data.length > 0) {
      console.log('🎯 Auto-selecting first thread:', data[0].id)
      switchThread(data[0].id)
    }
  }
  console.log('===================')
}
const createNewThread = async () => {
  const { data: newThread, error } = await supabase
    .from('chat_threads')
    .insert({
      user_id: userId,
      project_id: projectId,
      title: 'New Image Chat',
      model: 'Ideogram'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating thread:', error)
    return
  }

  if (newThread) {
    setCurrentThreadId(newThread.id)
    setMessages([])
    setImages([])
    setThreadTotalCost(0)
    loadThreads()
    console.log('✅ Created and switched to new thread:', newThread.id)
  }
}

const renameThread = async (threadId: string, newName: string) => {
  await supabase
    .from('chat_threads')
    .update({ title: newName })
    .eq('id', threadId)

  loadThreads()
  setEditingThreadId(null)
}

const deleteThread = async (threadId: string) => {
  if (!confirm('Delete this chat?')) return

  await supabase.from('chat_threads').delete().eq('id', threadId)

  if (currentThreadId === threadId) {
    setCurrentThreadId(null)
    setMessages([])
  }
  loadThreads()
}

const switchThread = async (threadId: string) => {
  console.log('=== SWITCHING THREAD ===')
  console.log('Target thread ID:', threadId)
  console.log('Current thread ID:', currentThreadId)

  // ✅ Set immediately to prevent race conditions
  setCurrentThreadId(threadId)
  setMessages([])
  setImages([])
  setThreadTotalCost(0)

  try {
    const { data: usageLogs } = await supabase
      .from('usage_logs')
      .select('estimated_cost')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .contains('metadata', { thread_id: threadId })

    if (usageLogs && usageLogs.length > 0) {
      const totalCost = usageLogs.reduce((sum, log) => sum + (log.estimated_cost || 0), 0)
      setThreadTotalCost(totalCost)
      console.log(`💰 Thread total cost: $${totalCost.toFixed(2)}`)
    }

    const { data: threadMessages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId) // ✅ Use parameter, not state
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('❌ Error loading messages:', messagesError)
      return
    }

    console.log(`📨 Thread ${threadId}: Found ${threadMessages?.length || 0} messages`)

    // ✅ Load images for THIS specific thread
    const { data: threadImages, error: imagesError } = await supabase
      .from('generated_images')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })

    if (imagesError) {
      console.error('❌ Error loading images:', imagesError)
    }

    console.log(`🖼️ Thread ${threadId}: Found ${threadImages?.length || 0} images`)

    // Create image lookup map
    const imageMap = new Map()
    threadImages?.forEach(img => {
      imageMap.set(img.image_url, img)
      console.log(`  - Image: ${img.prompt?.substring(0, 50)}...`)
    })

    if (!threadMessages || threadMessages.length === 0) {
      console.log('ℹ️ No messages in this thread')
      return
    }

    // ✅ Format messages
    const formattedMessages: ChatMessage[] = threadMessages.map((msg, idx) => {
      const content = msg.content || ''

      console.log(`  Message ${idx + 1}: ${msg.role} - ${content.substring(0, 50)}...`)

      // Check if this is an image URL
      if (content.startsWith('http')) {
        const imageData = imageMap.get(content)
        return {
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: imageData?.prompt,
          type: 'image' as const,
          imageUrl: content
        }
      }

      // Text message
      return {
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: content,
        type: 'text' as const
      }
    })

    setMessages(formattedMessages)
    console.log(`✅ Loaded ${formattedMessages.length} messages`)
    console.log(`   - ${formattedMessages.filter(m => m.type === 'image').length} images`)
    console.log(`   - ${formattedMessages.filter(m => m.type === 'text').length} text messages`)
    console.log('===================')

  } catch (error) {
    console.error('❌ Error in switchThread:', error)
  }
}
return (
    <div className="flex h-screen bg-[#f7f5ef]">
      <ImageLightbox />
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-[260px]' : 'w-[60px]'} bg-[#f7f5ef] border-r border-[#e0ddd4] flex flex-col transition-all duration-300 flex-shrink-0`}>
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

            {images.length > 0 && (
              <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 rounded-lg hover:bg-[#e8e6df] transition-colors flex items-center justify-center text-[#6b6b6b]" title="View images">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 7h14M3 10h14M3 13h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}

            <div className="flex-1"></div>

            <div className="relative" ref={userDropdownRef}>
              <button onClick={() => setUserDropdownOpen(!userDropdownOpen)} className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium hover:brightness-110 transition bg-primary">
                {userName ? userName.charAt(0).toUpperCase() : (userEmail?.charAt(0).toUpperCase() || 'U')}
              </button>
              {userDropdownOpen && (
                <div className="absolute bottom-full left-12 mb-2 bg-white border border-[#e0ddd4] rounded-lg shadow-lg py-1 w-48 z-50">
                  <button onClick={() => router.push('/pricing')} className="w-full text-left px-4 py-2 text-[14px] text-[#2d2d2d] hover:bg-[#dcdcdc] transition-colors">
                    Upgrade to Pro
                  </button>
                  <button onClick={handleLogout} className="w-full px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50 transition-colors">
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {sidebarOpen && (
            <>
              <div className="p-3 border-b border-[#e0ddd4] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎨</span>
                  <h2 className="text-[15px] font-semibold text-[#2d2d2d]">Image Generator</h2>
                </div>
                <button onClick={() => setSidebarOpen(false)}
                        className="p-1.5 hover:bg-[#e8e6df] rounded-lg transition-colors" title="Close sidebar">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                    <rect x="3" y="4" width="14" height="12" rx="1.5" strokeWidth="1.5"/>
                    <line x1="12" y1="4" x2="12" y2="16" strokeWidth="1.5"/>
                  </svg>
                </button>
              </div>

              <div className="p-3 space-y-2">
                <button onClick={() => router.push('/dashboard')}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#e8e6df] transition-colors text-[13px] text-[#6b6b6b]">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M14 8H2M6 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                          strokeLinejoin="round"/>
                  </svg>
                  All Projects
                </button>

                {/* ✅ New Chat Button */}
                <button
                    onClick={createNewThread}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#d97757] hover:bg-[#c86545] text-white transition-colors text-[13px] font-medium"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  New Image Chat
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-2">
                {/* ✅ Thread List */}
                {threads.length > 0 && (
                    <div className="text-[11px] text-[#8b8b8b] px-3 py-2 font-medium">IMAGE CHATS</div>
                )}
                {threads.map(thread => (
                    <div key={thread.id} className="mb-1 group relative">
                      {editingThreadId === thread.id ? (
                          <input
                              type="text"
                              value={editingThreadName}
                              onChange={(e) => setEditingThreadName(e.target.value)}
                              onBlur={() => renameThread(thread.id, editingThreadName)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') renameThread(thread.id, editingThreadName)
                                if (e.key === 'Escape') setEditingThreadId(null)
                              }}
                              className="w-full px-3 py-2 text-[13px] border border-[#d97757] rounded-lg outline-none"
                              autoFocus
                          />
                      ) : (
                          <div className="relative">
                            <div
                                onClick={() => {
                                  console.log('🖱️ Clicked thread:', thread.id, thread.title) // ✅ Debug log
                                  switchThread(thread.id)
                                }}
                                className={`w-full cursor-pointer px-3 py-2 rounded-lg text-[13px] transition-colors ${
                                    currentThreadId === thread.id ? 'bg-[#e8e6df] text-[#2d2d2d]' : 'text-[#6b6b6b] hover:bg-[#f5f3ed]'
                                }`}
                            >
                              <span className="truncate block pr-12">{thread.title}</span>
                            </div>

                            <div
                                className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100"
                                onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingThreadId(thread.id)
                                    setEditingThreadName(thread.title)
                                  }}
                                  className="p-1 hover:bg-[#d97757] hover:text-white rounded transition-colors"
                                  type="button"
                              >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor">
                                  <path d="M8 1l3 3L5 10H2v-3L8 1z" strokeWidth="1.5"/>
                                </svg>
                              </button>
                              <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteThread(thread.id)
                                  }}
                                  className="p-1 hover:bg-red-500 hover:text-white rounded transition-colors"
                                  type="button"
                              >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor">
                                  <path d="M2 3h8M4 3V2h4v1M5 5v4M7 5v4" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                      )}
                    </div>
                ))}

                {/* ✅ No Recently Generated section - removed! */}
              </div>


              <div className="border-t border-[#e0ddd4] p-3">
                <div className="relative" ref={userDropdownRef}>
                  <button onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#e8e6df] transition-colors">
                    <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium hover:brightness-110 transition bg-primary">
                      {userName ? userName.charAt(0).toUpperCase() : (userEmail?.charAt(0).toUpperCase() || 'U')}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div
                          className="text-[13px] text-[#2d2d2d] truncate font-medium">{userName || userEmail || 'User'}</div>
                    </div>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="flex-shrink-0">
                      <path d="M6 8L3 5h6L6 8z"/>
                    </svg>
                  </button>
                  {userDropdownOpen && (
                      <div
                          className="absolute bottom-full left-0 mb-2 w-full bg-white border border-[#e0ddd4] rounded-lg shadow-lg py-1">
                        <div className="px-3 py-2 border-b border-[#e0ddd4]">
                          <div className="text-[13px] text-[#2d2d2d] font-medium truncate">{userName || 'User'}</div>
                          <div className="text-[11px] text-[#8b8b8b] truncate">{userEmail}</div>
                        </div>
                        <button onClick={() => router.push('/pricing')}
                                className="w-full text-left px-4 py-2 text-[14px] text-[#2d2d2d] hover:bg-[#dcdcdc] transition-colors">
                          Upgrade to Pro
                        </button>
                        <button onClick={handleLogout}
                                className="w-full px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50 transition-colors">
                          Logout
                        </button>
                      </div>
                  )}
                </div>
              </div>
            </>
        )}
      </aside>

      {/* Main chat area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-[#f7f5ef] border-b border-[#e0ddd4] px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🖼️</span>
            <h2 className="text-[15px] font-semibold text-text">
              {projectName || 'Image Generator'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#e0ddd4] rounded-lg">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="#d97757">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" fill="none"/>
                <text x="8" y="11" fontSize="8" textAnchor="middle" fill="currentColor">$</text>
              </svg>
              <CreditBalance userId={userId}/>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[800px] mx-auto px-6 py-8">
            {messages.length === 0 ? (
                <div className="text-center py-16">
                  <div
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#a78bfa] mx-auto mb-6 flex items-center justify-center text-3xl">🎨
                  </div>
                  <h3 className="text-[24px] font-normal text-[#2d2d2d] mb-2">Welcome to Image Ad Generator</h3>
                  <p className="text-[15px] text-[#6b6b6b]">Describe the advertising image you want to create...</p>
                </div>
            ) : (
                <div className="space-y-6">
                  {messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.type === 'text' ? (
                          <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'text-white bg-primary' : 'bg-white border border-[#e0ddd4] text-[#2d2d2d]'}`}>
                            <div className="text-[15px] leading-[1.6] prose prose-sm max-w-none">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          </div>
                        ) : (
                            <div className="w-[600px] relative group">
                              <div className="bg-white border border-[#e0ddd4] rounded-2xl overflow-hidden">
                                <div
                                    className="relative bg-[#f0eee8] w-full cursor-pointer overflow-hidden"
                                    style={{
                                      aspectRatio: msg.aspectRatio
                                          ? (msg.aspectRatio === 'square_hd' ? '1/1'
                                              : msg.aspectRatio === 'portrait_16_9' ? '9/16'
                                                  : msg.aspectRatio === 'landscape_16_9' ? '16/9'
                                                      : msg.aspectRatio === 'landscape_21_9' ? '21/9'
                                                          : msg.aspectRatio === 'landscape_4_3' ? '4/3'
                                                              : msg.aspectRatio === 'portrait_4_3' ? '3/4'
                                                                  : '16/9')
                                          : '16/9',
                                      minHeight: '300px'
                                    }}
                                    onClick={() => setLightboxImage(msg.imageUrl!)}
                                >
                                  <Image
                                      src={msg.imageUrl!}
                                      alt="Generated"
                                      fill
                                      className="object-contain"
                                      sizes="600px"
                                      priority
                                  />

                                  {/* ✅ Download & Delete Icons - Top Right */}
                                  <div
                                      className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          downloadImage(msg.imageUrl!, `image-${Date.now()}.png`)
                                        }}
                                        className="p-2 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-white transition-colors shadow-sm"
                                        title="Download"
                                    >
                                      <svg className="w-4 h-4 text-[#2d2d2d]" fill="none" viewBox="0 0 24 24"
                                           stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                      </svg>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          const imageToDelete = images.find(img => img.image_url === msg.imageUrl)
                                          if (imageToDelete) {
                                            deleteImage(imageToDelete.id)
                                          }
                                          setMessages(prev => prev.filter(m => m.id !== msg.id))
                                        }}
                                        className="p-2 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-red-50 transition-colors shadow-sm"
                                        title="Delete"
                                    >
                                      <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24"
                                           stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                                {msg.content && msg.content !== 'Image generated successfully!' && (
                                    <div className="p-3 border-t border-[#e0ddd4]">
                                      <p className="text-[13px] text-[#2d2d2d]">{msg.content}</p>
                                    </div>
                                )}
                              </div>
                            </div>
                        )}
                      </div>
                  ))}
                  {loading && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-[#e0ddd4] rounded-2xl px-4 py-3">
                          <div className="flex gap-1.5">
                            <div className="w-2 h-2 rounded-full animate-bounce bg-primary"/>
                            <div className="w-2 h-2 rounded-full animate-bounce delay-100 bg-primary"/>
                            <div className="w-2 h-2 rounded-full animate-bounce delay-200 bg-primary"/>
                          </div>
                        </div>
                      </div>
                  )}
                </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-[#e0ddd4] bg-[#f7f5ef] p-6">
          <div className="max-w-[800px] mx-auto">
            {/* Controls */}
            <div className="flex gap-2 mb-3 flex-wrap">

              {/* Quality Selector */}
              <div className="relative" ref={qualityDropdownRef}>
                <button
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e0ddd4] rounded-xl text-[13px] text-[#2d2d2d] hover:border-[#d97757] transition-all"
                    onClick={() => setQualityDropdownOpen(!qualityDropdownOpen)}
                >
                  ⚡ {quality === 'TURBO' ? 'Fast' : quality === 'BALANCED' ? 'Balanced' : 'Quality'}
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none">
                    <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
                {qualityDropdownOpen && (
                    <div
                        className="absolute bottom-full mb-2 bg-white border border-[#e0ddd4] rounded-xl shadow-lg w-52 z-50">
                      {[
                      { value: 'TURBO', label: 'Fast (Cheapest)', cost: '$0.03' },
                      { value: 'BALANCED', label: 'Balanced', cost: '$0.06' },
                      { value: 'QUALITY', label: 'Quality (Best)', cost: '$0.09' }
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setQuality(opt.value);
                          setQualityDropdownOpen(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-[13px] hover:bg-[#f7f5ef] first:rounded-t-xl last:rounded-b-xl ${quality === opt.value ? "text-[#d97757] font-medium" : ""}`}
                      >
                        <div>{opt.label}</div>
                        <div className="text-[11px] text-[#8b8b8b]">{opt.cost}/image</div>
                      </button>
                    ))}
                    </div>
                )}
              </div>

              {/* Number of Images */}
              <div className="relative" ref={numImagesDropdownRef}>
                <button
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e0ddd4] rounded-xl text-[13px] text-[#2d2d2d] hover:border-[#d97757] transition-all"
                    onClick={() => setNumImagesDropdownOpen(!numImagesDropdownOpen)}
                >
                  📸 {numImages} {numImages === 1 ? 'Image' : 'Images'}
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none">
                    <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
                {numImagesDropdownOpen && (
                    <div
                        className="absolute bottom-full mb-2 bg-white border border-[#e0ddd4] rounded-xl shadow-lg w-32 z-50">
                      {[1, 2, 3, 4].map((num) => (
                          <button
                              key={num}
                              onClick={() => {
                                setNumImages(num);
                                setNumImagesDropdownOpen(false);
                              }}
                              className={`block w-full text-left px-4 py-2 text-[13px] hover:bg-[#f7f5ef] first:rounded-t-xl last:rounded-b-xl ${numImages === num ? "text-[#d97757] font-medium" : ""}`}
                          >
                            {num} {num === 1 ? 'Image' : 'Images'}
                          </button>
                      ))}
                    </div>
                )}
              </div>

              {/* Size Selector */}
              <div className="relative" ref={sizeDropdownRef}>
                <button
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e0ddd4] rounded-xl text-[13px] text-[#2d2d2d] hover:border-[#d97757] transition-all"
                    onClick={() => setSizeDropdownOpen(!sizeDropdownOpen)}
                >
                  🖼️ {imageSize === 'square_hd' ? 'Square HD (1:1)'
                    : imageSize === 'portrait_16_9' ? 'Portrait (9:16)'
                        : imageSize === 'landscape_16_9' ? 'Landscape (16:9)'
                            : imageSize === 'landscape_21_9' ? 'Ultra Wide (21:9)'
                                : imageSize === 'landscape_4_3' ? 'Landscape (4:3)'
                                    : imageSize === 'portrait_4_3' ? 'Portrait (3:4)'
                                        : 'Square HD (1:1)'} {/* ✅ Add default fallback */}
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none">
                    <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
                {sizeDropdownOpen && (
                    <div
                        className="absolute bottom-full mb-2 bg-white border border-[#e0ddd4] rounded-xl shadow-lg w-52 z-50 max-h-64 overflow-y-auto">
                      {[
                        {value: 'square_hd', label: 'Square HD (1:1)'},
                        {value: 'portrait_16_9', label: 'Portrait (9:16)'},
                        {value: 'landscape_16_9', label: 'Landscape (16:9)'},
                        {value: 'landscape_21_9', label: 'Ultra Wide (21:9)'},
                        {value: 'landscape_4_3', label: 'Landscape (4:3)'},
                        {value: 'portrait_4_3', label: 'Portrait (3:4)'}
                      ].map((opt) => (
                          <button
                              key={opt.value}
                              onClick={() => {
                                setImageSize(opt.value);
                                setSizeDropdownOpen(false);
                              }}
                              className={`block w-full text-left px-4 py-2 text-[13px] hover:bg-[#f7f5ef] first:rounded-t-xl last:rounded-b-xl ${imageSize === opt.value ? "text-[#d97757] font-medium" : ""}`}
                          >
                            {opt.label}
                          </button>
                      ))}
                    </div>
                )}
              </div>

              {/* Cost Indicator */}
              <div className="ml-auto flex items-center gap-2 px-4 py-2 bg-[#f7f5ef] rounded-xl">
                <span className="text-[13px] text-[#8b8b8b]">Thread Cost:</span>
                <span className="text-[13px] font-semibold text-[#d97757]">${threadTotalCost.toFixed(2)}</span>
              </div>

            </div>

            {/* Prompt Input */}
            <div
                className="bg-white border-2 border-[#e0ddd4] rounded-2xl shadow-sm focus-within:border-[#d97757] transition-colors flex items-end gap-3 px-4 py-3">
              <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      generateImage()
                    }
                  }}
                  disabled={loading}
                  rows={1}
                  className="flex-1 outline-none text-[15px] text-[#2d2d2d] bg-transparent placeholder:text-[#999] resize-none max-h-[200px] overflow-y-auto flex items-center"
                  placeholder="Describe the advertising image you want to create..."
                  style={{minHeight: '24px', lineHeight: '24px', paddingTop: '0', paddingBottom: '0'}}
              />

              <button
                  onClick={generateImage}
                  disabled={loading || !prompt.trim()}
                  className="w-10 h-10 bg-[#d97757] hover:bg-[#c86545] text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M3 10h14m-6-6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                            strokeLinejoin="round"/>
                    </svg>
                )}
              </button>
            </div>

            {/* Info Text */}
            <p className="text-xs text-[#8b8b8b] mt-2 text-center">
              Press Enter to generate • Shift+Enter for new line
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}