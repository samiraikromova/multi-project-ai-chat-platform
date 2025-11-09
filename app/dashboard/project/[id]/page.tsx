// app/dashboard/project/[id]/page.tsx
"use client"

import CB4Chat from "@/components/chat/CB4Chat"
import ImageGeneratorChat from "@/components/chat/ImageGeneratorChat"
import HooksGeneratorChat from "@/components/chat/HooksGeneratorChat"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { use } from "react"

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

interface ProjectData {
  id: string
  name: string
  slug: string
  icon: string
  system_prompt: string
  color: string
  project_type?: string
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const resolvedParams = use(params)
  const [userId, setUserId] = useState<string>("")
  const [projectData, setProjectData] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError("User not logged in")
        setLoading(false)
        return
      }
      setUserId(user.id)

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, name, slug, icon, system_prompt, color, project_type')
        .eq('slug', resolvedParams.id)
        .eq('is_active', true)
        .single()

      if (projectError || !project) {
        setError("Project not found")
        setLoading(false)
        return
      }

      setProjectData(project)
      setLoading(false)
    }

    fetchData()
  }, [resolvedParams.id])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f7f5ef]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#d97757] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[15px] text-[#6b6b6b]">Loading project...</p>
        </div>
      </div>
    )
  }

  if (error || !projectData) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f7f5ef]">
        <div className="text-center">
          <p className="text-[18px] text-[#d97757] mb-4">{error || "Project not found"}</p>
          <a
            href="/dashboard"
            className="text-[14px] text-[#6b6b6b] hover:text-[#d97757] underline"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f7f5ef]">
        <p className="text-[15px] text-[#6b6b6b]">User not logged in</p>
      </div>
    )
  }

  const chatProps = {
    userId,
    projectId: projectData.id,
    projectSlug: projectData.slug,
    projectName: projectData.name,
    projectEmoji: projectData.icon,
    systemPrompt: projectData.system_prompt,
    _projectColor: projectData.color,
  }

  // ✅ Render specialized chat components based on project type
  return (
    <div className="h-screen">
      {projectData.project_type === 'image_generator' ? (
        <ImageGeneratorChat {...chatProps} />
      ) : projectData.project_type === 'hooks_generator' ? (
        <HooksGeneratorChat {...chatProps} />
      ) : (
        <CB4Chat {...chatProps} />
      )}
    </div>
  )
}