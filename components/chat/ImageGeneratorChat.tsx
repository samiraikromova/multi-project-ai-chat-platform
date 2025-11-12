'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

interface ImageGeneratorChatProps {
  userId: string
  projectId: string
  projectSlug: string
}

interface GeneratedImage {
  id: string
  prompt: string
  image_url: string
  style: string
  aspect_ratio: string
  created_at: string
}

export default function ImageGeneratorChat({ userId, projectId, projectSlug }: ImageGeneratorChatProps) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [credits, setCredits] = useState<number>(0)
  const [quality, setQuality] = useState('BALANCED')
  const [model, setModel] = useState('Ideogram')
  const [numImages, setNumImages] = useState(1)
  const [imageSize, setImageSize] = useState('landscape_16_9')
  const [qualityDropdownOpen, setQualityDropdownOpen] = useState(false)
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [numImagesDropdownOpen, setNumImagesDropdownOpen] = useState(false)
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()

  // Load user credits
  useEffect(() => {
    loadCredits()
  }, [userId])

  // Load generated images on mount
  useEffect(() => {
    loadImages()
  }, [projectId])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [prompt])

  // Real-time subscription for new images
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
          setImages(prev => [payload.new as GeneratedImage, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, supabase])

  // Real-time subscription for credit updates
  useEffect(() => {
    const channel = supabase
      .channel('user-credits-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          if (payload.new && 'credits' in payload.new) {
            setCredits(Number(payload.new.credits))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase])

  const loadCredits = async () => {
    const { data } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single()
    
    if (data) {
      setCredits(Number(data.credits))
    }
  }

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

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
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

      if (data.success && data.imageUrl) {
        // Images will be added via real-time subscription
        setPrompt("")
        // Optionally show success message
      } else {
        alert('Image generation failed: ' + (data.error || 'Unknown error'))
      }
    } catch (error: any) {
      console.error('Image generation error:', error)
      alert(error.message || 'Failed to generate image')
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

  const calculateCost = () => {
    const pricing: Record<string, Record<string, number>> = {
      'Ideogram': { 'TURBO': 0.03, 'BALANCED': 0.06, 'QUALITY': 0.09 },
      'Flux': { 'flux-1': 0.025, 'flux-1.1-pro': 0.04, 'flux-1.1-pro-ultra': 0.06 }
    }
    const cost = pricing[model]?.[quality] || 0.06
    return (cost * numImages).toFixed(3)
  }

  return (
    <div className="flex h-screen bg-[#faf9f6]">
      {/* Sidebar - Recently Generated */}
      <div className="w-80 border-r border-[#e0ddd4] bg-white overflow-y-auto">
        <div className="p-6 border-b border-[#e0ddd4]">
          <h2 className="text-lg font-semibold text-[#2d2d2d]">Recently Generated</h2>
          <p className="text-sm text-[#8b8b8b] mt-1">{images.length} images</p>
        </div>
        
        <div className="p-4 space-y-3">
          {images.map((image) => (
              <div
                  key={image.id}
                  onClick={() => setSelectedImage(image)}
                  className={`group relative cursor-pointer rounded-xl overflow-hidden transition-all ${
                      selectedImage?.id === image.id
                          ? 'ring-2 ring-[#d97757]'
                          : 'hover:ring-2 hover:ring-[#e0ddd4]'
                  }`}
              >
                <div className="aspect-video relative bg-[#f7f5ef]">
                  {image.image_url?.startsWith('http') ? (
                      <Image
                          src={image.image_url}
                          alt={image.prompt}
                          fill
                          className="object-cover"
                      />
                  ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <p>Invalid image URL</p>
                      </div>
                  )}
                </div>
                <div className="p-3 bg-white">
                  <p className="text-xs text-[#2d2d2d] line-clamp-2 mb-1">
                    {image.prompt}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-[#8b8b8b]">
                    <span>{image.style} • {image.aspect_ratio}</span>
                    <span>{new Date(image.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Hover Actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button
                      onClick={(e) => {
                        e.stopPropagation()
                        downloadImage(image.image_url, `${image.id}.png`)
                      }}
                      className="p-2 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-white transition-colors"
                      title="Download"
                  >
                    <svg className="w-4 h-4 text-[#2d2d2d]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                  </button>
                  <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteImage(image.id)
                      }}
                      className="p-2 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete"
                  >
                    <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-[#e0ddd4] bg-white px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-[#2d2d2d]">Image Ad Generator</h1>
              <p className="text-sm text-[#8b8b8b] mt-1">Create stunning advertising images with AI</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-[#f7f5ef] rounded-xl">
                <span className="text-sm text-[#2d2d2d] font-medium">{credits.toFixed(2)} credits</span>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {selectedImage ? (
            <div className="max-w-5xl mx-auto">
              <div className="bg-white rounded-2xl shadow-sm border border-[#e0ddd4] overflow-hidden">
                <div className="relative bg-[#f7f5ef]" style={{ aspectRatio: '16/9' }}>
                  <Image
                    src={selectedImage.image_url}
                    alt={selectedImage.prompt}
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[#2d2d2d] mb-2">Prompt</h3>
                      <p className="text-sm text-[#5f5f5f] leading-relaxed">{selectedImage.prompt}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-[#e0ddd4]">
                    <div className="flex gap-6 text-xs text-[#8b8b8b]">
                      <div>
                        <span className="font-medium">Model:</span> {selectedImage.style}
                      </div>
                      <div>
                        <span className="font-medium">Size:</span> {selectedImage.aspect_ratio}
                      </div>
                      <div>
                        <span className="font-medium">Created:</span> {new Date(selectedImage.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadImage(selectedImage.image_url, `${selectedImage.id}.png`)}
                        className="px-4 py-2 bg-[#2d2d2d] text-white rounded-xl hover:bg-[#1a1a1a] transition-colors text-sm font-medium"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => deleteImage(selectedImage.id)}
                        className="px-4 py-2 border border-[#e0ddd4] text-[#2d2d2d] rounded-xl hover:border-red-300 hover:text-red-600 transition-colors text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-[#f7f5ef] flex items-center justify-center">
                  <svg className="w-12 h-12 text-[#d97757]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[#2d2d2d] mb-2">No image selected</h3>
                <p className="text-[#8b8b8b]">Select an image from the sidebar or generate a new one</p>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-[#e0ddd4] bg-white p-6">
          <div className="max-w-5xl mx-auto">
            {/* Controls Row */}
            <div className="flex gap-3 mb-3 flex-wrap">
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
                  <div className="absolute bottom-full mb-2 bg-white border border-[#e0ddd4] rounded-xl shadow-lg w-44 z-50">
                    {["Ideogram", "Flux"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => { setModel(opt); setModelDropdownOpen(false); }}
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
                  <div className="absolute bottom-full mb-2 bg-white border border-[#e0ddd4] rounded-xl shadow-lg w-52 z-50">
                    {[
                      { value: 'TURBO', label: 'Fast (Cheapest)', cost: model === 'Ideogram' ? '$0.03' : '$0.025' },
                      { value: 'BALANCED', label: 'Balanced', cost: model === 'Ideogram' ? '$0.06' : '$0.04' },
                      { value: 'QUALITY', label: 'Quality (Best)', cost: model === 'Ideogram' ? '$0.09' : '$0.06' }
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setQuality(opt.value); setQualityDropdownOpen(false); }}
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
                  <div className="absolute bottom-full mb-2 bg-white border border-[#e0ddd4] rounded-xl shadow-lg w-32 z-50">
                    {[1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        onClick={() => { setNumImages(num); setNumImagesDropdownOpen(false); }}
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
                  <div className="absolute bottom-full mb-2 bg-white border border-[#e0ddd4] rounded-xl shadow-lg w-52 z-50 max-h-64 overflow-y-auto">
                    {[
                      { value: 'square_hd', label: 'Square HD (1:1)' },
                      { value: 'portrait_16_9', label: 'Portrait (9:16)' },
                      { value: 'landscape_16_9', label: 'Landscape (16:9)' },
                      { value: 'landscape_21_9', label: 'Ultra Wide (21:9)' },
                      { value: 'landscape_4_3', label: 'Landscape (4:3)' },
                      { value: 'portrait_4_3', label: 'Portrait (3:4)' }
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setImageSize(opt.value); setSizeDropdownOpen(false); }}
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
            <div className="bg-white border-2 border-[#e0ddd4] rounded-2xl shadow-sm focus-within:border-[#d97757] transition-colors flex items-end gap-3 px-4 py-3">
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
                style={{ minHeight: '24px' }}
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
                    <path d="M10 4v12m6-6H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
      </div>
    </div>
  )
}