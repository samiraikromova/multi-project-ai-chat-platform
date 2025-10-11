"use client"
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f5ef] flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#d97757] rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl">
            🧠
          </div>
          <h1 className="text-[28px] font-normal text-[#2d2d2d] mb-2">
            Welcome back
          </h1>
          <p className="text-[15px] text-[#6b6b6b]">
            Sign in to your account to continue
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-[#e0ddd4] rounded-2xl p-8 shadow-sm">
          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-[14px] text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[14px] font-medium text-[#2d2d2d] mb-2">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 text-[15px] border border-[#e0ddd4] rounded-lg focus:outline-none focus:border-[#d97757] transition-colors"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#2d2d2d] mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 text-[15px] border border-[#e0ddd4] rounded-lg focus:outline-none focus:border-[#d97757] transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#d97757] hover:bg-[#c86545] disabled:bg-[#ccc] text-white font-medium py-3 rounded-lg text-[15px] transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Footer Links */}
        <div className="text-center mt-6">
          <p className="text-[14px] text-[#6b6b6b]">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-[#d97757] hover:text-[#c86545] font-medium transition-colors">
              Sign up
            </Link>
          </p>
        </div>

        {/* Additional Help */}
        <div className="text-center mt-8 pt-8 border-t border-[#e0ddd4]">
          <Link href="/" className="text-[13px] text-[#8b8b8b] hover:text-[#6b6b6b] transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}