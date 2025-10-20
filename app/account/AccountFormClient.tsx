'use client'

import { useState } from 'react'
import { updateProfileAction } from './actions'

export default function AccountFormClient({ user }: { user: any }) {
  const [name, setName] = useState(user?.name || '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const result = await updateProfileAction({
      userId: user.id,
      name,
    })

    if (result.success) {
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Error updating profile' })
    }

    setLoading(false)
  }

  const handleSignOut = () => {
    window.location.href = '/auth/login'
  }

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-50 px-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-semibold text-[#2d2d2d] mb-6">Account</h1>

        {message && (
          <div
            className={`mb-4 p-3 rounded ${
              message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2d2d2d] mb-2">Email</label>
            <input
              type="text"
              value={user.email}
              disabled
              className="w-full border border-gray-300 rounded-lg p-2 bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2d2d2d] mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2"
            />
          </div>

          <div className="flex gap-4 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#2d2d2d] hover:bg-[#444] text-white font-medium py-3 rounded-lg transition-colors"
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#2d2d2d] font-medium py-3 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
