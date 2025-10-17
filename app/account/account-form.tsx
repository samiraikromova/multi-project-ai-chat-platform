'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

export default function AccountForm({ user }: { user: User | null }) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [fullname, setFullname] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [website, setWebsite] = useState<string | null>(null)

  const getProfile = useCallback(async () => {
    try {
      setLoading(true)

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`full_name, username, website`)
        .eq('id', user?.id)
        .single()

      if (error && status !== 406) {
        console.error(error)
        throw error
      }

      if (data) {
        setFullname(data.full_name)
        setUsername(data.username)
        setWebsite(data.website)
      }
    } catch (error) {
      alert('Error loading user data!')
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    getProfile()
  }, [user, getProfile])

  async function updateProfile({
    username,
    website,
    fullname,
  }: {
    username: string | null
    website: string | null
    fullname: string | null
  }) {
    try {
      setLoading(true)

      const { error } = await supabase.from('profiles').upsert({
        id: user?.id as string,
        full_name: fullname,
        username,
        website,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error
      alert('Profile updated!')
    } catch (error) {
      alert('Error updating the data!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f5ef] p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-[#e0ddd4] p-8">
        <h1 className="text-2xl font-semibold text-[#2d2d2d] mb-6">Account</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
              Email
            </label>
            <input
              className="w-full px-4 py-2 border border-[#e0ddd4] rounded-lg bg-gray-50"
              type="text"
              value={user?.email}
              disabled
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
              Full Name
            </label>
            <input
              className="w-full px-4 py-2 border border-[#e0ddd4] rounded-lg focus:outline-none focus:border-[#d97757]"
              type="text"
              value={fullname || ''}
              onChange={(e) => setFullname(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
              Username
            </label>
            <input
              className="w-full px-4 py-2 border border-[#e0ddd4] rounded-lg focus:outline-none focus:border-[#d97757]"
              type="text"
              value={username || ''}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
              Website
            </label>
            <input
              className="w-full px-4 py-2 border border-[#e0ddd4] rounded-lg focus:outline-none focus:border-[#d97757]"
              type="url"
              value={website || ''}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              className="flex-1 bg-[#d97757] hover:bg-[#c86545] text-white font-medium py-3 rounded-lg transition-colors disabled:bg-gray-400"
              onClick={() => updateProfile({ fullname, username, website })}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Update'}
            </button>

            <form action="/auth/signout" method="post" className="flex-1">
              <button
                className="w-full bg-gray-200 hover:bg-gray-300 text-[#2d2d2d] font-medium py-3 rounded-lg transition-colors"
                type="submit"
              >
                Sign Out
              </button>
            </form>
          </div>

          <div className="pt-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-[#d97757] hover:text-[#c86545] text-sm"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}