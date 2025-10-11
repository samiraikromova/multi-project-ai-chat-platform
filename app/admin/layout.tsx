import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b p-4">
        <div className="max-w-7xl mx-auto flex gap-6">
          <Link href="/admin" className="font-bold text-lg">Admin Panel</Link>
          <Link href="/admin/prompts" className="text-blue-600 hover:underline">System Prompts</Link>
          <Link href="/admin/users" className="text-blue-600 hover:underline">Users</Link>
          <Link href="/admin/usage" className="text-blue-600 hover:underline">Usage Stats</Link>
          <Link href="/dashboard" className="text-gray-600 hover:underline ml-auto">← Dashboard</Link>
        </div>
      </nav>
      {children}
    </div>
  )
}