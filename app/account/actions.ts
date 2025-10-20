'use server'

import { createClient } from '@/lib/supabase/server'

export async function updateProfileAction({
  userId,
  name,
}: {
  userId: string
  name: string
}) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('users')
      .update({
        name,
        created_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) throw error

    return { success: true }
  } catch (err: any) {
    console.error('❌ Error updating profile:', err?.message || err)
    return { success: false, error: err?.message || 'Failed to update profile' }
  }
}
