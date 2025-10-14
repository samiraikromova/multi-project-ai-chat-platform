"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function AdminUsagePage() {
  const [usage, setUsage] = useState<any[]>([])

  useEffect(() => {
    const fetchUsage = async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc("get_user_usage")

      if (error) {
        console.error("Error fetching usage:", error)
      } else {
        setUsage(data || [])
      }
    }

    fetchUsage()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">User Usage Summary</h1>
      <table className="min-w-full border text-left">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2">User</th>
            <th className="px-4 py-2">Email</th>
            <th className="px-4 py-2">Total Tokens</th>
            <th className="px-4 py-2">Total Cost</th>
            <th className="px-4 py-2">Last Activity</th>
          </tr>
        </thead>
        <tbody>
          {usage.length > 0 ? (
            usage.map((row) => (
              <tr key={row.user_id} className="border-t">
                <td className="px-4 py-2">{row.name || "—"}</td>
                <td className="px-4 py-2">{row.email || "—"}</td>
                <td className="px-4 py-2">{row.total_tokens || 0}</td>
                <td className="px-4 py-2">${parseFloat(row.total_cost || 0).toFixed(4)}</td>
                <td className="px-4 py-2">
                  {row.last_activity ? new Date(row.last_activity).toLocaleString() : "—"}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="text-center py-4 text-gray-500">
                No usage data yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
