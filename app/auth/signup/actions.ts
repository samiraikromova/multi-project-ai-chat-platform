'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/adminList'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    fullName: formData.get('fullName') as string,
  }

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.fullName,
        is_admin: isAdminEmail(data.email)
      }
    }
  })

  if (error) {
    console.error('Signup error:', error)
    redirect('/auth/error')
  }

  revalidatePath('/', 'layout')
  redirect('/account')  // Redirect to account page like the tutorial
}