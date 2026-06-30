'use server'

import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createCategory(workspaceId: string, formData: FormData) {
  const name = formData.get('name') as string
  
  if (!name || name.trim() === '') {
    return { error: 'Tên danh mục không được để trống' }
  }

  const supabase = await createSupabaseServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Lỗi: Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn' }
  }

  // Verify workspace membership
  const { data: member, error: memberError } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (memberError) {
    return { error: `Lỗi kiểm tra thành viên: ${memberError.message}` }
  }

  if (!member) {
    return { error: 'Bạn không có quyền tạo danh mục: Bạn không phải là thành viên của không gian này.' }
  }

  // Use service client to bypass RLS constraint on insert after secure verification
  const serviceClient = createSupabaseServiceClient()
  const { error } = await serviceClient
    .from('channel_categories')
    .insert({ workspace_id: workspaceId, name: name.trim() })

  if (error) {
    console.error('Error creating category:', error)
    if (error.code === '23505') {
      return { error: 'Tên danh mục này đã tồn tại trong không gian' }
    }
    return { error: `Không thể tạo danh mục: ${error.message} (${error.code})` }
  }

  revalidatePath(`/workspace/${workspaceId}`)
  return { success: true }
}

export async function createChannel(workspaceId: string, categoryId: string | null, formData: FormData) {
  const name = formData.get('name') as string
  const type = formData.get('type') as string || 'text'
  const isPrivate = formData.get('is_private') === 'true'
  
  if (!name || name.trim() === '') {
    return { error: 'Tên kênh không được để trống' }
  }

  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Lỗi: Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn' }
  }

  // Debug check: Verify if user is in workspace_members table
  const { data: member, error: memberError } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (memberError) {
    return { error: `Lỗi kiểm tra thành viên: ${memberError.message}` }
  }

  if (!member) {
    return { error: `Bạn không có quyền tạo kênh: Bạn không phải là thành viên của không gian này.` }
  }

  // Format channel name according to standard rules
  const formattedName = name.trim().toLowerCase().replace(/\s+/g, '-')

  // Use service client to bypass RLS constraint on insert after secure verification
  const serviceClient = createSupabaseServiceClient()
  const { error } = await serviceClient
    .from('channels')
    .insert({
      workspace_id: workspaceId,
      category_id: categoryId,
      name: formattedName,
      type,
      is_private: isPrivate,
      created_by: user.id
    })

  if (error) {
    console.error('Error creating channel:', error)
    if (error.code === '23505') {
      return { error: `Tên kênh "#${formattedName}" đã tồn tại trong không gian này` }
    }
    return { error: `Không thể tạo kênh: ${error.message} (${error.code})` }
  }

  revalidatePath(`/workspace/${workspaceId}`)
  return { success: true }
}

// Rename a channel (workspace owner/admin/mod)
export async function updateChannel(channelId: string, name: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }
  if (!name?.trim()) return { error: 'Tên kênh không được để trống' }

  const service = createSupabaseServiceClient()
  const { data: channel } = await service.from('channels').select('workspace_id').eq('id', channelId).single()
  if (!channel) return { error: 'Kênh không tồn tại' }

  const { data: m } = await supabase
    .from('workspace_members').select('role')
    .eq('workspace_id', channel.workspace_id).eq('user_id', user.id).maybeSingle()
  if (!m || !['owner', 'admin', 'mod'].includes(m.role)) return { error: 'Bạn không có quyền sửa kênh' }

  const formatted = name.trim().toLowerCase().replace(/\s+/g, '-')
  const { error } = await service.from('channels').update({ name: formatted }).eq('id', channelId)
  if (error) {
    if (error.code === '23505') return { error: 'Tên kênh này đã tồn tại' }
    return { error: 'Lỗi đổi tên kênh' }
  }
  revalidatePath(`/workspace/${channel.workspace_id}`)
  return { success: true }
}

// Delete a channel (workspace owner/admin/mod)
export async function deleteChannel(channelId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const service = createSupabaseServiceClient()
  const { data: channel } = await service.from('channels').select('workspace_id').eq('id', channelId).single()
  if (!channel) return { error: 'Kênh không tồn tại' }

  const { data: m } = await supabase
    .from('workspace_members').select('role')
    .eq('workspace_id', channel.workspace_id).eq('user_id', user.id).maybeSingle()
  if (!m || !['owner', 'admin', 'mod'].includes(m.role)) return { error: 'Bạn không có quyền xoá kênh' }

  const { error } = await service.from('channels').delete().eq('id', channelId)
  if (error) return { error: 'Lỗi xoá kênh' }
  revalidatePath(`/workspace/${channel.workspace_id}`)
  return { success: true, workspaceId: channel.workspace_id }
}

async function requireChannelManager(channelId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' as const }
  const service = createSupabaseServiceClient()
  const { data: channel } = await service.from('channels').select('workspace_id, type, sort_order').eq('id', channelId).single()
  if (!channel) return { error: 'Kênh không tồn tại' as const }
  const { data: m } = await supabase
    .from('workspace_members').select('role')
    .eq('workspace_id', channel.workspace_id).eq('user_id', user.id).maybeSingle()
  if (!m || !['owner', 'admin', 'mod'].includes(m.role)) return { error: 'Bạn không có quyền' as const }
  return { service, channel }
}

// Set / clear a channel's topic
export async function updateChannelTopic(channelId: string, topic: string) {
  const ctx = await requireChannelManager(channelId)
  if ('error' in ctx) return { error: ctx.error }
  const { error } = await ctx.service.from('channels').update({ topic: topic.trim() || null }).eq('id', channelId)
  if (error) return { error: 'Lỗi cập nhật chủ đề' }
  revalidatePath(`/workspace/${ctx.channel.workspace_id}`)
  return { success: true }
}

// Move a channel up/down by swapping sort_order with its same-type neighbor
export async function moveChannel(channelId: string, direction: 'up' | 'down') {
  const ctx = await requireChannelManager(channelId)
  if ('error' in ctx) return { error: ctx.error }
  const { service, channel } = ctx
  const { data: siblings } = await service
    .from('channels')
    .select('id, sort_order')
    .eq('workspace_id', channel.workspace_id)
    .eq('type', channel.type)
    .order('sort_order', { ascending: true })
  if (!siblings) return { error: 'Lỗi đọc danh sách kênh' }
  const idx = siblings.findIndex((c) => c.id === channelId)
  const target = direction === 'up' ? idx - 1 : idx + 1
  if (idx === -1 || target < 0 || target >= siblings.length) return { success: true } // at the edge
  // Swap positions in the array, then rewrite sequential sort_order for all
  // (defaults are often all 0, so a plain value-swap wouldn't change anything).
  const ordered = [...siblings]
  ;[ordered[idx], ordered[target]] = [ordered[target], ordered[idx]]
  await Promise.all(
    ordered.map((c, i) => service.from('channels').update({ sort_order: i }).eq('id', c.id))
  )
  revalidatePath(`/workspace/${channel.workspace_id}`)
  return { success: true }
}
