import { signup } from './actions'
import Link from 'next/link'

export default function SignupPage() {
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
          <form className="space-y-5">
            <div>
              <label htmlFor="fullName" className="block text-[14px] font-medium text-[#2d2d2d] mb-2">
                Full name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                className="w-full px-4 py-3 text-[15px] border border-[#e0ddd4] rounded-lg focus:outline-none focus:border-[#d97757] transition-colors"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-[14px] font-medium text-[#2d2d2d] mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="w-full px-4 py-3 text-[15px] border border-[#e0ddd4] rounded-lg focus:outline-none focus:border-[#d97757] transition-colors"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[14px] font-medium text-[#2d2d2d] mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
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
              formAction={signup}
              className="w-full bg-[#d97757] hover:bg-[#c86545] text-white font-medium py-3 rounded-lg text-[15px] transition-colors"
            >
              Sign up
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

