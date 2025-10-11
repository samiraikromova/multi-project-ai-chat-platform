import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">AI Chat Platform</h1>
        <p className="text-xl mb-8">Multi-Project Dashboard</p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/login"
            className="bg-blue-600 text-white px-6 py-3 rounded inline-block"
          >
            Login
          </Link>
          <Link
            href="/auth/signup"
            className="bg-gray-200 px-6 py-3 rounded inline-block"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  )
}