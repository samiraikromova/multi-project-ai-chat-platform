"use client"

export default function EnvDebugPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKeyExists = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseKeyLength = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Environment Variables Check</h1>

        <div className="space-y-4">
          <div className="border-b pb-4">
            <h2 className="font-semibold text-lg mb-2">Supabase URL</h2>
            <p className={`font-mono text-sm ${supabaseUrl ? 'text-green-600' : 'text-red-600'}`}>
              {supabaseUrl || '❌ MISSING!'}
            </p>
          </div>

          <div className="border-b pb-4">
            <h2 className="font-semibold text-lg mb-2">Supabase Anon Key</h2>
            <p className={`font-mono text-sm ${supabaseKeyExists ? 'text-green-600' : 'text-red-600'}`}>
              {supabaseKeyExists ? `✅ EXISTS (${supabaseKeyLength} characters)` : '❌ MISSING!'}
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <h3 className="font-semibold mb-2">If variables are MISSING:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Check that <code className="bg-gray-100 px-1">.env.local</code> exists in project root</li>
              <li>Make sure it contains:
                <pre className="bg-gray-100 p-2 mt-1 rounded text-xs">
{`NEXT_PUBLIC_SUPABASE_URL=https://uabnekabammltaymvsno.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here`}
                </pre>
              </li>
              <li>Restart your dev server after creating/updating <code className="bg-gray-100 px-1">.env.local</code></li>
              <li>If using Git Bash on Windows, try PowerShell or CMD instead</li>
            </ol>
          </div>

          {!supabaseUrl && (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <h3 className="font-semibold text-red-700 mb-2">❌ Environment variables not loaded!</h3>
              <p className="text-sm text-red-600">
                Your .env.local file is either missing or not being read by Next.js.
              </p>
            </div>
          )}

          {supabaseUrl && supabaseKeyExists && (
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <h3 className="font-semibold text-green-700 mb-2">✅ Environment variables loaded correctly!</h3>
              <p className="text-sm text-green-600">
                Your Supabase configuration is working. If you're still having issues,
                it's likely a Supabase Auth or RLS policy problem.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}