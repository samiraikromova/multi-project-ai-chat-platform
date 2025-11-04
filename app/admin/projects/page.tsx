"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function AdminProjects() {
  const [projects, setProjects] = useState<any[]>([])
  const [showNewModal, setShowNewModal] = useState(false)
  const [newProject, setNewProject] = useState({
    name: '',
    slug: '',
    icon: '🤖',
    color: '#d97757',
    description: '',
    system_prompt: 'You are a helpful AI assistant.',
    requires_tier2: false
  })

  const supabase = createClient()
  const router = useRouter()

  const load = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    setProjects(data || [])
  }

  useEffect(() => { load() }, [])

  const toggle = async (id: string, comingSoon: boolean) => {
    await supabase.from('projects').update({ coming_soon: comingSoon }).eq('id', id)
    load()
  }

  const createProject = async () => {
    if (!newProject.name || !newProject.slug) {
      alert('Name and slug are required')
      return
    }

    const { error } = await supabase.from('projects').insert({
      name: newProject.name,
      slug: newProject.slug,
      icon: newProject.icon,
      color: newProject.color,
      description: newProject.description,
      system_prompt: newProject.system_prompt,
      is_active: true,
      coming_soon: false,
      requires_tier2: newProject.requires_tier2
    })

    if (error) {
      alert('Error creating project: ' + error.message)
    } else {
      setShowNewModal(false)
      setNewProject({
        name: '',
        slug: '',
        icon: '🤖',
        color: '#d97757',
        description: '',
        system_prompt: 'You are a helpful AI assistant.',
        requires_tier2: false
      })
      load()
    }
  }

  const del = async (id: string) => {
    if (confirm('Delete project?')) {
      await supabase.from('projects').delete().eq('id', id)
      load()
    }
  }

  return (
    <div className="p-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Projects</h1>
        <button
          onClick={() => setShowNewModal(true)}
          className="bg-[#d97757] text-white px-4 py-2 rounded hover:opacity-90"
        >
          + New Project
        </button>
      </div>

      {projects.map(p => (
        <div key={p.id} className="flex items-center gap-4 p-4 bg-white border rounded mb-2">
          <span className="text-xl">{p.icon}</span>
          <span className="flex-1">{p.name}</span>
          {p.requires_tier2 && <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Tier 2</span>}
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={p.coming_soon} onChange={(e) => toggle(p.id, e.target.checked)} />
            Coming Soon
          </label>
          <button onClick={() => del(p.id)} className="text-red-600">Delete</button>
        </div>
      ))}

      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px]">
            <h2 className="text-xl font-bold mb-4">Create New Project</h2>

            <input
              type="text"
              placeholder="Project Name"
              className="w-full border p-2 rounded mb-3"
              value={newProject.name}
              onChange={(e) => setNewProject({...newProject, name: e.target.value})}
            />

            <input
              type="text"
              placeholder="Slug (e.g., ai-hooks)"
              className="w-full border p-2 rounded mb-3"
              value={newProject.slug}
              onChange={(e) => setNewProject({...newProject, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
            />

            <input
              type="text"
              placeholder="Icon (emoji)"
              className="w-full border p-2 rounded mb-3"
              value={newProject.icon}
              onChange={(e) => setNewProject({...newProject, icon: e.target.value})}
            />

            <input
              type="text"
              placeholder="Color (#d97757)"
              className="w-full border p-2 rounded mb-3"
              value={newProject.color}
              onChange={(e) => setNewProject({...newProject, color: e.target.value})}
            />

            <textarea
              placeholder="Description"
              className="w-full border p-2 rounded mb-3"
              rows={2}
              value={newProject.description}
              onChange={(e) => setNewProject({...newProject, description: e.target.value})}
            />

            <textarea
              placeholder="System Prompt"
              className="w-full border p-2 rounded mb-3"
              rows={3}
              value={newProject.system_prompt}
              onChange={(e) => setNewProject({...newProject, system_prompt: e.target.value})}
            />

            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={newProject.requires_tier2}
                onChange={(e) => setNewProject({...newProject, requires_tier2: e.target.checked})}
              />
              <span className="text-sm">Requires Tier 2 subscription</span>
            </label>

            <div className="flex gap-3">
              <button onClick={createProject} className="flex-1 bg-[#d97757] text-white py-2 rounded">
                Create
              </button>
              <button onClick={() => setShowNewModal(false)} className="flex-1 border py-2 rounded">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}