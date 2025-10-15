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

      if (userError || !user) {
        console.log('No user found, redirecting to login')
        router.push('../auth/login')
        return
      }

      console.log('Current user:', user.email)

      // Fetch profile for this user
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      console.log('Fetched profile:', profile, profileError)

      // If RLS blocked the fetch or profile is missing
      if (profileError || !profile) {
        console.error('Error loading profile or profile missing:', profileError)
        router.push('../auth/login')
        return
      }

      // Check admin status
      const isAdminFlag = profile.is_admin || isAdminEmail(user.email || '')

      if (!isAdminFlag) {
        console.log('User is not admin:', user.email)
        alert('Access denied. Admin privileges required.')
        router.push('../dashboard')
        return
      }

      // Optionally update profile to mark as admin if email is in admin list
      if (isAdminEmail(user.email || '') && !profile.is_admin) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ is_admin: true })
          .eq('id', user.id)

        if (updateError) {
          console.error('Error updating profile to admin:', updateError)
        } else {
          console.log('Profile updated to admin.')
        }
      }

      setIsAdmin(true)
    } catch (err) {
      console.error('Auth check error:', err)
      router.push('../auth/login')
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
    return (
      <div className="min-h-screen bg-[#f7f5ef] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#6b6b6b] mb-4">Redirecting...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f5ef]">
      <nav className="bg-white border-b border-[#e0ddd4] px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center gap-8">
          <Link href="../admin" className="text-[18px] font-semibold text-[#2d2d2d]">
            Admin Panel
          </Link>
          <Link href="../admin/prompts" className="text-[14px] text-[#6b6b6b] hover:text-[#d97757] transition-colors">
            System Prompts
          </Link>
          <Link href="../admin/users" className="text-[14px] text-[#6b6b6b] hover:text-[#d97757] transition-colors">
            Users
          </Link>
          <Link href="../admin/usage" className="text-[14px] text-[#6b6b6b] hover:text-[#d97757] transition-colors">
            Usage Stats
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
