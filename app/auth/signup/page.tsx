'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signup } from './actions'

export default function SignupPage() {
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await signup(formData)

      if (result?.error) {
        setError(result.error)
      }
      // Success redirect happens in the server action
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f5ef]">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-[#2d2d2d]">
          Create Account
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              className="w-full px-4 py-2 border border-[#e0ddd4] rounded-lg focus:outline-none focus:border-[#d97757]"
              required
              disabled={isPending}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              className="w-full px-4 py-2 border border-[#e0ddd4] rounded-lg focus:outline-none focus:border-[#d97757]"
              required
              disabled={isPending}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              className="w-full px-4 py-2 border border-[#e0ddd4] rounded-lg focus:outline-none focus:border-[#d97757]"
              required
              minLength={6}
              disabled={isPending}
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-[#d97757] hover:bg-[#c86545] text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-[#6b6b6b]">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-[#d97757] hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}
