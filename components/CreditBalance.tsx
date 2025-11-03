"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function CreditBalance({ userId }: { userId: string }) {
  const [credits, setCredits] = useState<number | null>(null)
  const supabase = createClient()

  const fetchCredits = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single()

    if (!error && data) {
      setCredits(data.credits)
    }
  }

  useEffect(() => {
    fetchCredits()
    const interval = setInterval(fetchCredits, 3000) // Update every 3s
    return () => clearInterval(interval)
  }, [userId])

  if (credits === null) return <span className="text-[13px] text-[#999]">Loading...</span>

  const color = credits > 1000 ? '#2d2d2d' : credits > 100 ? '#d97757' : '#dc2626'

  return (
    <div className="flex items-center gap-1">
      <span className="text-[13px] font-semibold" style={{ color }}>
        {credits.toFixed(0)}
      </span>
      <span className="text-[11px] text-[#6b6b6b]">credits</span>
    </div>
  )
}