import AccountFormClient from './AccountFormClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Redirect to login if not logged in
    redirect('/auth/login')
  }

  // Fetch user profile from "users" table
  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    return <p>Failed to load profile</p>
  }

  return <AccountFormClient user={profile} />
}
