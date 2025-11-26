"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

interface Video {
  id: string
  title: string
  description: string
  vdocipher_id: string
  category: 'course' | 'call_recording'
  module: string
  duration: string
  thumbnail_url?: string
  order_index: number
  created_at: string
}

interface Module {
  name: string
  videos: Video[]
}

export default function CoursesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<'course' | 'call_recording'>('course')
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [playbackInfo, setPlaybackInfo] = useState<{otp: string, playbackInfo: string} | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)

  useEffect(() => {
    checkAdmin()
    loadVideos()
  }, [selectedCategory])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('subscription_tier')
        .eq('id', user.id)
        .single()

      setIsAdmin(data?.subscription_tier === 'admin')
    }
  }

  const loadVideos = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('course_videos')
      .select('*')
      .eq('category', selectedCategory)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('Error loading videos:', error)
    } else if (data) {
      // Group by module
      const grouped: Record<string, Video[]> = {}
      data.forEach((video: Video) => {
        if (!grouped[video.module]) {
          grouped[video.module] = []
        }
        grouped[video.module].push(video)
      })

      const modulesArray = Object.entries(grouped).map(([name, videos]) => ({
        name,
        videos
      }))

      setModules(modulesArray)
    }
    setLoading(false)
  }

  const getVdoCipherOTP = async (videoId: string) => {
    try {
      const response = await fetch('/api/vdocipher/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId })
      })

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error getting OTP:', error)
      return null
    }
  }

  const playVideo = async (video: Video) => {
  setSelectedVideo(video)
  const otpData = await getVdoCipherOTP(video.vdocipher_id)
  if (otpData && typeof otpData !== 'string') {
    setPlaybackInfo(otpData)
  }
}

  const saveVideo = async (videoData: Partial<Video>) => {
    if (editingVideo?.id) {
      // Update
      await supabase
        .from('course_videos')
        .update(videoData)
        .eq('id', editingVideo.id)
    } else {
      // Insert
      await supabase
        .from('course_videos')
        .insert({
          ...videoData,
          category: selectedCategory
        })
    }

    setShowAdminModal(false)
    setEditingVideo(null)
    loadVideos()
  }

  const deleteVideo = async (id: string) => {
    if (!confirm('Delete this video?')) return

    await supabase
      .from('course_videos')
      .delete()
      .eq('id', id)

    loadVideos()
  }

  return (
    <div className="min-h-screen bg-[#f7f5ef]">
      {/* Header */}
      <header className="border-b border-[#e0ddd4] bg-white">
        <div className="max-w-[1400px] mx-auto px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-[14px] text-[#6b6b6b] hover:text-[#2d2d2d]"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Back to Dashboard
            </button>
          </div>
          <h1 className="text-[18px] font-semibold text-[#2d2d2d]">
            {selectedCategory === 'course' ? 'Course Library' : 'Call Recordings'}
          </h1>
          <div className="w-[120px]">
            {isAdmin && (
              <button
                onClick={() => {
                  setEditingVideo(null)
                  setShowAdminModal(true)
                }}
                className="px-4 py-2 bg-[#d97757] text-white rounded-lg hover:bg-[#c86545] text-[13px]"
              >
                Add Video
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-8 py-12">
        {/* Category Selector */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setSelectedCategory('course')}
            className={`px-6 py-2 rounded-lg text-[14px] font-medium transition-colors ${
              selectedCategory === 'course'
                ? 'bg-[#d97757] text-white'
                : 'bg-white border border-[#e0ddd4] text-[#6b6b6b] hover:border-[#d97757]'
            }`}
          >
            📚 Course Videos
          </button>
          <button
            onClick={() => setSelectedCategory('call_recording')}
            className={`px-6 py-2 rounded-lg text-[14px] font-medium transition-colors ${
              selectedCategory === 'call_recording'
                ? 'bg-[#d97757] text-white'
                : 'bg-white border border-[#e0ddd4] text-[#6b6b6b] hover:border-[#d97757]'
            }`}
          >
            📞 Call Recordings
          </button>
        </div>

        {/* Modules */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#d97757]"></div>
          </div>
        ) : modules.length === 0 ? (
          <div className="text-center py-12 text-[#6b6b6b]">
            No videos yet. {isAdmin && 'Click "Add Video" to get started.'}
          </div>
        ) : (
          modules.map(module => (
            <div key={module.name} className="mb-8">
              <h2 className="text-[20px] font-semibold text-[#2d2d2d] mb-4">{module.name}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {module.videos.map(video => (
                  <div
                    key={video.id}
                    className="bg-white border border-[#e0ddd4] rounded-lg overflow-hidden hover:border-[#d97757] transition-all hover:shadow-lg"
                  >
                    <div
                      className="relative cursor-pointer"
                      onClick={() => playVideo(video)}
                    >
                      {video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt={video.title}
                          className="w-full h-[200px] object-cover"
                        />
                      ) : (
                        <div className="w-full h-[200px] bg-gradient-to-br from-[#d97757] to-[#c86545] flex items-center justify-center">
                          <svg width="64" height="64" viewBox="0 0 64 64" fill="white" opacity="0.5">
                            <path d="M20 16v32l28-16z"/>
                          </svg>
                        </div>
                      )}
                      {video.duration && (
                        <div className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-[12px] font-medium">
                          {video.duration}
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/10 transition-colors">
                        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="#d97757">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-[16px] font-semibold text-[#2d2d2d] mb-2">
                        {video.title}
                      </h3>
                      <p className="text-[14px] text-[#6b6b6b] line-clamp-2">
                        {video.description}
                      </p>
                      {isAdmin && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingVideo(video)
                              setShowAdminModal(true)
                            }}
                            className="text-[12px] text-[#d97757] hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteVideo(video.id)
                            }}
                            className="text-[12px] text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Video Player Modal */}
      {selectedVideo && playbackInfo && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setSelectedVideo(null)
            setPlaybackInfo(null)
          }}
        >
          <div
            className="bg-white rounded-lg overflow-hidden max-w-[1200px] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-[#e0ddd4]">
              <h3 className="text-[18px] font-semibold text-[#2d2d2d]">
                {selectedVideo.title}
              </h3>
              <button
                onClick={() => {
                  setSelectedVideo(null)
                  setPlaybackInfo(null)
                }}
                className="p-2 hover:bg-[#f5f5f5] rounded-lg transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div
                className="bg-black w-[calc(100%-40px)] max-w-[1180px] mx-auto aspect-video rounded-md overflow-hidden">
              <iframe
                  src={`https://player.vdocipher.com/v2/?otp=${playbackInfo.otp}&playbackInfo=${playbackInfo.playbackInfo}`}
                  className="w-full h-full"
                  allow="encrypted-media"
                  allowFullScreen
              />
            </div>

            {selectedVideo.description && (
                <div className="p-4">
                  <p className="text-[14px] text-[#6b6b6b]">
                    {selectedVideo.description}
                  </p>
                </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Modal */}
      {showAdminModal && (
        <AdminVideoModal
          video={editingVideo}
          category={selectedCategory}
          onSave={saveVideo}
          onClose={() => {
            setShowAdminModal(false)
            setEditingVideo(null)
          }}
        />
      )}
    </div>
  )
}

function AdminVideoModal({
  video,
  category,
  onSave,
  onClose
}: {
  video: Video | null
  category: 'course' | 'call_recording'
  onSave: (data: Partial<Video>) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    title: video?.title || '',
    description: video?.description || '',
    vdocipher_id: video?.vdocipher_id || '',
    module: video?.module || (category === 'course' ? 'Module 1' : 'Q1 2025'),
    duration: video?.duration || '',
    thumbnail_url: video?.thumbnail_url || '',
    order_index: video?.order_index || 0
  })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-[20px] font-semibold mb-4">
          {video ? 'Edit Video' : 'Add New Video'}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-[14px] font-medium mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-[#e0ddd4] rounded-lg"
            />
          </div>

          <div>
            <label className="block text-[14px] font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-[#e0ddd4] rounded-lg"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-[14px] font-medium mb-1">VdoCipher Video ID</label>
            <input
              type="text"
              value={formData.vdocipher_id}
              onChange={(e) => setFormData({ ...formData, vdocipher_id: e.target.value })}
              className="w-full px-3 py-2 border border-[#e0ddd4] rounded-lg"
              placeholder="e.g., 5f8d9e3c4b2a1d6e7f8a9b0c"
            />
          </div>

          <div>
            <label className="block text-[14px] font-medium mb-1">
              {category === 'course' ? 'Module' : 'Period'}
            </label>
            <input
              type="text"
              value={formData.module}
              onChange={(e) => setFormData({ ...formData, module: e.target.value })}
              className="w-full px-3 py-2 border border-[#e0ddd4] rounded-lg"
              placeholder={category === 'course' ? 'e.g., Module 1' : 'e.g., Q1 2025'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[14px] font-medium mb-1">Duration</label>
              <input
                type="text"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full px-3 py-2 border border-[#e0ddd4] rounded-lg"
                placeholder="e.g., 45:32"
              />
            </div>

            <div>
              <label className="block text-[14px] font-medium mb-1">Order</label>
              <input
                type="number"
                value={formData.order_index}
                onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-[#e0ddd4] rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-[14px] font-medium mb-1">Thumbnail URL (optional)</label>
            <input
              type="text"
              value={formData.thumbnail_url}
              onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
              className="w-full px-3 py-2 border border-[#e0ddd4] rounded-lg"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => onSave(formData)}
            className="flex-1 px-4 py-2 bg-[#d97757] text-white rounded-lg hover:bg-[#c86545]"
          >
            Save Video
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#e0ddd4] rounded-lg hover:bg-[#f5f5f5]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}