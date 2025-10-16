"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAdminEmail } from '@/lib/adminList'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()

      console.log('Starting signup for:', email)

      // Simple signup without checking existing profiles first
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName,
            is_admin: isAdminEmail(email)
          }
        }
      })

      console.log('Signup response:', {
        user: data?.user?.id,
        error: signUpError?.message,
        identities: data?.user?.identities?.length
      })

      if (signUpError) {
        console.error('Signup error:', signUpError)

        // Handle specific errors
        if (signUpError.message.includes('already') ||
            signUpError.message.includes('registered')) {
          setError('This email is already registered. Please sign in instead.')
        } else {
          setError(signUpError.message)
        }
        setLoading(false)
        return
      }

      // Check if user already exists
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError('This email is already registered. Please sign in instead.')
        setLoading(false)
        return
      }

      if (data.user) {
        console.log('User created successfully:', data.user.id)

        // Wait for trigger to complete
        await new Promise(resolve => setTimeout(resolve, 3000))

        setSuccess(true)

        // Redirect to dashboard
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
      } else {
        setError('Signup failed. Please try again.')
        setLoading(false)
      }
    } catch (err: any) {
      console.error('Unexpected error:', err)
      setError(err.message || 'An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f5ef] flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#d97757] rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl">
            🧠
          </div>
          <h1 className="text-[28px] font-normal text-[#2d2d2d] mb-2">
            Create your account
          </h1>
          <p className="text-[15px] text-[#6b6b6b]">
            Get started with AI Chat Platform
          </p>
        </div>

        <div className="bg-white border border-[#e0ddd4] rounded-2xl p-8 shadow-sm">
          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-[14px] text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-[14px] text-green-700">
                ✓ Account created! Redirecting...
              </p>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-[14px] font-medium text-[#2d2d2d] mb-2">
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 text-[15px] border border-[#e0ddd4] rounded-lg focus:outline-none focus:border-[#d97757] transition-colors"
                placeholder="John Doe"
                required
              />
            </div>

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
                minLength={6}
              />
              <p className="text-[12px] text-[#8b8b8b] mt-1.5">
                Must be at least 6 characters
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-[#d97757] hover:bg-[#c86545] disabled:bg-[#ccc] text-white font-medium py-3 rounded-lg text-[15px] transition-colors"
            >
              {loading ? 'Creating account...' : success ? 'Account created!' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#e0ddd4]">
            <p className="text-[12px] text-[#8b8b8b] text-center leading-relaxed">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-[14px] text-[#6b6b6b]">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-[#d97757] hover:text-[#c86545] font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <div className="text-center mt-8 pt-8 border-t border-[#e0ddd4]">
          <Link href="/" className="text-[13px] text-[#8b8b8b] hover:text-[#6b6b6b] transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}