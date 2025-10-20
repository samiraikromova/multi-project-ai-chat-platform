"use client"
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Admin {
  id: string
  email: string
  full_name: string
  created_at: string
}

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadAdmins()
  }, [])

  const loadAdmins = async () => {
    const { data } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setAdmins(data)
  }

  const addAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail) return

    setLoading(true)
    const { error } = await supabase
      .from('admin_users')
      .insert({ email: newEmail.toLowerCase() })

    if (error) {
      alert('Error: ' + error.message)
    } else {
      setNewEmail('')
      loadAdmins()
      alert('Admin added successfully!')
    }
    setLoading(false)
  }

  const removeAdmin = async (id: string) => {
    if (!confirm('Remove this admin?')) return

    const { error } = await supabase
      .from('admin_users')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      loadAdmins()
    }
  }

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-12">
      <div className="mb-8">
        <h2 className="text-[28px] font-normal text-[#2d2d2d] mb-3">Admin Management</h2>
        <p className="text-[15px] text-[#6b6b6b]">Add or remove admin users</p>
      </div>

      {/* Add Admin Form */}
      <div className="bg-white border border-[#e0ddd4] rounded-lg p-6 mb-6">
        <h3 className="text-[16px] font-semibold text-[#2d2d2d] mb-4">Add New Admin</h3>
        <form onSubmit={addAdmin} className="flex gap-3">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="admin@example.com"
            className="flex-1 px-4 py-2 border border-[#e0ddd4] rounded-lg focus:outline-none focus:border-[#d97757] text-[14px]"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-[#d97757] hover:bg-[#c86545] disabled:bg-[#ccc] text-white text-[14px] font-medium rounded-lg transition-colors"
          >
            {loading ? 'Adding...' : 'Add Admin'}
          </button>
        </form>
      </div>

      {/* Admin List */}
      <div className="bg-white border border-[#e0ddd4] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#f5f5f5] border-b border-[#e0ddd4]">
            <tr>
              <th className="text-left px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Email</th>
              <th className="text-left px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Added</th>
              <th className="text-right px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map(admin => (
              <tr key={admin.id} className="border-b border-[#e0ddd4]">
                <td className="px-4 py-3 text-[14px] text-[#2d2d2d]">{admin.email}</td>
                <td className="px-4 py-3 text-[13px] text-[#8b8b8b]">
                  {new Date(admin.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => removeAdmin(admin.id)}
                    className="text-[13px] text-red-600 hover:text-red-700 font-medium"
                  >
                    Remove
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