"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import CB4Chat from "./CB4Chat"

interface ProjectChatWrapperProps {
  userId: string
  projectSlug: string
  projectName: string
  projectEmoji: string
  systemPrompt?: string
  projectColor?: string
}

export default function ProjectChatWrapper({
  userId,
  projectSlug,
  projectName,
  projectEmoji,
  systemPrompt,
  projectColor
}: ProjectChatWrapperProps) {
  const [projectId, setProjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchProjectId() {
      const { data, error } = await supabase
        .from('projects')
        .select('id')
        .eq('slug', projectSlug)
        .single()

      if (data && !error) {
        setProjectId(data.id)
      } else {
        console.error('Failed to fetch project:', error)
      }
      setLoading(false)
    }

    fetchProjectId()
  }, [projectSlug, supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f7f5ef]">
        <div className="text-center">
          <div className="text-4xl mb-4">{projectEmoji}</div>
          <p className="text-[15px] text-[#6b6b6b]">Loading {projectName}...</p>
        </div>
      </div>
    )
  }

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f7f5ef]">
        <div className="text-center">
          <p className="text-[15px] text-red-600">Error: Project not found</p>
        </div>
      </div>
    )
  }

  return (
    <CB4Chat
      userId={userId}
      projectId={projectId}
      projectName={projectName}
      projectSlug={projectSlug}
      projectEmoji={projectEmoji}
      systemPrompt={systemPrompt}
      projectColor={projectColor}
    />
  )
}