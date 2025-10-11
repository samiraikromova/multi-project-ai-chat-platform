import Link from 'next/link'

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-[#f7f5ef]">
      <nav className="bg-white border-b border-[#e0ddd4] px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center gap-8">
          <h1 className="text-[18px] font-semibold text-[#2d2d2d]">Admin Panel</h1>
          <Link href="/admin/prompts" className="text-[14px] text-[#6b6b6b] hover:text-[#d97757] transition-colors">
            System Prompts
          </Link>
          <Link href="/dashboard" className="text-[14px] text-[#6b6b6b] hover:text-[#d97757] transition-colors ml-auto">
            ← Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-[1400px] mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-[32px] font-normal text-[#2d2d2d] mb-3">Admin Dashboard</h2>
          <p className="text-[15px] text-[#6b6b6b]">Manage projects, users, and system settings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/admin/prompts" className="group bg-white border border-[#e0ddd4] rounded-lg p-6 hover:border-[#d97757] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all">
            <div className="text-3xl mb-4">📝</div>
            <h3 className="text-[16px] font-semibold text-[#2d2d2d] mb-2">System Prompts</h3>
            <p className="text-[14px] text-[#6b6b6b] leading-[1.5]">Edit AI assistant prompts for each project</p>
          </Link>

          <div className="bg-white border border-[#e0ddd4] rounded-lg p-6 opacity-50 cursor-not-allowed">
            <div className="text-3xl mb-4">👥</div>
            <h3 className="text-[16px] font-semibold text-[#2d2d2d] mb-2">User Management</h3>
            <p className="text-[14px] text-[#6b6b6b] leading-[1.5]">Coming soon</p>
          </div>

          <div className="bg-white border border-[#e0ddd4] rounded-lg p-6 opacity-50 cursor-not-allowed">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-[16px] font-semibold text-[#2d2d2d] mb-2">Usage Statistics</h3>
            <p className="text-[14px] text-[#6b6b6b] leading-[1.5]">Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  )
}