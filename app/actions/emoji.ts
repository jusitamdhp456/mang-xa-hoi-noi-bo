'use server'

import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'

async function requireWorkspaceManager(workspaceId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' as const }
  const service = createSupabaseServiceClient()
  const { data: m } = await service
    .from('workspace_members').select('role')
    .eq('workspace_id', workspaceId).eq('user_id', user.id).maybeSingle()
  if (!m || !['owner', 'admin'].includes(m.role)) return { error: 'Bạn không có quyền' as const }
  return { service, userId: user.id }
}

// Add a server custom emoji. Name is normalized to :alnum_:.
export async function addCustomEmoji(workspaceId: string, name: string, objectKey: string) {
  const clean = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
  if (!clean) return { error: 'Tên emoji không hợp lệ (chỉ chữ/số/gạch dưới)' }
  if (!objectKey) return { error: 'Thiếu ảnh emoji' }
  const ctx = await requireWorkspaceManager(workspaceId)
  if ('error' in ctx) return { error: ctx.error }
  const { error } = await ctx.service
    .from('custom_emojis')
    .insert({ workspace_id: workspaceId, name: clean, object_key: objectKey, created_by: ctx.userId })
  if (error) return { error: error.message.includes('duplicate') ? 'Tên emoji đã tồn tại' : 'Lỗi thêm emoji' }
  return { success: true }
}

export async function getCustomEmojis(workspaceId: string) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('custom_emojis')
    .select('id, name, object_key')
    .eq('workspace_id', workspaceId)
    .order('name', { ascending: true })
  return data || []
}

export async function deleteCustomEmoji(id: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }
  const service = createSupabaseServiceClient()
  const { data: emoji } = await service.from('custom_emojis').select('workspace_id').eq('id', id).maybeSingle()
  if (!emoji) return { error: 'Emoji không tồn tại' }
  const ctx = await requireWorkspaceManager(emoji.workspace_id)
  if ('error' in ctx) return { error: ctx.error }
  const { error } = await service.from('custom_emojis').delete().eq('id', id)
  if (error) return { error: 'Lỗi xoá emoji' }
  return { success: true }
}
