"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import ThrivecartEmbed from "@/components/thrivecart/ThrivecartEmbed"

export default function TopUpPage() {
  const [credits, setCredits] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('credits')
        .eq('id', user.id)
        .single()

      if (userData) {
        setCredits(Number(userData.credits) || 0)
      }
      setLoading(false)
    }
    fetchUser()
  }, [])

  const topUpOptions = [
    { amount: 10, productId: '9', label: '$10', credits: '1,000 credits' },
    { amount: 25, productId: '10', label: '$25', credits: '2,500 credits', badge: 'Popular' },
    { amount: 50, productId: '11', label: '$50', credits: '5,000 credits' },
    { amount: 100, productId: '12', label: '$100', credits: '10,000 credits', badge: 'Best Value' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f5ef] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d97757]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f5ef] py-16 px-6">
      <ThrivecartEmbed />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-[14px] text-[#6b6b6b] hover:text-[#2d2d2d] mb-6"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Back to Dashboard
          </button>

          <h1 className="text-4xl font-extrabold text-[#2d2d2d] mb-3">
            Top Up Credits
          </h1>
          <p className="text-[#6b6b6b] text-lg mb-4">
            Add more credits to your account
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#e0ddd4] rounded-lg">
            <span className="text-[14px] text-[#6b6b6b]">Current Balance:</span>
            <span className="text-[18px] font-bold text-[#d97757]">${credits.toFixed(2)}</span>
          </div>
        </div>

        {/* Top-Up Options */}
        <div className="grid md:grid-cols-2 gap-6">
          {topUpOptions.map((option) => (
            <div
              key={option.productId}
              className="relative bg-white border-2 border-[#e0ddd4] rounded-2xl p-6 hover:border-[#d97757] transition-colors"
            >
              {option.badge && (
                <div className="absolute top-0 right-0">
                  <div className="bg-[#d97757] text-white text-[11px] font-semibold px-3 py-1 rounded-tr-xl rounded-bl-md">
                    {option.badge}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <div className="text-[48px] font-bold text-[#2d2d2d] mb-2">
                  {option.label}
                </div>
                <div className="text-[16px] text-[#6b6b6b]">
                  {option.credits}
                </div>
                <div className="text-[13px] text-[#8b8b8b] mt-2">
                  ≈ {(option.amount * 100).toLocaleString()} tokens
                </div>
              </div>

                <a
                data-thrivecart-account="leveraged-creator"
                data-thrivecart-tpl="v2"
                data-thrivecart-product={option.productId}
                className="thrivecart-button block w-full text-center px-6 py-3 bg-[#d97757] hover:bg-[#c86545] text-white font-medium rounded-lg transition-colors cursor-pointer"
                >
                Add Credits
              </a>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="mt-12 p-6 bg-white border border-[#e0ddd4] rounded-lg">
          <h3 className="text-[16px] font-semibold text-[#2d2d2d] mb-3">
            How Credits Work
          </h3>
          <ul className="space-y-2 text-[14px] text-[#6b6b6b]">
            <li className="flex items-start gap-2">
              <span className="text-[#d97757]">✓</span>
              Credits are used based on AI model usage and token consumption
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#d97757]">✓</span>
              Credits never expire and roll over month-to-month
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#d97757]">✓</span>
              Subscription credits stack with top-up credits
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#d97757]">✓</span>
              Instant activation after payment
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}