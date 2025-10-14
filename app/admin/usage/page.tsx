"use client"
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface UsageLog {
  id: string
  user_id: string
  thread_id: string
  model: string
  tokens_input: number
  tokens_output: number
  estimated_cost: number
  created_at: string
}

interface UserProfile {
  id: string
  full_name: string
  email: string
}

interface AggregatedUsage {
  userId: string
  userName: string
  email: string
  totalMessages: number
  totalTokensInput: number
  totalTokensOutput: number
  totalCost: number
  lastActivity: string
}

export default function AdminUsage() {
  const [usage, setUsage] = useState<UsageLog[]>([])
  const [aggregated, setAggregated] = useState<AggregatedUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'aggregated' | 'detailed'>('aggregated')
  const supabase = createClient()

  useEffect(() => {
    loadUsageData()
  }, [])

  const loadUsageData = async () => {
    setLoading(true)

    // Fetch usage logs
    const { data: usageLogs, error: usageError } = await supabase
      .from('usage_logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (usageError) {
      console.error('Error fetching usage:', usageError)
      alert('Error loading usage data. Check console.')
      setLoading(false)
      return
    }

    setUsage(usageLogs || [])

    // Fetch user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')

    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers()

    if (profilesError || authError) {
      console.error('Error fetching users:', profilesError || authError)
    }

    // Aggregate by user
    const userMap = new Map<string, AggregatedUsage>()

    usageLogs?.forEach(log => {
      const profile = profiles?.find(p => p.id === log.user_id)
      const authUser = authUsers?.find(u => u.id === log.user_id)

      if (!userMap.has(log.user_id)) {
        userMap.set(log.user_id, {
          userId: log.user_id,
          userName: profile?.full_name || 'Unknown',
          email: authUser?.email || 'N/A',
          totalMessages: 0,
          totalTokensInput: 0,
          totalTokensOutput: 0,
          totalCost: 0,
          lastActivity: log.created_at
        })
      }

      const userStats = userMap.get(log.user_id)!
      userStats.totalMessages++
      userStats.totalTokensInput += log.tokens_input || 0
      userStats.totalTokensOutput += log.tokens_output || 0
      userStats.totalCost += parseFloat(log.estimated_cost?.toString() || '0')

      if (new Date(log.created_at) > new Date(userStats.lastActivity)) {
        userStats.lastActivity = log.created_at
      }
    })

    setAggregated(Array.from(userMap.values()))
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f5ef] flex items-center justify-center">
        <div className="text-[#6b6b6b]">Loading usage data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f5ef]">
      <nav className="bg-white border-b border-[#e0ddd4] px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center gap-8">
          <Link href="/admin" className="text-[14px] text-[#6b6b6b] hover:text-[#d97757] transition-colors">
            ← Admin
          </Link>
          <h1 className="text-[18px] font-semibold text-[#2d2d2d]">Usage Statistics</h1>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setView('aggregated')}
              className={`px-4 py-2 text-[13px] rounded-lg transition-colors ${
                view === 'aggregated'
                  ? 'bg-[#d97757] text-white'
                  : 'bg-white border border-[#e0ddd4] text-[#6b6b6b] hover:border-[#d97757]'
              }`}
            >
              By User
            </button>
            <button
              onClick={() => setView('detailed')}
              className={`px-4 py-2 text-[13px] rounded-lg transition-colors ${
                view === 'detailed'
                  ? 'bg-[#d97757] text-white'
                  : 'bg-white border border-[#e0ddd4] text-[#6b6b6b] hover:border-[#d97757]'
              }`}
            >
              Detailed Logs
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-[#e0ddd4] rounded-lg p-5">
            <div className="text-[13px] text-[#8b8b8b] mb-1">Total Users</div>
            <div className="text-[28px] font-semibold text-[#2d2d2d]">{aggregated.length}</div>
          </div>
          <div className="bg-white border border-[#e0ddd4] rounded-lg p-5">
            <div className="text-[13px] text-[#8b8b8b] mb-1">Total Messages</div>
            <div className="text-[28px] font-semibold text-[#2d2d2d]">
              {aggregated.reduce((sum, u) => sum + u.totalMessages, 0)}
            </div>
          </div>
          <div className="bg-white border border-[#e0ddd4] rounded-lg p-5">
            <div className="text-[13px] text-[#8b8b8b] mb-1">Total Tokens</div>
            <div className="text-[28px] font-semibold text-[#2d2d2d]">
              {(aggregated.reduce((sum, u) => sum + u.totalTokensInput + u.totalTokensOutput, 0)).toLocaleString()}
            </div>
          </div>
          <div className="bg-white border border-[#e0ddd4] rounded-lg p-5">
            <div className="text-[13px] text-[#8b8b8b] mb-1">Total Cost</div>
            <div className="text-[28px] font-semibold text-[#d97757]">
              ${aggregated.reduce((sum, u) => sum + u.totalCost, 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Tables */}
        {view === 'aggregated' ? (
          <div className="bg-white border border-[#e0ddd4] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#f5f5f5] border-b border-[#e0ddd4]">
                <tr>
                  <th className="text-left px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">User</th>
                  <th className="text-left px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Email</th>
                  <th className="text-right px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Messages</th>
                  <th className="text-right px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Tokens (In/Out)</th>
                  <th className="text-right px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Cost</th>
                  <th className="text-left px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {aggregated.map(user => (
                  <tr key={user.userId} className="border-b border-[#e0ddd4] hover:bg-[#f7f5ef] transition-colors">
                    <td className="px-4 py-3 text-[14px] text-[#2d2d2d] font-medium">{user.userName}</td>
                    <td className="px-4 py-3 text-[14px] text-[#6b6b6b]">{user.email}</td>
                    <td className="px-4 py-3 text-[14px] text-[#2d2d2d] text-right">{user.totalMessages}</td>
                    <td className="px-4 py-3 text-[14px] text-[#2d2d2d] text-right">
                      {user.totalTokensInput.toLocaleString()} / {user.totalTokensOutput.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[#d97757] font-medium text-right">
                      ${user.totalCost.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#8b8b8b]">
                      {new Date(user.lastActivity).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white border border-[#e0ddd4] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#f5f5f5] border-b border-[#e0ddd4]">
                <tr>
                  <th className="text-left px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Time</th>
                  <th className="text-left px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">User ID</th>
                  <th className="text-left px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Model</th>
                  <th className="text-right px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Tokens In</th>
                  <th className="text-right px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Tokens Out</th>
                  <th className="text-right px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Cost</th>
                </tr>
              </thead>
              <tbody>
                {usage.map(log => (
                  <tr key={log.id} className="border-b border-[#e0ddd4] hover:bg-[#f7f5ef] transition-colors">
                    <td className="px-4 py-3 text-[13px] text-[#8b8b8b]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#6b6b6b] font-mono">
                      {log.user_id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[#2d2d2d]">{log.model}</td>
                    <td className="px-4 py-3 text-[14px] text-[#2d2d2d] text-right">
                      {log.tokens_input.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[#2d2d2d] text-right">
                      {log.tokens_output.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[#d97757] text-right">
                      ${parseFloat(log.estimated_cost.toString()).toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}