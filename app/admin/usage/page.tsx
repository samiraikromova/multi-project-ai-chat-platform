"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function UsagePage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<any[]>([])
  const [filteredLogs, setFilteredLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "user">("all")
  const [users, setUsers] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)
  const logsPerPage = 10

  useEffect(() => {
    fetchUsage()
  }, [])

  async function fetchUsage() {
    try {
      // Fetch usage logs and user info
      const { data: usageData, error } = await supabase
        .from("usage_logs")
        .select("*, users(name, email)")
        .order("created_at", { ascending: false })

      if (error) throw error

      // Fetch all distinct users for dropdown
      const { data: usersData } = await supabase
        .from("users")
        .select("id, name, email")
        .order("name", { ascending: true })

      setUsers(usersData || [])

      // Fetch from n8n webhook
      let n8nLogs: any[] = []
      try {
        const res = await fetch("/api/webhook/cb4/n8nChat", { method: "GET" })
        const json = await res.json()
        if (Array.isArray(json)) {
          n8nLogs = json.map((n) => ({
            model: n.model || n.usage?.model,
            tokens_output: n.usage?.tokens,
            estimated_cost: n.usage?.cost,
            created_at: n.usage?.timestamp,
            users: { name: "n8n System", email: "system@internal" },
          }))
        }
      } catch (e) {
        console.warn("No n8n logs fetched:", e)
      }

      const combined = [...(usageData || []), ...n8nLogs]
      setLogs(combined)
      setFilteredLogs(combined)
    } catch (err: any) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function applyFilter(type: "all" | "user") {
    setFilter(type)
    setSelectedUser("")
    setCurrentPage(1)
    if (type === "all") {
      setFilteredLogs(logs)
    }
  }

  function handleUserSelect(userEmail: string) {
    setSelectedUser(userEmail)
    setCurrentPage(1)
    if (userEmail === "") {
      setFilteredLogs(logs)
    } else {
      const filtered = logs.filter((log) => log.users?.email === userEmail)
      setFilteredLogs(filtered)
    }
  }

  // Pagination logic
  const indexOfLastLog = currentPage * logsPerPage
  const indexOfFirstLog = indexOfLastLog - logsPerPage
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog)
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage)

  if (loading)
    return (
      <div className="p-10 text-gray-600 text-center">
        Loading usage logs...
      </div>
    )

  if (error)
    return (
      <div className="p-10 text-red-500 text-center">
        Error: {error}
      </div>
    )

  return (
    <div className="p-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#2d2d2d]">Usage Logs</h1>

        <div className="flex items-center gap-3 bg-[#f7f5ef] border border-[#e0ddd4] rounded-lg p-1">
          <button
            onClick={() => applyFilter("all")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-[#d97757] text-white"
                : "text-[#555] hover:text-[#2d2d2d]"
            }`}
          >
            All Logs
          </button>
          <button
            onClick={() => applyFilter("user")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === "user"
                ? "bg-[#d97757] text-white"
                : "text-[#555] hover:text-[#2d2d2d]"
            }`}
          >
            By User
          </button>
        </div>
      </div>

      {filter === "user" && (
        <div className="mb-6 flex items-center gap-3">
          <label className="text-sm font-medium text-[#555]">
            Filter by Username:
          </label>
          <select
            value={selectedUser}
            onChange={(e) => handleUserSelect(e.target.value)}
            className="px-3 py-2 border border-[#e0ddd4] rounded-lg bg-white text-sm text-[#2d2d2d]"
          >
            <option value="">All Users</option>
            {users.map((user) => (
              <option key={user.id} value={user.email}>
                {user.name || user.email}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-white shadow border border-[#e0ddd4] rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f7f5ef] text-[#555]">
            <tr>
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Model</th>
              <th className="py-3 px-4">Tokens</th>
              <th className="py-3 px-4">Cost ($)</th>
              <th className="py-3 px-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {currentLogs.map((log, i) => (
              <tr
                key={i}
                className="border-t border-[#eee] hover:bg-[#faf8f3] transition-colors"
              >
                <td className="py-3 px-4">{log.users?.name || "Unknown"}</td>
                <td className="py-3 px-4 text-gray-600">
                  {log.users?.email || "—"}
                </td>
                <td className="py-3 px-4">{log.model || "—"}</td>
                <td className="py-3 px-4">{log.tokens_output || "—"}</td>
                <td className="py-3 px-4">
                  {log.estimated_cost
                    ? Number(log.estimated_cost).toFixed(6)
                    : "—"}
                </td>
                <td className="py-3 px-4 text-gray-500">
                  {new Date(log.created_at).toLocaleString()}
                </td>
              </tr>
            ))}

            {currentLogs.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-500">
                  No logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredLogs.length > logsPerPage && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 border border-[#e0ddd4] rounded-lg text-sm text-[#555] hover:text-[#2d2d2d] disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-[#555]">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 border border-[#e0ddd4] rounded-lg text-sm text-[#555] hover:text-[#2d2d2d] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
