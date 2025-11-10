"use client"
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAdminEmail } from '@/lib/adminList'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user || !user.email) {
      router.push('/auth/login')
      return
    }

    // Check admin_users table instead of file
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('email')
      .eq('email', user.email)
      .maybeSingle()

    if (!adminUser) {
      alert('Access denied. Admin privileges required.')
      router.push('/dashboard')
      return
    }

    setIsAdmin(true)
  } catch (err) {
    console.error('Auth check error:', err)
    router.push('/auth/login')
  } finally {
    setLoading(false)
  }
}

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f5ef] flex items-center justify-center">
        <div className="text-[#6b6b6b]">Checking permissions...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#f7f5ef]">
      <nav className="bg-white border-b border-[#e0ddd4] px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center gap-8">
          <Link href="../admin" className="text-[18px] font-semibold text-[#2d2d2d]">
            Admin Panel
          </Link>
          <Link href="../admin/admins" className="text-[14px] text-[#6b6b6b] hover:text-[#d97757] transition-colors">
            Manage Admins
          </Link>
          <Link href="../admin/prompts" className="text-[14px] text-[#6b6b6b] hover:text-[#d97757] transition-colors">
            System Prompts
          </Link>
          <Link href="../admin/usage" className="text-[14px] text-[#6b6b6b] hover:text-[#d97757] transition-colors">
            Usage Stats
          </Link>
          <Link href="../admin/projects" className="text-[14px] text-[#6b6b6b] hover:text-[#d97757] transition-colors">
            Projects
          </Link>
          <Link href="../admin/coupons" className="text-[14px] text-[#6b6b6b] hover:text-[#d97757] transition-colors">
            Coupons
          </Link>
          <Link href="../admin/credits" className="text-[14px] text-[#6b6b6b] hover:text-[#d97757] transition-colors">
            Credits
          </Link>
          <Link href="../dashboard" className="text-[14px] text-[#6b6b6b] hover:text-[#d97757] transition-colors ml-auto">
            ← Dashboard
          </Link>
        </div>
      </nav>
      {children}
    </div>
  )
}