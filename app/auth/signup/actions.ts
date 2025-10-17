'use server'

import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

// ✅ SAFELY define API keys and URL here for testing (temporary)
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uabnekabammltaymvsno.supabase.co'
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhYm5la2FiYW1tbHRheW12c25vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MjI4MjMsImV4cCI6MjA3NTM5ODgyM30.o-1T3MqJeuIDkAaPiaH134k9Hi4K_gkscLIzpZMHDZw'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export async function signup(formData: FormData) {
  const fullName = formData.get('fullName') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  try {
    console.log('🔵 Server-side signup attempt:', email)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: 'http://192.168.56.1:3000/auth/callback',
      },
    })

    if (error) {
      console.error('❌ Signup error:', error.message)
      return { error: error.message }
    }

    console.log('✅ Signup success:', data)
    redirect('/dashboard')
  } catch (err: any) {
    console.error('❌ Unexpected signup error:', err)
    return { error: 'Unexpected signup error: ' + err.message }
  }
}
