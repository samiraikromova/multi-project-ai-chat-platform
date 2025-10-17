'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/adminList'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  // Type-casting here for convenience
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    fullName: formData.get('fullName') as string,
  }

  console.log('🔵 Attempting signup for:', data.email)
  console.log('🔵 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('🔵 Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  try {
    const { data: signupData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          is_admin: isAdminEmail(data.email)
        }
      }
    })

    console.log('🔵 Signup response:', {
      user: signupData?.user?.id,
      error: error?.message
    })

    if (error) {
      console.error('❌ Signup error:', error)

      // Check for specific errors
      if (error.message.includes('User already registered')) {
        redirect('/auth/error?message=already-registered')
      }

      redirect('/auth/error?message=' + encodeURIComponent(error.message))
    }

    if (!signupData.user) {
      redirect('/auth/error?message=signup-failed')
    }

    console.log('✅ Signup successful')

    revalidatePath('/', 'layout')
    redirect('/dashboard')
  } catch (err: any) {
    console.error('❌ Unexpected error:', err)
    redirect('/auth/error?message=' + encodeURIComponent(err.message || 'Unknown error'))
  }
}
