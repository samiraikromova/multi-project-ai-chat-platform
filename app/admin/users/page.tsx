"use client"
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface User {
  id: string
  email: string
  created_at: string
  full_name?: string
  is_admin?: boolean
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const supabase = createClient()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*')
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()

    const combined = authUsers?.map(u => ({
      id: u.id,
      email: u.email || '',
      created_at: u.created_at,
      full_name: profiles?.find(p => p.id === u.id)?.full_name,
      is_admin: profiles?.find(p => p.id === u.id)?.is_admin
    })) || []

    setUsers(combined)
  }

  const toggleAdmin = async (userId: string, isAdmin: boolean) => {
    await supabase.from('profiles').update({ is_admin: !isAdmin }).eq('id', userId)
    loadUsers()
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">User Management</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-4">Name</th>
              <th className="text-left p-4">Email</th>
              <th className="text-left p-4">Joined</th>
              <th className="text-left p-4">Admin</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b hover:bg-gray-50">
                <td className="p-4">{u.full_name || 'N/A'}</td>
                <td className="p-4">{u.email}</td>
                <td className="p-4">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="p-4">
                  {u.is_admin ? (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Admin</span>
                  ) : (
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">User</span>
                  )}
                </td>
                <td className="p-4">
                  <button
                    onClick={() => toggleAdmin(u.id, u.is_admin || false)}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Toggle Admin
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}