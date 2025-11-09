"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface CreditBalanceProps {
  userId: string
}

export default function CreditBalance({ userId }: CreditBalanceProps) {
  const [credits, setCredits] = useState<number>(0)
  const [tier, setTier] = useState<string>('free')
  const [monthlyAllowance, setMonthlyAllowance] = useState<number>(0)
  const [renewalDate, setRenewalDate] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchBalance()
    const interval = setInterval(fetchBalance, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [userId])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function fetchBalance() {
    const { data: user } = await supabase
      .from('users')
      .select('credits, subscription_tier')
      .eq('id', userId)
      .single()

    if (user) {
      setCredits(Number(user.credits) || 0)
      setTier(user.subscription_tier || 'free')
    }

    const { data: creditData } = await supabase
      .from('user_credits')
      .select('monthly_allowance, renewal_date')
      .eq('user_id', userId)
      .single()

    if (creditData) {
      setMonthlyAllowance(Number(creditData.monthly_allowance) || 0)
      setRenewalDate(creditData.renewal_date)
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const tierColors = {
    free: '#6b6b6b',
    tier1: '#d97757',
    tier2: '#9333ea'
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <span className="text-[14px] font-semibold text-[#2d2d2d]">
          {credits.toFixed(2)} credits
        </span>
        <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="currentColor"
          className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
        >
          <path d="M6 8L3 5h6L6 8z"/>
        </svg>
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-[#e0ddd4] rounded-lg shadow-lg py-2 z-50">
          {/* Current Balance */}
          <div className="px-4 py-3 border-b border-[#e0ddd4]">
            <div className="text-[11px] text-[#8b8b8b] mb-1">Current Balance</div>
            <div className="text-[24px] font-bold text-[#2d2d2d]">
              {credits.toFixed(2)} credits
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div
                  className="px-2 py-0.5 rounded text-[11px] font-medium text-white"
                style={{ backgroundColor: tierColors[tier as keyof typeof tierColors] }}
              >
                {tier === 'tier1' ? 'Starter' : tier === 'tier2' ? 'Pro' : 'Free'}
              </div>
            </div>
          </div>

          {/* Monthly Allowance */}
          {tier !== 'free' && (
            <div className="px-4 py-3 border-b border-[#e0ddd4]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[13px] text-[#6b6b6b]">Monthly Allowance</span>
                <span className="text-[13px] font-semibold text-[#2d2d2d]">
                  {monthlyAllowance.toFixed(2)} credits
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#6b6b6b]">Renews</span>
                <span className="text-[13px] text-[#2d2d2d]">
                  {formatDate(renewalDate)}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-2">
            <button
              onClick={() => {
                router.push('/pricing/top-up')
                setDropdownOpen(false)
              }}
              className="w-full px-4 py-2 bg-[#d97757] hover:bg-[#c86545] text-white rounded-lg text-[14px] font-medium transition-colors mb-2"
            >
              Top Up Credits
            </button>

            {tier === 'free' && (
              <button
                onClick={() => {
                  router.push('/pricing')
                  setDropdownOpen(false)
                }}
                className="w-full px-4 py-2 border border-[#e0ddd4] hover:bg-[#f5f5f5] text-[#2d2d2d] rounded-lg text-[14px] font-medium transition-colors mb-2"
              >
                Upgrade Plan
              </button>
            )}

            <button
              onClick={() => {
                router.push('/admin/usage')
                setDropdownOpen(false)
              }}
              className="w-full px-4 py-2 text-left text-[13px] text-[#6b6b6b] hover:bg-[#f5f5f5] rounded-lg transition-colors"
            >
              View Usage History
            </button>
          </div>
        </div>
      )}
    </div>
  )
}