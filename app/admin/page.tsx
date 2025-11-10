import Link from 'next/link'

export default function AdminPage() {
  return (
    <div className="max-w-[1400px] mx-auto px-6 py-12">
      <div className="mb-8">
        <h2 className="text-[32px] font-normal text-[#2d2d2d] mb-3">Admin Dashboard</h2>
        <p className="text-[15px] text-[#6b6b6b]">Manage projects, users, and system settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="../admin/prompts" className="group bg-white border border-[#e0ddd4] rounded-lg p-6 hover:border-[#d97757] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all">
          <div className="text-3xl mb-4">📝</div>
          <h3 className="text-[16px] font-semibold text-[#2d2d2d] mb-2">System Prompts</h3>
          <p className="text-[14px] text-[#6b6b6b] leading-[1.5]">Edit AI assistant prompts for each project</p>
        </Link>

        <Link href="../admin/usage" className="group bg-white border border-[#e0ddd4] rounded-lg p-6 hover:border-[#d97757] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all">
          <div className="text-3xl mb-4">📊</div>
          <h3 className="text-[16px] font-semibold text-[#2d2d2d] mb-2">Usage Statistics</h3>
          <p className="text-[14px] text-[#6b6b6b] leading-[1.5]">Monitor token usage and costs with user details</p>
        </Link>

          <Link href="../admin/projects" className="group bg-white border border-[#e0ddd4] rounded-lg p-6 hover:border-[#d97757] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all">
          <div className="text-3xl mb-4">📦</div>
          <h3 className="text-[16px] font-semibold text-[#2d2d2d] mb-2">Manage Projects</h3>
          <p className="text-[14px] text-[#6b6b6b] leading-[1.5]">Create, edit, and manage AI chat projects</p>
        </Link>

        <Link href="/admin/coupons" className="group bg-white border border-[#e0ddd4] rounded-lg p-6 hover:border-[#d97757] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all">
          <div className="text-3xl mb-4">🎟️</div>
          <h3 className="text-[16px] font-semibold text-[#2d2d2d] mb-2">Coupon Management</h3>
          <p className="text-[14px] text-[#6b6b6b] leading-[1.5]">Create and manage trial codes and discounts</p>
        </Link>

        <Link href="/admin/credits" className="group bg-white border border-[#e0ddd4] rounded-lg p-6 hover:border-[#d97757] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all">
          <div className="text-3xl mb-4">💰</div>
          <h3 className="text-[16px] font-semibold text-[#2d2d2d] mb-2">Credit Management</h3>
          <p className="text-[14px] text-[#6b6b6b] leading-[1.5]">Grant or adjust user credits manually</p>
        </Link>
      </div>
    </div>
  )
}