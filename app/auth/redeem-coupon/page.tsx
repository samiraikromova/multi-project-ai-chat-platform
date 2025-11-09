"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function RedeemCoupon() {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const redeemCoupon = async () => {
    setLoading(true)
    setMessage("")

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setMessage("Please log in first")
      setLoading(false)
      return
    }

    // Check if coupon exists and is valid
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()

    if (couponError || !coupon) {
      setMessage("Invalid coupon code")
      setLoading(false)
      return
    }

    // Check expiration
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      setMessage("This coupon has expired")
      setLoading(false)
      return
    }

    // Check max uses
    if (coupon.max_uses && coupon.uses >= coupon.max_uses) {
      setMessage("This coupon has reached its maximum uses")
      setLoading(false)
      return
    }

    // Get user data
    const { data: userData } = await supabase
      .from('users')
      .select('id, email, credits, subscription_tier')
      .eq('id', user.id)
      .single()

    if (!userData) {
      setMessage("User not found")
      setLoading(false)
      return
    }

    // Apply coupon
    if (coupon.type === 'trial') {
      // Grant trial credits (e.g., 3 months worth)
      const trialCredits = 10000 * coupon.months // Assuming tier1 monthly credits
      const newCredits = Number(userData.credits) + trialCredits

      await supabase
        .from('users')
        .update({ credits: newCredits })
        .eq('id', user.id)

      // Log transaction
      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: trialCredits,
        type: 'trial',
        payment_method: 'coupon',
        metadata: { coupon_code: code.toUpperCase() }
      })

      // Increment coupon usage
      await supabase
        .from('coupons')
        .update({ uses: coupon.uses + 1 })
        .eq('code', code.toUpperCase())

      setMessage(`Success! ${trialCredits} credits added to your account`)
      setTimeout(() => router.push('/dashboard'), 2000)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#f7f5ef] flex items-center justify-center p-6">
      <div className="bg-white border border-[#e0ddd4] rounded-2xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-[#2d2d2d] mb-2">Redeem Coupon</h1>
        <p className="text-[14px] text-[#6b6b6b] mb-6">
          Enter your coupon code to claim your free trial or discount
        </p>

        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="COUPON-CODE"
          className="w-full px-4 py-3 border border-[#e0ddd4] rounded-lg text-[15px] mb-4 uppercase"
          disabled={loading}
        />

        <button
          onClick={redeemCoupon}
          disabled={loading || !code}
          className="w-full px-4 py-3 bg-[#d97757] hover:bg-[#c86545] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Redeeming..." : "Redeem Coupon"}
        </button>

        {message && (
          <div className={`mt-4 p-3 rounded-lg text-[14px] ${
            message.startsWith('Success') 
              ? 'bg-green-50 text-green-800' 
              : 'bg-red-50 text-red-800'
          }`}>
            {message}
          </div>
        )}

        <button
          onClick={() => router.push('/dashboard')}
          className="w-full mt-4 text-[14px] text-[#6b6b6b] hover:text-[#2d2d2d]"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  )
}