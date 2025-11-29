"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

type TimeFilter = 'daily' | 'weekly' | 'monthly' | 'all'

export default function UsagePage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<any[]>([])
  const [filteredLogs, setFilteredLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userFilter, setUserFilter] = useState<string>("")
  const [users, setUsers] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [searchQuery, setSearchQuery] = useState("")
  const [totalCost, setTotalCost] = useState(0)
  const logsPerPage = 20

  const fetchUsage = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch usage logs with user data
      const { data: usageData, error: usageError } = await supabase
        .from("usage_logs")
        .select(`
          *,
          users (
            id,
            name,
            email
          )
        `)
        .order("created_at", { ascending: false })

      if (usageError) throw usageError

      console.log('📊 Loaded usage logs:', usageData?.length || 0)
      console.log('📊 Sample log:', usageData?.[0])

      // Fetch all users for filter dropdown
      const { data: usersData } = await supabase
        .from("users")
        .select("id, name, email")
        .order("name", { ascending: true })

      setUsers(usersData || [])
      setLogs(usageData || [])
      setFilteredLogs(usageData || [])

      // Calculate total cost
      const cost = (usageData || []).reduce((sum: number, log: any) =>
        sum + (parseFloat(log.estimated_cost) || 0), 0)
      setTotalCost(cost)

    } catch (err: any) {
      console.error('❌ Error fetching usage:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  useEffect(() => {
    let filtered = [...logs]

    // Time filter
    if (timeFilter !== 'all') {
      const now = new Date()
      const filterDate = new Date()

      if (timeFilter === 'daily') {
        filterDate.setDate(now.getDate() - 1)
      } else if (timeFilter === 'weekly') {
        filterDate.setDate(now.getDate() - 7)
      } else if (timeFilter === 'monthly') {
        filterDate.setMonth(now.getMonth() - 1)
      }

      filtered = filtered.filter(log => new Date(log.created_at) >= filterDate)
    }

    // User filter
    if (userFilter) {
      filtered = filtered.filter(log => log.users?.email === userFilter)
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(log =>
        log.users?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.users?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.model?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredLogs(filtered)
    setCurrentPage(1)

    // Recalculate total cost for filtered results
    const cost = filtered.reduce((sum: number, log: any) =>
      sum + (parseFloat(log.estimated_cost) || 0), 0)
    setTotalCost(cost)
  }, [logs, timeFilter, userFilter, searchQuery])

  const exportToCSV = () => {
  const csvData = [
    ['User', 'Email', 'Model', 'Input Tokens', 'Output Tokens', 'Total Tokens', 'Cost ($)', 'Type', 'Date'],
    ...filteredLogs.map(log => {
      const isImageGen = log.model?.includes('Ideogram')
      return [
        log.users?.name || 'Unknown',
        log.users?.email || '—',
        log.model || '—',
        isImageGen ? 'N/A' : (log.tokens_input || '—'),
        isImageGen ? 'N/A' : (log.tokens_output || '—'),
        isImageGen ? 'N/A' : ((log.tokens_input || 0) + (log.tokens_output || 0)),
        log.estimated_cost ? Number(log.estimated_cost).toFixed(6) : '—',
        isImageGen ? 'Image Generation' : 'Text Chat',
        new Date(log.created_at).toLocaleString()
      ]
    })
  ]

  const csvContent = csvData.map(row => row.join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `usage-logs-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

  // Pagination
  const indexOfLastLog = currentPage * logsPerPage
  const indexOfFirstLog = indexOfLastLog - logsPerPage
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog)
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage)

  if (loading) {
    return (
      <div className="p-10 text-gray-600 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#d97757] mb-4"></div>
        <p>Loading usage logs...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-10 text-red-500 text-center">
        <p className="mb-4">Error: {error}</p>
        <button
          onClick={fetchUsage}
          className="px-4 py-2 bg-[#d97757] text-white rounded-lg hover:bg-[#c86545]"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="p-10 max-w-7xl mx-auto">
      {/* Header with Total Cost */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#2d2d2d] mb-2">Usage Analytics</h1>
        <div className="flex items-center gap-4">
          <div className="bg-white border border-[#e0ddd4] rounded-lg px-6 py-3">
            <div className="text-[13px] text-[#6b6b6b] mb-1">Total Cost</div>
            <div className="text-[24px] font-semibold text-[#d97757]">
              ${totalCost.toFixed(4)}
            </div>
          </div>
          <div className="bg-white border border-[#e0ddd4] rounded-lg px-6 py-3">
            <div className="text-[13px] text-[#6b6b6b] mb-1">Total Requests</div>
            <div className="text-[24px] font-semibold text-[#2d2d2d]">
              {filteredLogs.length}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#e0ddd4] rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Time Filter */}
          <div>
            <label className="block text-sm font-medium text-[#555] mb-2">Time Period</label>
            <div className="flex gap-1 bg-[#f7f5ef] border border-[#e0ddd4] rounded-lg p-1">
              {(['daily', 'weekly', 'monthly', 'all'] as TimeFilter[]).map(filter => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    timeFilter === filter
                      ? 'bg-[#d97757] text-white'
                      : 'text-[#555] hover:text-[#2d2d2d]'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-sm font-medium text-[#555] mb-2">Filter by User</label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full px-3 py-2 border border-[#e0ddd4] rounded-lg bg-white text-sm text-[#2d2d2d]"
            >
              <option value="">All Users</option>
              {users.map((user) => (
                <option key={user.id} value={user.email}>
                  {user.name || user.email}
                </option>
              ))}
            </select>
          </div>


          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-[#555] mb-2">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name, email, model..."
              className="w-full px-3 py-2 border border-[#e0ddd4] rounded-lg text-sm text-[#2d2d2d] placeholder:text-[#999]"
            />
          </div>

          {/* Export */}
          <div className="flex items-end">
            <button
              onClick={exportToCSV}
              className="w-full px-4 py-2 bg-[#d97757] hover:bg-[#c86545] text-white rounded-lg text-sm font-medium transition-colors"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow border border-[#e0ddd4] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f7f5ef] text-[#555]">
            <tr>
              <th className="py-3 px-4 font-medium">User</th>
              <th className="py-3 px-4 font-medium">Email</th>
              <th className="py-3 px-4 font-medium">Model / Type</th>
              <th className="py-3 px-4 font-medium">Input Tokens</th>
              <th className="py-3 px-4 font-medium">Output Tokens</th>
              <th className="py-3 px-4 font-medium">Total</th>
              <th className="py-3 px-4 font-medium">Cost ($)</th>
              <th className="py-3 px-4 font-medium">Date</th>
            </tr>
            </thead>
            <tbody>
            {currentLogs.map((log, i) => {
              const isImageGen = log.model?.includes('Ideogram')

              return (
                  <tr
                      key={log.id || i}
                      className="border-t border-[#eee] hover:bg-[#faf8f3] transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-[#2d2d2d]">
                      {log.users?.name || "Unknown"}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {log.users?.email || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-[12px] font-medium ${
                          isImageGen
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-[#f5f5f5] text-[#2d2d2d]'
                      }`}>
                        {isImageGen && '🎨 '}
                        {log.model || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isImageGen ? (
                          <span className="text-[#8b8b8b] text-[12px]">N/A</span>
                      ) : (
                          (log.tokens_input || 0).toLocaleString()
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isImageGen ? (
                          <span className="text-[#8b8b8b] text-[12px]">N/A</span>
                      ) : (
                          (log.tokens_output || 0).toLocaleString()
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {isImageGen ? (
                          <span className="text-[#8b8b8b] text-[12px]">Image Gen</span>
                      ) : (
                          ((log.tokens_input || 0) + (log.tokens_output || 0)).toLocaleString()
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {log.estimated_cost ? Number(log.estimated_cost).toFixed(6) : "—"}
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
              )
            })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredLogs.length > logsPerPage && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-[#e0ddd4] rounded-lg text-sm text-[#555] hover:text-[#2d2d2d] hover:bg-[#f7f5ef] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
            Previous
          </button>
          <span className="text-sm text-[#555] px-4">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-[#e0ddd4] rounded-lg text-sm text-[#555] hover:text-[#2d2d2d] hover:bg-[#f7f5ef] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}