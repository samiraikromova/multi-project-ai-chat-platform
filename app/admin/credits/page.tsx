"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface User {
  id: string
  email: string
  name: string
  credits: number
  subscription_tier: string
}

export default function AdminCredits() {
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [creditAmount, setCreditAmount] = useState<number>(0)
  const [reason, setReason] = useState("")

  const supabase = createClient()

  const load = async () => {
    let query = supabase
      .from('users')
      .select('id, email, name, credits, subscription_tier')
      .order('created_at', { ascending: false })

    if (searchQuery) {
      query = query.or(`email.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`)
    }

    const { data } = await query
    setUsers(data || [])
  }

  useEffect(() => { load() }, [searchQuery])

  const grantCredits = async () => {
    if (!selectedUser || creditAmount === 0) return

    const newTotal = Number(selectedUser.credits) + creditAmount

    const { error } = await supabase
      .from('users')
      .update({ credits: newTotal })
      .eq('id', selectedUser.id)

    if (!error) {
      // Log transaction
      await supabase.from('credit_transactions').insert({
        user_id: selectedUser.id,
        amount: creditAmount,
        type: 'manual_grant',
        payment_method: 'admin',
        metadata: { reason, admin_action: true }
      })

      setShowModal(false)
      setSelectedUser(null)
      setCreditAmount(0)
      setReason("")
      load()
    } else {
      alert('Error: ' + error.message)
    }
  }

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-6">Credit Management</h1>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search users by email or name..."
          className="w-full max-w-md px-4 py-2 border rounded-lg"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#f7f5ef]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">User</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Tier</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Credits</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-t">
                <td className="px-4 py-3 font-medium">{user.name || 'Unknown'}</td>
                <td className="px-4 py-3 text-gray-600">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    user.subscription_tier === 'tier2' ? 'bg-purple-100 text-purple-800' :
                    user.subscription_tier === 'tier1' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.subscription_tier === 'tier2' ? 'Pro' :
                     user.subscription_tier === 'tier1' ? 'Starter' : 'Free'}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono font-semibold">
                  ${Number(user.credits).toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => {
                      setSelectedUser(user)
                      setShowModal(true)
                    }}
                    className="text-[#d97757] hover:text-[#c86545] font-medium"
                  >
                    Grant Credits
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px]">
            <h2 className="text-xl font-bold mb-4">Grant Credits</h2>

            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">User: {selectedUser.email}</div>
              <div className="text-sm text-gray-600 mb-4">
                Current Balance: ${Number(selectedUser.credits).toFixed(2)}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Credit Amount ($)</label>
              <input
                type="number"
                step="0.01"
                className="w-full border p-2 rounded"
                value={creditAmount}
                onChange={(e) => setCreditAmount(parseFloat(e.target.value) || 0)}
                placeholder="Enter amount (positive or negative)"
              />
              <div className="text-xs text-gray-500 mt-1">
                New balance will be: ${(Number(selectedUser.credits) + creditAmount).toFixed(2)}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Reason</label>
              <textarea
                className="w-full border p-2 rounded"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you granting/removing credits?"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={grantCredits}
                className="flex-1 bg-[#d97757] text-white py-2 rounded"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  setShowModal(false)
                  setSelectedUser(null)
                  setCreditAmount(0)
                  setReason("")
                }}
                className="flex-1 border py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}