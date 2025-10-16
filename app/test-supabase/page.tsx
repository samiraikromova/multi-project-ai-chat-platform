"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TestSupabasePage() {
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>('')

  const testConnection = async () => {
    setResult(null)
    setError('')

    console.log('Environment Check:')
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

    try {
      const supabase = createClient()

      // Test 1: Simple query
      console.log('Test 1: Querying profiles...')
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)

      console.log('Profiles result:', { profiles, profileError })

      // Test 2: Auth health check
      console.log('Test 2: Getting session...')
      const { data: session, error: sessionError } = await supabase.auth.getSession()
      console.log('Session result:', { session, sessionError })

      // Test 3: Try signup with fake data
      console.log('Test 3: Testing signup endpoint...')
      const testEmail = `test${Date.now()}@example.com`
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'test123456',
        options: {
          data: {
            full_name: 'Test User'
          }
        }
      })

      console.log('Signup test result:', { signupData, signupError })

      setResult({
        profilesWork: !profileError,
        sessionWork: !sessionError,
        signupWork: !signupError,
        signupError: signupError?.message,
        envUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        envKeyExists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      })

    } catch (err: any) {
      console.error('Test error:', err)
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>

        <button
          onClick={testConnection}
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 mb-4"
        >
          Run Tests
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
            <p className="text-red-700 font-bold">Error:</p>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded p-4">
              <h2 className="font-bold mb-2">Environment Variables:</h2>
              <p>URL: {result.envUrl || 'MISSING!'}</p>
              <p>Anon Key: {result.envKeyExists ? 'EXISTS' : 'MISSING!'}</p>
            </div>

            <div className="bg-gray-50 rounded p-4">
              <h2 className="font-bold mb-2">Test Results:</h2>
              <p>✓ Database Query: {result.profilesWork ? '✅ WORKS' : '❌ FAILED'}</p>
              <p>✓ Auth Session: {result.sessionWork ? '✅ WORKS' : '❌ FAILED'}</p>
              <p>✓ Auth Signup: {result.signupWork ? '✅ WORKS' : '❌ FAILED'}</p>
              {result.signupError && (
                <p className="text-red-600 mt-2">Signup Error: {result.signupError}</p>
              )}
            </div>

            <div className="bg-gray-50 rounded p-4">
              <h2 className="font-bold mb-2">Full Result:</h2>
              <pre className="text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="font-bold mb-2">Debug Steps:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Open browser console (F12) before clicking "Run Tests"</li>
            <li>Check what errors appear</li>
            <li>If URL or Key is MISSING, your .env.local is not loaded</li>
            <li>If Database Query works but Auth Signup fails, it's an auth configuration issue</li>
          </ol>
        </div>
      </div>
    </div>
  )
}