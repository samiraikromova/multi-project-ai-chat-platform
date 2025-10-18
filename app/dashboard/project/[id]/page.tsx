"use client"

import CB4Chat from "@/components/chat/CB4Chat"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

interface ProjectPageProps {
  params: { id: string }
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const [userId, setUserId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const projectSlug = params.id
  const projectName = params.id.replace(/-/g, " ") // replace dashes with spaces
  const projectEmoji = "🧠" // You can customize per project if you have mapping

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) setUserId(user.id)
      setLoading(false)
    }
    fetchUser()
  }, [])

  if (loading) return <div className="p-4">Loading...</div>
  if (!userId) return <div className="p-4">User not logged in</div>

  return (
    <div className="h-screen">
      <CB4Chat
        userId={userId}
        projectSlug={projectSlug}
        projectName={projectName}
        projectEmoji={projectEmoji}
      />
    </div>
  )
}
