"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function AdminProjects() {
  const [projects, setProjects] = useState<any[]>([])
  const [showNewModal, setShowNewModal] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [newProject, setNewProject] = useState({
    name: '',
    slug: '',
    icon: '🤖',
    color: '#d97757',
    description: '',
    system_prompt: 'You are a helpful AI assistant.'
  })

  const supabase = createClient()
  const router = useRouter()

  const load = async () => {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    setProjects(data || [])
  }

  useEffect(() => { load() }, [])

  const toggle = async (id: string, comingSoon: boolean) => {
    await supabase.from('projects').update({ coming_soon: comingSoon }).eq('id', id)
    load()
  }

  const del = async (id: string) => {
    if (confirm('Delete project?')) {
      await supabase.from('projects').delete().eq('id', id)
      load()
    }
  }

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-6">Manage Projects</h1>
      {projects.map(p => (
        <div key={p.id} className="flex items-center gap-4 p-4 bg-white border rounded mb-2">
          <span className="text-xl">{p.icon}</span>
          <span className="flex-1">{p.name}</span>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={p.coming_soon} onChange={(e) => toggle(p.id, e.target.checked)} />
            Coming Soon
          </label>
          <button onClick={() => del(p.id)} className="text-red-600">Delete</button>
        </div>
      ))}
    </div>
  )
}