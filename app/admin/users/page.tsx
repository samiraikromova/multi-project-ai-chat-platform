"use client"
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface User {
  id: string
  email: string
  full_name: string
  is_admin: boolean
  created_at: string
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, is_admin, created_at')
        .order('created_at', { ascending: false })

      if (profilesError) {
        console.error('Error loading profiles:', profilesError)
        setLoading(false)
        return
      }

      // Try to get emails from auth.users
      const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers()

      if (authError) {
        console.warn('Could not fetch auth users (needs service_role key):', authError)
        // Use profiles without emails
        const usersWithoutEmails: User[] = profiles?.map(p => ({
          id: p.id,
          email: 'N/A',
          full_name: p.full_name || 'Unknown',
          is_admin: p.is_admin || false,
          created_at: p.created_at
        })) || []
        setUsers(usersWithoutEmails)
      } else {
        // Combine profiles with auth users
        const combinedUsers: User[] = profiles?.map(p => {
          const authUser = authUsers?.find(u => u.id === p.id)
          return {
            id: p.id,
            email: authUser?.email || 'N/A',
            full_name: p.full_name || 'Unknown',
            is_admin: p.is_admin || false,
            created_at: p.created_at
          }
        }) || []
        setUsers(combinedUsers)
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleAdmin = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: !currentStatus })
      .eq('id', userId)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      loadUsers()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#6b6b6b]">Loading users...</div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      <div className="mb-8">
        <h2 className="text-[28px] font-normal text-[#2d2d2d] mb-3">User Management</h2>
        <p className="text-[15px] text-[#6b6b6b]">Manage user roles and permissions</p>
      </div>

      <div className="bg-white border border-[#e0ddd4] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#f5f5f5] border-b border-[#e0ddd4]">
            <tr>
              <th className="text-left px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Name</th>
              <th className="text-left px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Email</th>
              <th className="text-left px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Joined</th>
              <th className="text-left px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Role</th>
              <th className="text-left px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-[#e0ddd4] hover:bg-[#f7f5ef] transition-colors">
                <td className="px-4 py-3 text-[14px] text-[#2d2d2d] font-medium">
                  {user.full_name}
                </td>
                <td className="px-4 py-3 text-[14px] text-[#6b6b6b]">{user.email}</td>
                <td className="px-4 py-3 text-[13px] text-[#8b8b8b]">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {user.is_admin ? (
                    <span className="inline-block bg-green-100 text-green-800 text-[12px] font-medium px-2 py-1 rounded">
                      Admin
                    </span>
                  ) : (
                    <span className="inline-block bg-gray-100 text-gray-800 text-[12px] font-medium px-2 py-1 rounded">
                      User
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleAdmin(user.id, user.is_admin)}
                    className="text-[13px] text-[#d97757] hover:text-[#c86545] font-medium transition-colors"
                  >
                    {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="text-center py-12 text-[#6b6b6b]">
          No users found
        </div>
      )}
    </div>
  )
}