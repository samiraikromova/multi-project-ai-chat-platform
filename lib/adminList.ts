import { createClient } from '@/lib/supabase/client'

export async function isAdminEmail(email: string): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase
    .from('admin_users')
    .select('email')
    .eq('email', email.toLowerCase())
    .single()

  return !!data
}