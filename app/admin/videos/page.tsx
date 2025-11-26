"use client"

import { useEffect, useState } from "react"
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
}

export default function AdminVideosPage() {
  const supabase = createClient()
  const router = useRouter()
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    vdocipher_id: '',
    category: 'course' as 'course' | 'call_recording',
    module: '',
    duration: '',
    thumbnail_url: '',
    order_index: "0"
  })

  useEffect(() => {
    loadVideos()
  }, [])

  const loadVideos = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('course_videos')
      .select('*')
      .order('category', { ascending: true })
      .order('order_index', { ascending: true })

    if (data) setVideos(data)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      ...formData,
      order_index: Number(formData.order_index)
    }

  const { error } = await supabase
    .from('course_videos')
    .insert([payload])


    if (error) {
      alert('Error: ' + error.message)
    } else {
      setShowModal(false)
      setFormData({
        title: '',
        description: '',
        vdocipher_id: '',
        category: 'course',
        module: '',
        duration: '',
        thumbnail_url: '',
        order_index: "0"
      })
      loadVideos()
    }
  }

  const deleteVideo = async (id: string) => {
    if (!confirm('Delete this video?')) return

    const { error } = await supabase
      .from('course_videos')
      .delete()
      .eq('id', id)

    if (!error) loadVideos()
  }

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-[14px] text-[#6b6b6b] hover:text-[#2d2d2d] mb-4"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-semibold text-[#2d2d2d]">Video Management</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-[#d97757] text-white rounded-lg hover:bg-[#c86545]"
        >
          Add New Video
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#d97757]"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Course Videos */}
          <div>
            <h2 className="text-lg font-semibold mb-4">📚 Course Videos</h2>
            <div className="bg-white border border-[#e0ddd4] rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#f7f5ef]">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[#555]">Title</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[#555]">Module</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[#555]">VdoCipher ID</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[#555]">Duration</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[#555]">Order</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[#555]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.filter(v => v.category === 'course').map((video) => (
                    <tr key={video.id} className="border-t border-[#eee]">
                      <td className="py-3 px-4 text-sm">{video.title}</td>
                      <td className="py-3 px-4 text-sm text-[#6b6b6b]">{video.module}</td>
                      <td className="py-3 px-4 text-sm font-mono text-[#6b6b6b]">{video.vdocipher_id.substring(0, 12)}...</td>
                      <td className="py-3 px-4 text-sm">{video.duration}</td>
                      <td className="py-3 px-4 text-sm">{video.order_index}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => deleteVideo(video.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Call Recordings */}
          <div>
            <h2 className="text-lg font-semibold mb-4">📞 Call Recordings</h2>
            <div className="bg-white border border-[#e0ddd4] rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#f7f5ef]">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[#555]">Title</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[#555]">Period</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[#555]">VdoCipher ID</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[#555]">Duration</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[#555]">Order</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[#555]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.filter(v => v.category === 'call_recording').map((video) => (
                    <tr key={video.id} className="border-t border-[#eee]">
                      <td className="py-3 px-4 text-sm">{video.title}</td>
                      <td className="py-3 px-4 text-sm text-[#6b6b6b]">{video.module}</td>
                      <td className="py-3 px-4 text-sm font-mono text-[#6b6b6b]">{video.vdocipher_id.substring(0, 12)}...</td>
                      <td className="py-3 px-4 text-sm">{video.duration}</td>
                      <td className="py-3 px-4 text-sm">{video.order_index}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => deleteVideo(video.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Video Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Add New Video</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as 'course' | 'call_recording' })}
                  className="w-full px-3 py-2 border border-[#e0ddd4] rounded-lg"
                  required
                >
                  <option value="course">📚 Course Video</option>
                  <option value="call_recording">📞 Call Recording</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e0ddd4] rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e0ddd4] rounded-lg"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">VdoCipher Video ID</label>
                <input
                  type="text"
                  value={formData.vdocipher_id}
                  onChange={(e) => setFormData({ ...formData, vdocipher_id: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e0ddd4] rounded-lg font-mono"
                  placeholder="e.g., 5f8d9e3c4b2a1d6e7f8a9b0c"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {formData.category === 'course' ? 'Module' : 'Period'}
                </label>
                <input
                  type="text"
                  value={formData.module}
                  onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e0ddd4] rounded-lg"
                  placeholder={formData.category === 'course' ? 'e.g., Module 1: Foundations' : 'e.g., January 2025'}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Duration</label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e0ddd4] rounded-lg"
                    placeholder="e.g., 45:32"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Order</label>
                  <input
                        type="number"
                        value={formData.order_index}
                        onChange={(e) =>
                        setFormData({
                        ...formData,
                        order_index: e.target.value // always a string
                      })
                      }
                        className="w-full px-3 py-2 border border-[#e0ddd4] rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Thumbnail URL (optional)</label>
                <input
                  type="text"
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e0ddd4] rounded-lg"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#d97757] text-white rounded-lg hover:bg-[#c86545]"
                >
                  Add Video
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-[#e0ddd4] rounded-lg hover:bg-[#f5f5f5]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}