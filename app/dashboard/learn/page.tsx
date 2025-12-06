'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { BookOpen, PlayCircle, CheckCircle2, Search, Download, MessageSquare } from 'lucide-react'

interface Lesson {
  id: string
  moduleId: string
  title: string
  duration: string
  completed?: boolean
  description?: string
  embedUrl?: string
  transcript?: string
  summary?: string
}

interface Module {
  id: string
  title: string
  lessons: Lesson[]
}

export default function LearnPage() {
  const router = useRouter()
  const supabase = createClient()
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [contentType, setContentType] = useState<'recordings' | 'materials'>('materials')
  const [searchQuery, setSearchQuery] = useState('')
  const [modules, setModules] = useState<Module[]>([
    {
      id: 'module-1',
      title: 'Getting Started',
      lessons: [
        {
          id: 'mat-1',
          moduleId: 'module-1',
          title: 'Introduction to the Platform',
          duration: '5:30',
          completed: false,
          description: 'Welcome to the platform!',
          embedUrl: 'https://player.vimeo.com/video/example'
        },
      ],
    },
  ])

  const handleDownloadTranscript = (lesson: Lesson) => {
    if (!lesson.transcript) return
    const blob = new Blob([lesson.transcript], {type: 'text/plain'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${lesson.title.replace(/[^a-zA-Z0-9]/g, '_')}_transcript.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <aside className="w-64 bg-background border-r border-border flex flex-col">
          <div className="p-3 border-b border-border">
            <button onClick={() => router.push('/dashboard')}
                    className="flex items-center gap-2 text-[14px] text-muted-foreground hover:text-foreground">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              Back to Dashboard
            </button>
          </div>

          {/* Content Type Toggle */}
          <div className="p-3">
            <div className="bg-surface rounded-full p-1 flex gap-1 border border-border">
              <button onClick={() => setContentType('materials')}
                      className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          contentType === 'materials' ? 'bg-accent text-white' : 'text-muted-foreground'
                      }`}>
                Course Materials
              </button>
              <button onClick={() => setContentType('recordings')}
                      className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          contentType === 'recordings' ? 'bg-accent text-white' : 'text-muted-foreground'
                      }`}>
                Call Recordings
              </button>
            </div>
          </div>

          {/* Lessons List */}
          <div className="flex-1 overflow-y-auto p-2">
            {modules.map(module => (
                <div key={module.id} className="mb-4">
                  <div className="text-[11px] text-muted-foreground px-2 py-1 font-medium uppercase">
                    {module.title}
                  </div>
                  {module.lessons.map(lesson => (
                      <button key={lesson.id} onClick={() => setSelectedLesson(lesson)}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                                  selectedLesson?.id === lesson.id ? 'bg-surface-hover text-accent' : 'text-muted-foreground hover:bg-surface-hover'
                              }`}>
                        {lesson.completed ? (
                            <CheckCircle2 className="h-3 w-3 text-accent flex-shrink-0"/>
                        ) : (
                            <PlayCircle className="h-3 w-3 flex-shrink-0"/>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs truncate">{lesson.title}</div>
                          <div className="text-[10px] text-muted-foreground">{lesson.duration}</div>
                        </div>
                      </button>
                  ))}
                </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {selectedLesson ? (
              <div className="max-w-[1000px] mx-auto px-8 py-8">
                {/* Video Player */}
                <div className="aspect-video bg-surface rounded-2xl overflow-hidden border border-border mb-6">
                  {selectedLesson.embedUrl ? (
                      <iframe src={selectedLesson.embedUrl} className="w-full h-full" allowFullScreen/>
                  ) : (
                      <div className="flex items-center justify-center h-full">
                        <PlayCircle className="h-16 w-16 text-accent"/>
                      </div>
                  )}
                </div>

                {/* Lesson Info */}
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground mb-2">{selectedLesson.title}</h2>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{selectedLesson.duration}</span>
                      {selectedLesson.completed && <span className="text-accent">• Completed</span>}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {selectedLesson.transcript && (
                      <div className="flex gap-3">
                        <button onClick={() => handleDownloadTranscript(selectedLesson)}
                                className="px-4 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg text-sm flex items-center gap-2">
                          <Download className="h-4 w-4"/>
                          Download Transcript
                        </button>
                        <button onClick={() => router.push(`/dashboard/project/cb4?transcript=${selectedLesson.id}`)}
                                className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm flex items-center gap-2">
                          <MessageSquare className="h-4 w-4"/>
                          Ask AI About This Video
                        </button>
                      </div>
                  )}

                  {/* Description */}
                  {selectedLesson.description && (
                      <div className="rounded-xl border border-border bg-surface p-4">
                        <h3 className="text-sm font-semibold text-foreground mb-2">Summary</h3>
                        <p className="text-sm text-muted-foreground">{selectedLesson.description}</p>
                      </div>
                  )}
                </div>
              </div>
          ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <BookOpen className="h-16 w-16 text-accent mx-auto mb-4"/>
                  <h2 className="text-2xl font-semibold text-foreground mb-2">Welcome to Learning</h2>
                  <p className="text-muted-foreground">Select a lesson to start learning</p>
                </div>
              </div>
          )}
        </main>
      </div>
  )}