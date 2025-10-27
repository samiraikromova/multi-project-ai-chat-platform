'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string

  console.log('🔵 Server-side signup attempt:', email)

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      }
    }
  })

  if (error) {
    console.error('❌ Signup error:', error.message)
    return { error: error.message }
  }

  if (data.user) {
    console.log('✅ User created:', data.user.id)

    // Auto-add to allowed_users
    const { error: allowError } = await supabase
      .from('allowed_users')
      .insert({
        email: email,
        is_active: true,
        reason: 'signup'
      })

    if (allowError) {
      console.error('❌ Failed to add to allowed_users:', allowError)
    } else {
      console.log('✅ User added to allowed_users')
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
  }

  return { error: 'Signup failed' }
}