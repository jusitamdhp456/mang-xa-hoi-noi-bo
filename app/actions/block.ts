'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

// Block a user: hides their messages for the blocker. RLS restricts rows to the
// blocker, so the regular server client is sufficient.
export async function blockUser(targetUserId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }
  if (targetUserId === user.id) return { error: 'Không thể tự chặn mình' }
  const { error } = await supabase
    .from('blocked_users')
    .upsert({ blocker_id: user.id, blocked_id: targetUserId }, { onConflict: 'blocker_id,blocked_id' })
  if (error) return { error: 'Lỗi chặn người dùng' }
  return { success: true }
}

export async function unblockUser(targetUserId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }
  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', targetUserId)
  if (error) return { error: 'Lỗi bỏ chặn' }
  return { success: true }
}

// The set of user ids the current user has blocked.
export async function getBlockedIds(): Promise<string[]> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('blocked_users')
    .select('blocked_id')
    .eq('blocker_id', user.id)
  return (data || []).map((r) => r.blocked_id)
}
