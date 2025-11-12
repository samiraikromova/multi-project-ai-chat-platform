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
  imageUrl?: string
}

export default function ImageGeneratorChat({ userId, projectId, projectSlug, projectName }: ImageGeneratorChatProps) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [quality, setQuality] = useState('BALANCED')
  const [model, setModel] = useState('Ideogram')
  const [numImages, setNumImages] = useState(1)
  const [imageSize, setImageSize] = useState('landscape_16_9')
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('imageGenSidebarOpen')
      return saved !== null ? JSON.parse(saved) : true
    }
    return true
  })
  const [qualityDropdownOpen, setQualityDropdownOpen] = useState(false)
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [numImagesDropdownOpen, setNumImagesDropdownOpen] = useState(false)
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)
  const [deleteMenuOpen, setDeleteMenuOpen] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const deleteMenuRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    localStorage.setItem('imageGenSidebarOpen', JSON.stringify(sidebarOpen))
  }, [sidebarOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) setUserDropdownOpen(false)
      if (deleteMenuRef.current && !deleteMenuRef.current.contains(event.target as Node)) setDeleteMenuOpen(null)
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
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [prompt])

  useEffect(() => {
    const channel = supabase
      .channel('generated-images-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'generated_images',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          const newImage = payload.new as GeneratedImage
          setImages(prev => [newImage, ...prev])
          // Add image message to chat
          setMessages(prev => [...prev, {
            id: `img-${Date.now()}`,
            role: 'assistant',
            content: 'Image generated successfully!',
            type: 'image',
            imageUrl: newImage.image_url
          }])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, supabase])

  const loadImages = async () => {
    const { data } = await supabase
      .from('generated_images')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) {
      setImages(data)
    }
  }

  const generateImage = async () => {
    if (!prompt.trim()) return

    setLoading(true)

    // Add user message immediately
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      type: 'text'
    }
    setMessages(prev => [...prev, userMsg])

    const currentPrompt = prompt
    setPrompt("")

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentPrompt,
          userId,
          projectId,
          projectSlug,
          model,
          quality,
          numImages,
          imageSize
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed')
      }

      if (data.isTextResponse) {
        // This is a clarification message
        setMessages(prev => [...prev, {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          type: 'text'
        }])
      }
      // If image generated, it will appear via real-time subscription
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
      'Flux': { 'flux-1': 0.025, 'flux-1.1-pro': 0.04, 'flux-1.1-pro-ultra': 0.06 }
    }
    const cost = pricing[model]?.[quality] || 0.06
    return (cost * numImages).toFixed(3)
  }

  return (
    <div className="flex h-screen bg-[#f7f5ef]">
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
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-[#e8e6df] rounded-lg transition-colors" title="Close sidebar">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                  <rect x="3" y="4" width="14" height="12" rx="1.5" strokeWidth="1.5"/>
                  <line x1="12" y1="4" x2="12" y2="16" strokeWidth="1.5"/>
                </svg>
              </button>
            </div>

            <div className="p-3 space-y-2">
              <button onClick={() => router.push('/dashboard')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#e8e6df] transition-colors text-[13px] text-[#6b6b6b]">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M14 8H2M6 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                All Projects
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2">
              {images.length > 0 && (
                <div className="text-[11px] text-[#8b8b8b] px-3 py-2 font-medium">RECENTLY GENERATED</div>
              )}
              {images.filter(img => img.image_url.startsWith('http')).map(image => (
                <div key={image.id} className="relative group mb-2">
                  <button
                    onClick={() => setSelectedImage(image)}
                    className={`w-full text-left rounded-lg overflow-hidden transition-all ${selectedImage?.id === image.id ? 'ring-2 ring-[#7c3aed]' : 'hover:ring-2 hover:ring-[#e0ddd4]'}`}
                  >
                    <div className="aspect-video relative bg-[#f0eee8]">
                      <Image src={image.image_url} alt={image.prompt} fill className="object-cover" />
                    </div>
                    <div className="p-2 bg-white border-x border-b border-[#e0ddd4]">
                      <p className="text-[11px] text-[#2d2d2d] line-clamp-2">{image.prompt}</p>
                      <p className="text-[9px] text-[#8b8b8b] mt-1">{new Date(image.created_at).toLocaleDateString()}</p>
                    </div>
                  </button>
                  {selectedImage?.id === image.id && (
                    <div className="absolute right-2 top-2">
                      <button onClick={() => setDeleteMenuOpen(deleteMenuOpen === image.id ? null : image.id)} className="p-1 bg-white/90 backdrop-blur-sm hover:bg-white rounded transition-colors">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                          <circle cx="3" cy="7" r="1"/>
                          <circle cx="7" cy="7" r="1"/>
                          <circle cx="11" cy="7" r="1"/>
                        </svg>
                      </button>
                      {deleteMenuOpen === image.id && (
                        <div ref={deleteMenuRef} className="absolute right-0 top-full mt-1 bg-white border border-[#e0ddd4] rounded-lg shadow-lg py-1 w-32 z-50">
                          <button onClick={() => { downloadImage(image.image_url, `${image.id}.png`); setDeleteMenuOpen(null); }} className="w-full px-3 py-1.5 text-left text-[13px] hover:bg-[#f5f5f5]">
                            Download
                          </button>
                          <button onClick={() => deleteImage(image.id)} className="w-full px-3 py-1.5 text-left text-[13px] text-red-600 hover:bg-red-50">
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-[#e0ddd4] p-3">
              <div className="relative" ref={userDropdownRef}>
                <button onClick={() => setUserDropdownOpen(!userDropdownOpen)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#e8e6df] transition-colors">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium hover:brightness-110 transition bg-primary">
                    {userName ? userName.charAt(0).toUpperCase() : (userEmail?.charAt(0).toUpperCase() || 'U')}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-[13px] text-[#2d2d2d] truncate font-medium">{userName || userEmail || 'User'}</div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="flex-shrink-0">
                    <path d="M6 8L3 5h6L6 8z"/>
                  </svg>
                </button>
                {userDropdownOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-full bg-white border border-[#e0ddd4] rounded-lg shadow-lg py-1">
                    <div className="px-3 py-2 border-b border-[#e0ddd4]">
                      <div className="text-[13px] text-[#2d2d2d] font-medium truncate">{userName || 'User'}</div>
                      <div className="text-[11px] text-[#8b8b8b] truncate">{userEmail}</div>
                    </div>
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
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'text-white bg-primary' : 'bg-white border border-[#e0ddd4] text-[#2d2d2d]'}`}>
                              <div className="text-[15px] leading-[1.6] prose prose-sm max-w-none">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                              </div>
                            </div>
                        ) : (
                            <div className="max-w-[85%]">
                              <div className="bg-white border border-[#e0ddd4] rounded-2xl overflow-hidden">
                                <div className="aspect-video relative bg-[#f0eee8]">
                                <Image src={msg.imageUrl!} alt="Generated" fill className="object-contain"/>
                                </div>
                                <div className="p-3">
                                  <p className="text-[13px] text-[#2d2d2d]">{msg.content}</p>
                                </div>
                              </div>
                            </div>
                        )}
                      </div>
                  ))}
                  {loading && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-[#e0ddd4] rounded-2xl px-4 py-3">
                          <div className="flex gap-1.5">
                            <div className="w-2 h-2 rounded-full animate-bounce bg-primary border border-border text-text"/>
                            <div className="w-2 h-2 rounded-full animate-bounce delay-100 bg-primary border border-border text-text"/>
                            <div className="w-2 h-2 rounded-full animate-bounce delay-200 bg-primary border border-border text-text"/>
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
              {/* Model Selector */}
              <div className="relative">
                <button
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e0ddd4] rounded-xl text-[13px] text-[#2d2d2d] hover:border-[#d97757] transition-all"
                    onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                >
                  🎨 {model}
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none">
                    <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
                {modelDropdownOpen && (
                    <div
                        className="absolute bottom-full mb-2 bg-white border border-[#e0ddd4] rounded-xl shadow-lg w-44 z-50">
                      {["Ideogram", "Flux"].map((opt) => (
                          <button
                              key={opt}
                              onClick={() => {
                                setModel(opt);
                                setModelDropdownOpen(false);
                              }}
                              className={`block w-full text-left px-4 py-2 text-[13px] hover:bg-[#f7f5ef] first:rounded-t-xl last:rounded-b-xl ${model === opt ? "text-[#d97757] font-medium" : ""}`}
                          >
                            {opt}
                          </button>
                      ))}
                    </div>
                )}
              </div>

              {/* Quality Selector */}
              <div className="relative">
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
                        {value: 'TURBO', label: 'Fast (Cheapest)', cost: model === 'Ideogram' ? '$0.03' : '$0.025'},
                        {value: 'BALANCED', label: 'Balanced', cost: model === 'Ideogram' ? '$0.06' : '$0.04'},
                        {value: 'QUALITY', label: 'Quality (Best)', cost: model === 'Ideogram' ? '$0.09' : '$0.06'}
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
              <div className="relative">
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
              <div className="relative">
                <button
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e0ddd4] rounded-xl text-[13px] text-[#2d2d2d] hover:border-[#d97757] transition-all"
                    onClick={() => setSizeDropdownOpen(!sizeDropdownOpen)}
                >
                  🖼️ {imageSize.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
                <span className="text-[13px] text-[#8b8b8b]">Cost:</span>
                <span className="text-[13px] font-semibold text-[#d97757]">${calculateCost()}</span>
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
                  className="flex-1 outline-none text-[15px] text-[#2d2d2d] bg-transparent placeholder:text-[#999] resize-none max-h-[200px] overflow-y-auto"
                  placeholder="Describe the advertising image you want to create..."
                  style={{minHeight: '24px'}}
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
                      <path d="M10 4v12m6-6H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
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