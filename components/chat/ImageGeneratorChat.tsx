// components/chat/ImageGeneratorChat.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import CreditBalance from "@/components/CreditBalance"

interface ImageGenProps {
  userId: string
  projectId: string
  projectSlug: string
  projectName: string
  projectEmoji: string
  systemPrompt: string
  _projectColor: string
}

interface GeneratedImage {
  id: string
  url: string
  prompt: string
  created_at: string
}

export default function ImageGeneratorChat(props: ImageGenProps) {
  const [prompt, setPrompt] = useState("")
  const [style, setStyle] = useState('realistic')
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()
  const userDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserName(user.user_metadata?.full_name || user.user_metadata?.name || null)
        setUserEmail(user.email || null)
      }
    }
    fetchUser()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const generateImage = async () => {
    if (!prompt.trim()) return

    setLoading(true)

    try {
      // Call your image generation N8N webhook
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          style,
          aspectRatio,
          userId: props.userId,
          projectId: props.projectId
        })
      })

      const data = await response.json()

      if (data.success && data.imageUrl) {
        const newImage: GeneratedImage = {
          id: Date.now().toString(),
          url: data.imageUrl,
          prompt: prompt,
          created_at: new Date().toISOString()
        }
        setImages([newImage, ...images])
        setPrompt("")
      } else {
        alert('Image generation failed: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Image generation error:', error)
      alert('Failed to generate image')
    } finally {
      setLoading(false)
    }
  }

  const downloadImage = async (url: string, prompt: string) => {
    const response = await fetch(url)
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `${prompt.substring(0, 30)}.png`
    a.click()
    URL.revokeObjectURL(blobUrl)
  }

  return (
    <div className="flex h-screen bg-[#f7f5ef]">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-[260px]' : 'w-[60px]'} bg-[#f7f5ef] border-r border-[#e0ddd4] flex flex-col transition-all duration-300 flex-shrink-0`}>
        {!sidebarOpen && (
          <div className="flex flex-col h-full items-center py-3 gap-2">
            <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 rounded-lg hover:bg-[#e8e6df] transition-colors flex items-center justify-center text-[#6b6b6b]">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="4" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="8" y1="4" x2="8" y2="16" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </button>

            <button onClick={() => router.push('/dashboard')} className="w-10 h-10 rounded-lg hover:bg-[#e8e6df] transition-colors flex items-center justify-center text-[#6b6b6b]">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </button>

            <div className="flex-1"></div>

            <div className="relative" ref={userDropdownRef}>
              <button onClick={() => setUserDropdownOpen(!userDropdownOpen)} className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-medium hover:opacity-80 transition-opacity" style={{ backgroundColor: '#d97757' }}>
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
                <span className="text-xl">{props.projectEmoji}</span>
                <h2 className="text-[15px] font-semibold text-[#2d2d2d]">{props.projectName}</h2>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-[#e8e6df] rounded-lg transition-colors">
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
              <div className="text-[11px] text-[#8b8b8b] px-3 py-2 font-medium">RECENT GENERATIONS</div>
              {images.slice(0, 10).map(img => (
                <div key={img.id} className="mb-2 px-2">
                  <img src={img.url} alt={img.prompt} className="w-full rounded-lg border border-[#e0ddd4] hover:border-[#d97757] transition-colors cursor-pointer" onClick={() => window.open(img.url, '_blank')} />
                  <p className="text-[11px] text-[#6b6b6b] mt-1 truncate">{img.prompt}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-[#e0ddd4] p-3">
              <div className="relative" ref={userDropdownRef}>
                <button onClick={() => setUserDropdownOpen(!userDropdownOpen)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#e8e6df] transition-colors">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[13px] font-medium flex-shrink-0" style={{backgroundColor: '#d97757'}}>
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

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-[#f7f5ef] border-b border-[#e0ddd4] px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xl">{props.projectEmoji}</span>
            <h2 className="text-[15px] font-medium text-[#2d2d2d]">{props.projectName}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#e0ddd4] rounded-lg">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="#d97757">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" fill="none"/>
                <text x="8" y="11" fontSize="8" textAnchor="middle" fill="currentColor">$</text>
              </svg>
              <CreditBalance userId={props.userId}/>
            </div>
          </div>
        </header>

        {/* Generation Controls */}
        <div className="border-b border-[#e0ddd4] bg-white px-6 py-4">
          <div className="max-w-[800px] mx-auto">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[13px] font-medium text-[#6b6b6b] mb-2">Style</label>
                <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full px-3 py-2 border border-[#e0ddd4] rounded-lg text-[14px] bg-white">
                  <option value="realistic">Realistic</option>
                  <option value="artistic">Artistic</option>
                  <option value="cartoon">Cartoon</option>
                  <option value="3d">3D Render</option>
                  <option value="anime">Anime</option>
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#6b6b6b] mb-2">Aspect Ratio</label>
                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full px-3 py-2 border border-[#e0ddd4] rounded-lg text-[14px] bg-white">
                  <option value="1:1">Square (1:1)</option>
                  <option value="16:9">Landscape (16:9)</option>
                  <option value="9:16">Portrait (9:16)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1200px] mx-auto">
            {images.length === 0 && !loading && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center text-3xl">{props.projectEmoji}</div>
                <h3 className="text-[24px] font-normal text-[#2d2d2d] mb-2">Generate Your First Image</h3>
                <p className="text-[15px] text-[#6b6b6b]">Describe what you want to see and AI will create it</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {images.map(img => (
                <div key={img.id} className="bg-white border border-[#e0ddd4] rounded-lg overflow-hidden hover:border-[#d97757] transition-all">
                  <img src={img.url} alt={img.prompt} className="w-full aspect-square object-cover" />
                  <div className="p-4">
                    <p className="text-[14px] text-[#2d2d2d] mb-3">{img.prompt}</p>
                    <div className="flex gap-2">
                      <button onClick={() => downloadImage(img.url, img.prompt)} className="flex-1 px-3 py-2 bg-[#d97757] hover:bg-[#c86545] text-white rounded-lg text-[13px] font-medium transition-colors">
                        Download
                      </button>
                      <button onClick={() => window.open(img.url, '_blank')} className="px-3 py-2 border border-[#e0ddd4] hover:bg-[#f5f5f5] rounded-lg text-[13px] transition-colors">
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {loading && (
              <div className="flex justify-center py-12">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-[#d97757] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-[15px] text-[#6b6b6b]">Generating your image...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Prompt Input */}
        <div className="border-t border-[#e0ddd4] bg-[#f7f5ef] p-6">
          <div className="max-w-[800px] mx-auto">
            <div className="bg-white border-2 border-[#e0ddd4] rounded-2xl shadow-sm focus-within:border-[#d97757] transition-colors flex items-center gap-2 px-4 py-3">
              <textarea
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
                placeholder="Describe the image you want to generate..."
                style={{minHeight: '24px'}}
              />

              <button onClick={generateImage} disabled={loading || !prompt.trim()} className="w-10 h-10 bg-[#d97757] hover:bg-[#c86545] text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 15V5M5 10l5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}