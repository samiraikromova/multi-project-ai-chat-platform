import { createClient } from '@/lib/supabase/server'

export async function isUserAllowed(email: string): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('allowed_users')
    .select('email, is_active')
    .eq('email', email)
    .eq('is_active', true)
    .single()

  if (error || !data) return false
  return true
}

export async function addUserToAllowList(email: string, reason: string = 'payment_success') {
  const supabase = await createClient()

  const { error } = await supabase
    .from('allowed_users')
    .upsert({
      email,
      is_active: true,
      reason,
      updated_at: new Date().toISOString()
    })

  return !error
}

export async function removeUserFromAllowList(email: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('allowed_users')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('email', email)

  return !error
}