'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/adminList'

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
        is_admin: isAdminEmail(email)
      }
    }
  })

  if (error) {
    console.error('❌ Signup error:', error.message)
    return { error: error.message }
  }

  if (data.user) {
    console.log('✅ User created:', data.user.id)
    revalidatePath('/', 'layout')
    redirect('/dashboard') // ✅ Redirect to dashboard after signup
  }

  return { error: 'Signup failed' }
}