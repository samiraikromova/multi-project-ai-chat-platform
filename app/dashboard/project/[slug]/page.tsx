import CB4Chat from "@/components/chat/CB4Chat"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function ProjectPage(props: PageProps) {
  const params = await props.params
  const slug = params.slug
  const userId = "demo-user-123"

  const projectNames: Record<string, string> = {
    cb4: "CB4 - Cam's Brain v4",
    "sales-transcript": "Sales Call Transcript Review",
    "student-ads": "Student Ad Writing",
    "client-ads": "Client Ad Writing",
    contracts: "Contracts Writer",
  }

  if (slug === "cb4") {
    return (
      <CB4Chat
        userId={userId}
        projectName={projectNames[slug]}
        projectSlug={slug}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">
          {projectNames[slug] || slug}
        </h1>
        <p className="text-gray-600 mb-6">Coming soon...</p>
        <a href="/dashboard" className="text-blue-600 hover:underline">
          Back to Projects
        </a>
      </div>
    </div>
  )
}