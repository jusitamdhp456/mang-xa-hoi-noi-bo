'use server'

import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'

async function requireMember(workspaceId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' as const }
  const service = createSupabaseServiceClient()
  const { data: m } = await service
    .from('workspace_members').select('role')
    .eq('workspace_id', workspaceId).eq('user_id', user.id).maybeSingle()
  if (!m) return { error: 'Bạn không thuộc không gian này' as const }
  return { service, userId: user.id, role: m.role }
}

// Any member can add a shared soundboard sound.
export async function addCustomSound(workspaceId: string, name: string, objectKey: string) {
  const clean = (name || '').trim().slice(0, 40) || 'Âm thanh'
  if (!objectKey) return { error: 'Thiếu tệp âm thanh' }
  const ctx = await requireMember(workspaceId)
  if ('error' in ctx) return { error: ctx.error }
  const { error } = await ctx.service
    .from('custom_sounds')
    .insert({ workspace_id: workspaceId, name: clean, object_key: objectKey, created_by: ctx.userId })
  if (error) return { error: 'Lỗi thêm âm thanh' }
  return { success: true }
}

export async function getCustomSounds(workspaceId: string) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('custom_sounds')
    .select('id, name, object_key, created_by')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
  return data || []
}

export async function renameCustomSound(id: string, name: string) {
  const clean = (name || '').trim().slice(0, 40)
  if (!clean) return { error: 'Tên không hợp lệ' }
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }
  const service = createSupabaseServiceClient()
  const { data: snd } = await service.from('custom_sounds').select('workspace_id, created_by').eq('id', id).maybeSingle()
  if (!snd) return { error: 'Âm thanh không tồn tại' }
  const ctx = await requireMember(snd.workspace_id)
  if ('error' in ctx) return { error: ctx.error }
  const allowed = snd.created_by === user.id || ctx.role === 'owner' || ctx.role === 'admin'
  if (!allowed) return { error: 'Chỉ người tải lên hoặc quản trị mới đổi được' }
  const { error } = await service.from('custom_sounds').update({ name: clean }).eq('id', id)
  if (error) return { error: 'Lỗi đổi tên' }
  return { success: true }
}

export async function deleteCustomSound(id: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }
  const service = createSupabaseServiceClient()
  const { data: snd } = await service.from('custom_sounds').select('workspace_id, created_by').eq('id', id).maybeSingle()
  if (!snd) return { error: 'Âm thanh không tồn tại' }
  const ctx = await requireMember(snd.workspace_id)
  if ('error' in ctx) return { error: ctx.error }
  const allowed = snd.created_by === user.id || ctx.role === 'owner' || ctx.role === 'admin'
  if (!allowed) return { error: 'Chỉ người tải lên hoặc quản trị mới xoá được' }
  const { error } = await service.from('custom_sounds').delete().eq('id', id)
  if (error) return { error: 'Lỗi xoá' }
  return { success: true }
}
