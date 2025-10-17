// app/test-direct/page.tsx (CREATE THIS FILE)
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DirectTestPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testSignup = async () => {
    setLoading(true)
    setResult(null)

    try {
      const supabase = createClient()

      console.log('Testing with:')
      console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

      // Try to sign up
      const testEmail = `test${Date.now()}@example.com`
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: 'test123456',
        options: {
          data: {
            full_name: 'Test User'
          }
        }
      })

      console.log('Raw response:', { data, error })

      setResult({
        success: !error,
        email: testEmail,
        userId: data?.user?.id,
        error: error?.message || 'None',
        errorDetails: error,
        rawResponse: JSON.stringify({ data, error }, null, 2)
      })

      // If successful, try to sign out
      if (data.user) {
        await supabase.auth.signOut()
      }

    } catch (err: any) {
      console.error('Test error:', err)
      setResult({
        success: false,
        error: err.message,
        stack: err.stack
      })
    } finally {
      setLoading(false)
    }
  }

  // Test raw fetch to auth endpoint
  const testRawFetch = async () => {
    setLoading(true)
    try {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/signup`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          email: `test${Date.now()}@example.com`,
          password: 'test123456'
        })
      })

      const text = await response.text()
      console.log('Raw response:', text)

      setResult({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: text,
        isHTML: text.startsWith('<!DOCTYPE') || text.startsWith('<html')
      })
    } catch (err: any) {
      setResult({
        error: err.message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Direct Supabase Auth Test</h1>

        <div className="space-y-4 mb-6">
          <div>
            <strong>Environment Check:</strong>
            <p>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
            <p>Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Exists' : '❌ Missing'}</p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={testSignup}
              disabled={loading}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? 'Testing...' : 'Test Signup (via Supabase Client)'}
            </button>

            <button
              onClick={testRawFetch}
              disabled={loading}
              className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
            >
              {loading ? 'Testing...' : 'Test Raw Fetch (Debug)'}
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-gray-50 rounded p-4">
            <h2 className="font-bold mb-2">Result:</h2>

            {result.success !== undefined && (
              <div className={`p-3 rounded mb-3 ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {result.success ? '✅ SUCCESS' : '❌ FAILED'}
              </div>
            )}

            {result.isHTML && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 p-3 rounded mb-3">
                ⚠️ Supabase returned HTML instead of JSON. This means:
                <ul className="list-disc ml-5 mt-2">
                  <li>Signups might be disabled in Supabase Dashboard</li>
                  <li>Your project might be paused</li>
                  <li>There might be an API restriction</li>
                </ul>
              </div>
            )}

            <pre className="text-xs overflow-auto bg-gray-800 text-green-400 p-4 rounded">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-bold mb-2">What to check in Supabase Dashboard:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Go to Authentication → Providers → Email</li>
            <li>Make sure "Enable Email provider" is ON</li>
            <li>Make sure "Enable sign ups" is ON</li>
            <li>Turn OFF "Confirm email" for testing</li>
            <li>Check Authentication → Settings → Enable email signups is ON</li>
            <li>Check Project Settings → General → Project is Active</li>
          </ol>
        </div>
      </div>
    </div>
  )
}