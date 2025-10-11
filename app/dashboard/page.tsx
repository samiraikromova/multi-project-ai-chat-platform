import Link from 'next/link'

export default function DashboardPage() {
  const projects = [
    {
      id: 'cb4',
      name: "CB4",
      subtitle: "Cam's Brain v4",
      description: 'Advanced AI assistant with vector search integration via Pinecone',
      icon: '🧠',
      color: '#d97757',
    },
    {
      id: 'sales-transcript',
      name: 'Sales Call Review',
      subtitle: 'Transcript Analysis',
      description: 'Analyze and extract insights from sales call transcripts',
      icon: '📞',
      color: '#5b9fb8',
    },
    {
      id: 'student-ads',
      name: 'Student Ad Writing',
      subtitle: 'Campus Marketing',
      description: 'Create compelling ad copy targeted for student audiences',
      icon: '🎓',
      color: '#f4a261',
    },
    {
      id: 'client-ads',
      name: 'Client Ad Writing',
      subtitle: 'Professional Copy',
      description: 'Professional ad copywriting for client campaigns',
      icon: '💎',
      color: '#6c91c2',
    },
    {
      id: 'contracts',
      name: 'Contracts Writer',
      subtitle: 'Legal Documents',
      description: 'Draft and review professional contracts',
      icon: '📋',
      color: '#9b7ede',
    },
    {
      id: 'tbd',
      name: 'Coming Soon',
      subtitle: 'New Project',
      description: 'Additional specialized assistant',
      icon: '➕',
      color: '#ccc',
      disabled: true,
    },
  ]

  return (
    <div className="min-h-screen bg-[#f7f5ef]">
      <div className="max-w-[1400px] mx-auto px-8 py-12">
        <div className="mb-12">
          <h1 className="text-[32px] font-normal text-[#2d2d2d] mb-3">
            Your Projects
          </h1>
          <p className="text-[15px] text-[#6b6b6b] font-normal">
            Select a project to start chatting with your specialized AI assistant
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={project.disabled ? '#' : `/dashboard/project/${project.id}`}
              className={`group bg-white border border-[#e0ddd4] rounded-lg p-5 transition-all duration-200 ${
                project.disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:border-[#d97757] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] cursor-pointer'
              }`}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 transition-transform duration-200 group-hover:scale-105"
                style={{ backgroundColor: project.color + '20' }}
              >
                {project.icon}
              </div>
              <h3 className="text-[16px] font-semibold text-[#2d2d2d] mb-1">
                {project.name}
              </h3>
              <p className="text-[13px] text-[#8b8b8b] mb-2">{project.subtitle}</p>
              <p className="text-[14px] text-[#6b6b6b] leading-[1.5]">
                {project.description}
              </p>
              {project.disabled && (
                <span className="inline-block mt-3 text-[11px] text-[#999] bg-[#f5f5f5] px-2 py-1 rounded">
                  🚧 In Development
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}