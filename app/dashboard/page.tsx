'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CreditBalance from "@/components/CreditBalance";

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<any[]>([])

  useEffect(() => {
    async function fetchUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
      } else {
        const { data: userData } = await supabase
          .from('users')
          .select('subscription_tier')
          .eq('id', user.id)
          .single()

        setUser({ ...user, subscription_tier: userData?.subscription_tier || 'free' })
      }
      setLoading(false)
    }

    fetchUser()
  }, [router, supabase])

  useEffect(() => {
    async function fetchProjects() {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      const userTier = user?.subscription_tier || 'free'
      const filteredProjects =
        data?.filter((p) => {
          if (p.requires_tier2) {
            return userTier === 'tier2'
          }
          return true
        }) || []

      setProjects(filteredProjects)
    }

    if (user) {
      fetchProjects()
    }
  }, [user, supabase])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading)
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  // Separate normal and "Coming Soon" projects
  const normalProjects = projects
  .filter((p) => p.name !== 'Coming Soon')
  .sort((a, b) => {
    // "Cam's Brain V4" or slug "cb4" always first
    if (a.slug === 'cb4') return -1
    if (b.slug === 'cb4') return 1
    return 0
  })
  const comingSoonProjects = projects.filter((p) => p.name === 'Coming Soon')


  return (
    <div className="min-h-screen bg-[#f7f5ef]">
      {/* Header */}
      <header className="border-b border-[#e0ddd4] bg-white">
        <div className="max-w-[1400px] mx-auto px-8 py-4 flex justify-between items-center">
          <h1 className="text-[18px] font-semibold text-[#2d2d2d]">AI Chat Platform</h1>
          <button
              onClick={() => router.push('/dashboard/courses')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#e8e6df] transition-colors text-[13px] text-[#6b6b6b]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="3" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="6" cy="7" r="1.5" fill="currentColor"/>
              <path d="M7 7l3 2V5l-3 2z" fill="currentColor"/>
            </svg>
            Course Library
          </button>

          {user && (
              <div className="relative">
                <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
                >
                  <div
                      className="w-8 h-8 rounded-full bg-[#d97757] flex items-center justify-center text-white text-[14px] font-medium">
                    {user.user_metadata?.full_name
                        ? user.user_metadata.full_name.charAt(0).toUpperCase()
                        : (user.email?.charAt(0).toUpperCase() || 'U')}
                  </div>
                  <span className="text-[14px] text-[#2d2d2d]">
                  {user.user_metadata?.full_name || user.email}
                </span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M6 8L3 5h6L6 8z"/>
                  </svg>
                </button>

                {showUserMenu && (
                    <div
                        className="absolute right-0 mt-2 w-48 bg-white border border-[#e0ddd4] rounded-lg shadow-lg py-1 z-50">
                      <div className="px-4 py-2 border-b border-[#e0ddd4]">
                        <div className="text-[11px] text-[#8b8b8b] mb-1">Credits</div>
                        <CreditBalance userId={user.id}/>
                      </div>

                      <button
                          onClick={() => router.push('/pricing/top-up')}
                          className="w-full text-left px-4 py-2 text-[14px] text-[#2d2d2d] hover:bg-[#dcdcdc] transition-colors"
                      >
                        Top Up Credits
                      </button>

                      <button
                          onClick={() => router.push('/pricing')}
                          className="w-full text-left px-4 py-2 text-[14px] text-[#2d2d2d] hover:bg-[#f9f9f9] transition-colors"
                      >
                        Upgrade to Pro
                      </button>

                      <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-[14px] text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Logout
                      </button>
                    </div>
                )}
              </div>
          )}
        </div>
      </header>

      {/* Projects Section */}
      <div className="max-w-[1400px] mx-auto px-8 py-12">
        <div className="mb-12">
          <h1 className="text-[32px] font-normal text-[#2d2d2d] mb-3">Your Projects</h1>
          <p className="text-[15px] text-[#6b6b6b] font-normal">
            Select a project to start chatting with your specialized AI assistant
          </p>
        </div>

        {/* ✅ Normal Projects */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {normalProjects.map((project) => (
              <Link
                  key={project.id}
                  href={`/dashboard/project/${project.slug}`}
              className="group bg-white border border-[#e0ddd4] rounded-lg p-5 transition-all duration-200 hover:border-[#d97757] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] cursor-pointer"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 transition-transform duration-200 group-hover:scale-105"
                style={{ backgroundColor: project.color + '20' }}
              >
                {project.icon}
              </div>
              <h3 className="text-[16px] font-semibold text-[#2d2d2d] mb-1">
                {project.name}
                {project.requires_tier2 && (
                  <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                    Pro
                  </span>
                )}
              </h3>
              <p className="text-[14px] text-[#6b6b6b] leading-[1.5]">{project.description}</p>
            </Link>
          ))}
          {comingSoonProjects.map((project) => (
                <div
                  key={project.id}
                  className="group bg-white border border-[#e0ddd4] rounded-lg p-5 opacity-60 cursor-not-allowed relative"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
                    style={{ backgroundColor: project.color + '20' }}
                  >
                    {project.icon}
                  </div>
                  <h3 className="text-[16px] font-semibold text-[#2d2d2d] mb-1">
                    {project.name}
                  </h3>
                  <p className="text-[14px] text-[#6b6b6b] leading-[1.5]">
                    {project.description}
                  </p>
                  <span className="absolute top-3 right-3 text-[11px] text-[#999] bg-[#f5f5f5] px-2 py-1 rounded">
                    🚧 In Development
                  </span>
                </div>
              ))}
        </div>
      </div>
    </div>
  )
}
