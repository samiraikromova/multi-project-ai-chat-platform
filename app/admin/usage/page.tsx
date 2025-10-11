"use client"
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UsageStats {
  user_email: string
  total_messages: number
  total_tokens: number
  estimated_cost: number
}

export default function AdminUsage() {
  const [stats, setStats] = useState<UsageStats[]>([])
  const supabase = createClient()

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    // This is a simplified version - you'll need to create a proper aggregation query
    const { data: messages } = await supabase
      .from('messages')
      .select('thread_id, role')

    // Group by user and calculate stats
    const grouped: Record<string, UsageStats> = {}
    messages?.forEach(m => {
      if (!grouped[m.thread_id]) {
        grouped[m.thread_id] = {
          user_email: m.thread_id,
          total_messages: 0,
          total_tokens: 0,
          estimated_cost: 0
        }
      }
      grouped[m.thread_id].total_messages++
    })

    setStats(Object.values(grouped))
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Usage Statistics</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-4">User</th>
              <th className="text-left p-4">Messages</th>
              <th className="text-left p-4">Tokens</th>
              <th className="text-left p-4">Est. Cost</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="p-4">{s.user_email}</td>
                <td className="p-4">{s.total_messages}</td>
                <td className="p-4">{s.total_tokens.toLocaleString()}</td>
                <td className="p-4">${s.estimated_cost.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}