"use client"

import {use, useEffect, useState} from "react"
import { createClient } from "@/lib/supabase/client"

interface Coupon {
  code: string
  type: 'trial' | 'discount'
  months: number | null
  discount_percent: number | null
  max_uses: number | null
  uses: number
  expires_at: string | null
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [showModal, setShowModal] = useState(false)
  const [newCoupon, setNewCoupon] = useState<Partial<Coupon>>({
    code: '',
    type: 'trial',
    months: 3,
    discount_percent: null,
    max_uses: null,
    uses: 0,
    expires_at: null
  })

  const supabase = createClient()

  const load = async () => {
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .order('code', { ascending: true })
    setCoupons(data || [])
  }

  useEffect(() => { load() }, [])

  const generateCode = () => {
    const code = `TRIAL${Math.random().toString(36).substr(2, 8).toUpperCase()}`
    setNewCoupon({ ...newCoupon, code })
  }

  const createCoupon = async () => {
    if (!newCoupon.code) {
      alert('Code is required')
      return
    }

    const { error } = await supabase.from('coupons').insert({
      code: newCoupon.code,
      type: newCoupon.type,
      months: newCoupon.type === 'trial' ? newCoupon.months : null,
      discount_percent: newCoupon.type === 'discount' ? newCoupon.discount_percent : null,
      max_uses: newCoupon.max_uses,
      uses: 0,
      expires_at: newCoupon.expires_at
    })

    if (error) {
      alert('Error: ' + error.message)
    } else {
      setShowModal(false)
      setNewCoupon({
        code: '',
        type: 'trial',
        months: 3,
        discount_percent: null,
        max_uses: null,
        uses: 0,
        expires_at: null
      })
      load()
    }
  }

  const deleteCoupon = async (code: string) => {
    if (confirm(`Delete coupon ${code}?`)) {
      await supabase.from('coupons').delete().eq('code', code)
      load()
    }
  }

  return (
    <div className="p-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Coupon Management</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#d97757] text-white px-4 py-2 rounded hover:opacity-90"
        >
          + New Coupon
        </button>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#f7f5ef]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Code</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Value</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Uses</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Expires</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map(c => (
              <tr key={c.code} className="border-t">
                <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    c.type === 'trial' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {c.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {c.type === 'trial' ? `${c.months} months` : `${c.discount_percent}% off`}
                </td>
                <td className="px-4 py-3">
                  {c.uses} {c.max_uses ? `/ ${c.max_uses}` : ''}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => deleteCoupon(c.code)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px]">
            <h2 className="text-xl font-bold mb-4">Create Coupon</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Coupon Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 border p-2 rounded"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
                />
                <button
                  onClick={generateCode}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Generate
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                className="w-full border p-2 rounded"
                value={newCoupon.type}
                onChange={(e) => setNewCoupon({...newCoupon, type: e.target.value as 'trial' | 'discount'})}
              >
                <option value="trial">Trial (Free Months)</option>
                <option value="discount">Discount (%)</option>
              </select>
            </div>

            {newCoupon.type === 'trial' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Trial Duration (Months)</label>
                <input
                  type="number"
                  className="w-full border p-2 rounded"
                  value={newCoupon.months || 3}
                  onChange={(e) => setNewCoupon({...newCoupon, months: parseInt(e.target.value)})}
                />
              </div>
            )}

            {newCoupon.type === 'discount' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Discount Percent</label>
                <input
                  type="number"
                  className="w-full border p-2 rounded"
                  value={newCoupon.discount_percent || 0}
                  onChange={(e) => setNewCoupon({...newCoupon, discount_percent: parseInt(e.target.value)})}
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Max Uses (optional)</label>
              <input
                type="number"
                className="w-full border p-2 rounded"
                placeholder="Unlimited"
                value={newCoupon.max_uses || ''}
                onChange={(e) => setNewCoupon({...newCoupon, max_uses: e.target.value ? parseInt(e.target.value) : null})}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Expiration Date (optional)</label>
              <input
                type="date"
                className="w-full border p-2 rounded"
                value={newCoupon.expires_at || ''}
                onChange={(e) => setNewCoupon({...newCoupon, expires_at: e.target.value || null})}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={createCoupon}
                className="flex-1 bg-[#d97757] text-white py-2 rounded"
              >
                Create
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}