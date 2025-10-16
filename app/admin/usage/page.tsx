"use client"
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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

interface UserData {
  userId: string
  userName: string
  email: string
  totalMessages: number
  totalTokensInput: number
  totalTokensOutput: number
  totalCost: number
  lastActivity: string
}

export default function AdminUsagePage() {
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([])
  const [userData, setUserData] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'users' | 'logs'>('users')
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Fetch usage logs
      const { data: logs, error: logsError } = await supabase
        .from('usage_logs')
        .select('*')
        .order('created_at', { ascending: false })

      if (logsError) {
        console.error('Error fetching logs:', logsError)
        setLoading(false)
        return
      }

      setUsageLogs(logs || [])

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')

      // Aggregate by user
      const userMap = new Map<string, UserData>()

      logs?.forEach(log => {
        const profile = profiles?.find(p => p.id === log.user_id)
        
        if (!userMap.has(log.user_id)) {
          userMap.set(log.user_id, {
            userId: log.user_id,
            userName: profile?.full_name || 'Unknown',
            email: profile?.email || 'N/A',
            totalMessages: 0,
            totalTokensInput: 0,
            totalTokensOutput: 0,
            totalCost: 0,
            lastActivity: log.created_at
          })
        }

        const user = userMap.get(log.user_id)!
        user.totalMessages++
        user.totalTokensInput += log.tokens_input || 0
        user.totalTokensOutput += log.tokens_output || 0
        user.totalCost += parseFloat(log.estimated_cost?.toString() || '0')
        
        if (new Date(log.created_at) > new Date(user.lastActivity)) {
          user.lastActivity = log.created_at
        }
      })

      setUserData(Array.from(userMap.values()))
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#6b6b6b]">Loading usage data...</div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-[28px] font-normal text-[#2d2d2d] mb-3">Usage Statistics</h2>
          <p className="text-[15px] text-[#6b6b6b]">Monitor token usage and costs</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('users')}
            className={`px-4 py-2 text-[13px] rounded-lg transition-colors ${
              view === 'users'
                ? 'bg-[#d97757] text-white'
                : 'bg-white border border-[#e0ddd4] text-[#6b6b6b] hover:border-[#d97757]'
            }`}
          >
            By User
          </button>
          <button
            onClick={() => setView('logs')}
            className={`px-4 py-2 text-[13px] rounded-lg transition-colors ${
              view === 'logs'
                ? 'bg-[#d97757] text-white'
                : 'bg-white border border-[#e0ddd4] text-[#6b6b6b] hover:border-[#d97757]'
            }`}
          >
            Detailed Logs
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-[#e0ddd4] rounded-lg p-5">
          <div className="text-[13px] text-[#8b8b8b] mb-1">Total Users</div>
          <div className="text-[28px] font-semibold text-[#2d2d2d]">{userData.length}</div>
        </div>
        <div className="bg-white border border-[#e0ddd4] rounded-lg p-5">
          <div className="text-[13px] text-[#8b8b8b] mb-1">Total Messages</div>
          <div className="text-[28px] font-semibold text-[#2d2d2d]">
            {userData.reduce((sum, u) => sum + u.totalMessages, 0)}
          </div>
        </div>
        <div className="bg-white border border-[#e0ddd4] rounded-lg p-5">
          <div className="text-[13px] text-[#8b8b8b] mb-1">Total Tokens</div>
          <div className="text-[28px] font-semibold text-[#2d2d2d]">
            {(userData.reduce((sum, u) => sum + u.totalTokensInput + u.totalTokensOutput, 0)).toLocaleString()}
          </div>
        </div>
        <div className="bg-white border border-[#e0ddd4] rounded-lg p-5">
          <div className="text-[13px] text-[#8b8b8b] mb-1">Total Cost</div>
          <div className="text-[28px] font-semibold text-[#d97757]">
            ${userData.reduce((sum, u) => sum + u.totalCost, 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Tables */}
      {view === 'users' ? (
        <div className="bg-white border border-[#e0ddd4] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#f5f5f5] border-b border-[#e0ddd4]">
              <tr>
                <th className="text-left px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Name</th>
                <th className="text-left px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Email</th>
                <th className="text-right px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Messages</th>
                <th className="text-right px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Tokens (In/Out)</th>
                <th className="text-right px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Cost</th>
                <th className="text-left px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {userData.map(user => (
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
                <th className="text-left px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">User</th>
                <th className="text-left px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Model</th>
                <th className="text-right px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Tokens In</th>
                <th className="text-right px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Tokens Out</th>
                <th className="text-right px-4 py-3 text-[13px] font-medium text-[#2d2d2d]">Cost</th>
              </tr>
            </thead>
            <tbody>
              {usageLogs.map(log => {
                const user = userData.find(u => u.userId === log.user_id)
                return (
                  <tr key={log.id} className="border-b border-[#e0ddd4] hover:bg-[#f7f5ef] transition-colors">
                    <td className="px-4 py-3 text-[13px] text-[#8b8b8b]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[#2d2d2d]">
                      {user?.userName || 'Unknown'}
                      <div className="text-[12px] text-[#8b8b8b]">{user?.email || 'N/A'}</div>
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
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {userData.length === 0 && (
        <div className="text-center py-12 text-[#6b6b6b]">
          No usage data yet
        </div>
      )}
    </div>
  )
}