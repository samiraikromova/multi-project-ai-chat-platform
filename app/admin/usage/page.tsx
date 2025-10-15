'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type UsageLog = {
  id: string
  user_id: string
  model: string
  tokens_input: number
  tokens_output: number
  estimated_cost: number
  created_at: string
}

export default function AdminUsagePage() {
  const [usage, setUsage] = useState<UsageLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchUsage = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not authenticated.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('usage_logs')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching usage:', error)
        setError('Error fetching usage data.')
      } else {
        setUsage(data || [])
      }

      setLoading(false)
    }

    fetchUsage()
  }, [supabase])

  if (loading) return <div className="p-10 text-gray-600">Loading usage data...</div>
  if (error) return <div className="p-10 text-red-500">{error}</div>
  if (!usage.length) return <div className="p-10 text-gray-600">No usage data found yet.</div>

  return (
    <div className="min-h-screen bg-[#f7f5ef]">


      <div className="max-w-[1400px] mx-auto px-6 py-10">
        <table className="w-full border-collapse bg-white border border-[#e0ddd4] rounded-lg shadow-sm">
          <thead className="bg-[#f5f3ef] text-left">
            <tr>
              <th className="p-3 text-sm text-[#2d2d2d]">User ID</th>
              <th className="p-3 text-sm text-[#2d2d2d]">Model</th>
              <th className="p-3 text-sm text-[#2d2d2d]">Input</th>
              <th className="p-3 text-sm text-[#2d2d2d]">Output</th>
              <th className="p-3 text-sm text-[#2d2d2d]">Cost</th>
              <th className="p-3 text-sm text-[#2d2d2d]">Date</th>
            </tr>
          </thead>
          <tbody>
            {usage.map((log) => (
              <tr key={log.id} className="border-t border-[#e0ddd4] hover:bg-[#faf9f7] transition">
                <td className="p-3 text-sm text-[#555]">{log.user_id}</td>
                <td className="p-3 text-sm text-[#555]">{log.model}</td>
                <td className="p-3 text-sm text-[#555]">{log.tokens_input}</td>
                <td className="p-3 text-sm text-[#555]">{log.tokens_output}</td>
                <td className="p-3 text-sm text-[#555]">${log.estimated_cost?.toFixed(6)}</td>
                <td className="p-3 text-sm text-[#555]">{new Date(log.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
