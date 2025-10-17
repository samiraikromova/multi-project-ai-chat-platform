import { login } from './actions'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#f7f5ef] flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
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

        <div className="bg-white border border-[#e0ddd4] rounded-2xl p-8 shadow-sm">
          <form className="space-y-5">
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
              />
            </div>

            <button
              formAction={login}
              className="w-full bg-[#d97757] hover:bg-[#c86545] text-white font-medium py-3 rounded-lg text-[15px] transition-colors"
            >
              Sign in
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <p className="text-[14px] text-[#6b6b6b]">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-[#d97757] hover:text-[#c86545] font-medium transition-colors">
              Sign up
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

