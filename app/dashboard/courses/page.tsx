"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Course {
  id: string
  title: string
  description: string
  duration: string
  thumbnail: string
  videoUrl: string
  category: string
}

export default function CoursesPage() {
  const router = useRouter()
  const [selectedVideo, setSelectedVideo] = useState<Course | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Example courses - replace with Supabase fetch
  const courses: Course[] = [
    {
      id: '1',
      title: 'Facebook Ads Mastery',
      description: 'Learn advanced FB ads strategies for SMMA',
      duration: '45:32',
      thumbnail: 'https://placehold.co/400x225/d97757/white?text=FB+Ads',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      category: 'Ads'
    },
    {
      id: '2',
      title: 'Sales Call Framework',
      description: 'Close more clients with this proven framework',
      duration: '32:18',
      thumbnail: 'https://placehold.co/400x225/d97757/white?text=Sales',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      category: 'Sales'
    },
    {
      id: '3',
      title: 'Client Onboarding Process',
      description: 'Set up clients for success from day one',
      duration: '28:45',
      thumbnail: 'https://placehold.co/400x225/d97757/white?text=Onboarding',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      category: 'Operations'
    },
  ]

  const categories = ['all', ...Array.from(new Set(courses.map(c => c.category)))]

  const filteredCourses = selectedCategory === 'all'
    ? courses
    : courses.filter(c => c.category === selectedCategory)

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
          <h1 className="text-[18px] font-semibold text-[#2d2d2d]">Course Library</h1>
          <div className="w-[120px]"></div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-8 py-12">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-[32px] font-normal text-[#2d2d2d] mb-3">Training Courses</h1>
          <p className="text-[15px] text-[#6b6b6b]">
            Access exclusive video courses and training materials
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-8">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#d97757] text-white'
                  : 'bg-white border border-[#e0ddd4] text-[#6b6b6b] hover:border-[#d97757]'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => (
            <div
              key={course.id}
              className="bg-white border border-[#e0ddd4] rounded-lg overflow-hidden hover:border-[#d97757] transition-all hover:shadow-lg cursor-pointer"
              onClick={() => setSelectedVideo(course)}
            >
              <div className="relative">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-[200px] object-cover"
                />
                <div className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-[12px] font-medium">
                  {course.duration}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/10 transition-colors">
                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#d97757">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="text-[12px] text-[#d97757] font-medium mb-2">
                  {course.category}
                </div>
                <h3 className="text-[16px] font-semibold text-[#2d2d2d] mb-2">
                  {course.title}
                </h3>
                <p className="text-[14px] text-[#6b6b6b] line-clamp-2">
                  {course.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="bg-white rounded-lg overflow-hidden max-w-[1000px] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-[#e0ddd4]">
              <h3 className="text-[18px] font-semibold text-[#2d2d2d]">
                {selectedVideo.title}
              </h3>
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-2 hover:bg-[#f5f5f5] rounded-lg transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="aspect-video">
              <iframe
                src={selectedVideo.videoUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="p-4">
              <p className="text-[14px] text-[#6b6b6b]">
                {selectedVideo.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}