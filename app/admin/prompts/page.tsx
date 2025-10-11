"use client"
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  slug: string
  system_prompt: string
  description: string
}

export default function AdminPrompts() {
  const [projects, setProjects] = useState<Project[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    const { data } = await supabase.from('projects').select('*').order('name')
    setProjects(data || [])
  }

  const savePrompt = async (id: string, prompt: string) => {
    setSaving(true)
    const { error } = await supabase.from('projects').update({ system_prompt: prompt }).eq('id', id)
    if (error) {
      alert('Error: ' + error.message)
    } else {
      setEditing(null)
      loadProjects()
    }
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-[#f7f5ef]">
      <nav className="bg-white border-b border-[#e0ddd4] px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center gap-8">
          <Link href="/admin" className="text-[14px] text-[#6b6b6b] hover:text-[#d97757] transition-colors">
            ← Admin
          </Link>
          <h1 className="text-[18px] font-semibold text-[#2d2d2d]">System Prompts</h1>
        </div>
      </nav>

      <div className="max-w-[1100px] mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-[28px] font-normal text-[#2d2d2d] mb-3">Edit System Prompts</h2>
          <p className="text-[15px] text-[#6b6b6b]">Customize how each AI assistant behaves and responds</p>
        </div>

        <div className="space-y-4">
          {projects.map((p) => (
            <div key={p.id} className="bg-white border border-[#e0ddd4] rounded-lg overflow-hidden">
              <div className="p-5 border-b border-[#e0ddd4]">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-[16px] font-semibold text-[#2d2d2d] mb-1">{p.name}</h3>
                    <p className="text-[13px] text-[#8b8b8b]">{p.description}</p>
                  </div>
                  {editing !== p.id && (
                    <button
                      onClick={() => setEditing(p.id)}
                      className="text-[13px] text-[#d97757] hover:text-[#c86545] font-medium transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>

              <div className="p-5">
                {editing === p.id ? (
                  <>
                    <textarea
                      className="w-full p-3 border border-[#e0ddd4] rounded-lg text-[14px] text-[#2d2d2d] focus:outline-none focus:border-[#d97757] transition-colors resize-none"
                      rows={8}
                      defaultValue={p.system_prompt}
                      id={`prompt-${p.id}`}
                      placeholder="Enter system prompt..."
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => {
                          const textarea = document.getElementById(`prompt-${p.id}`) as HTMLTextAreaElement
                          savePrompt(p.id, textarea.value)
                        }}
                        disabled={saving}
                        className="px-4 py-2 bg-[#d97757] hover:bg-[#c86545] disabled:bg-[#ccc] text-white text-[14px] font-medium rounded-lg transition-colors"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="px-4 py-2 bg-[#f5f5f5] hover:bg-[#e0ddd4] text-[#2d2d2d] text-[14px] font-medium rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-[14px] text-[#2d2d2d] leading-[1.6] whitespace-pre-wrap">
                    {p.system_prompt}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}