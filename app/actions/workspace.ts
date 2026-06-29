'use server'

import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createWorkspace(formData: FormData) {
  const name = formData.get('name') as string
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 10000)

  const supabase = await createSupabaseServerClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    return { error: 'Bạn cần đăng nhập để thực hiện' }
  }

  // Đảm bảo profile luôn tồn tại trước khi tạo workspace (tránh lỗi foreign key constraint nếu user đăng ký từ trước)
  await supabase.from('profiles').upsert({
    id: user.id,
    display_name: user.email?.split('@')[0] || 'User',
    username: user.email?.split('@')[0] + '-' + Math.floor(Math.random() * 10000)
  }, { onConflict: 'id', ignoreDuplicates: true })

  const workspaceId = crypto.randomUUID()
  const { error } = await supabase
    .from('workspaces')
    .insert({
      id: workspaceId,
      name,
      slug,
      owner_id: user.id
    })

  if (error) {
    return { error: `Lỗi Supabase: ${error?.message || 'Không có dữ liệu trả về'}` }
  }

  const { error: memberError } = await supabase.from('workspace_members').insert({
    workspace_id: workspaceId,
    user_id: user.id,
    role: 'owner'
  })

  if (memberError) {
    return { error: 'Lỗi khi thêm thành viên' }
  }

  return { workspaceId }
}

export async function updateWorkspaceIcon(workspaceId: string, iconUrl: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  // Cần kiểm tra quyền sở hữu hoặc admin ở đây, nhưng tạm thời cho phép owner
  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return { error: 'Không có quyền cập nhật logo' }
  }

  const { error } = await supabase
    .from('workspaces')
    .update({ icon_key: iconUrl })
    .eq('id', workspaceId)

  if (error) {
    return { error: 'Lỗi cập nhật logo workspace' }
  }

  return { success: true }
}

export async function createGroupWorkspaceWithPartner(partnerId: string, partnerName: string, customGroupName: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (!user || authError) {
    return { error: 'Bạn cần đăng nhập để thực hiện' }
  }

  const workspaceId = crypto.randomUUID()
  const slug = customGroupName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 10000)

  // 1. Tạo workspace
  const { error: wsError } = await supabase
    .from('workspaces')
    .insert({
      id: workspaceId,
      name: customGroupName,
      slug,
      owner_id: user.id
    })

  if (wsError) {
    console.error('Error creating workspace:', wsError)
    return { error: `Lỗi tạo nhóm: ${wsError.message}` }
  }

  // 2. Thêm người dùng hiện tại làm owner
  await supabase.from('workspace_members').insert({
    workspace_id: workspaceId,
    user_id: user.id,
    role: 'owner'
  })

  // 3. Thêm đối tác làm member
  await supabase.from('workspace_members').insert({
    workspace_id: workspaceId,
    user_id: partnerId,
    role: 'member'
  })

  // 4. Tạo kênh chữ mặc định "phòng-thoại-chung"
  const serviceClient = createSupabaseServiceClient();
  await serviceClient.from('channels').insert({
    workspace_id: workspaceId,
    name: 'phòng-thoại-chung',
    type: 'text',
    is_private: false,
    created_by: user.id
  })

  // 5. Tạo kênh giọng nói mặc định "kênh-chơi-game"
  await serviceClient.from('channels').insert({
    workspace_id: workspaceId,
    name: 'kênh-chơi-game',
    type: 'voice',
    is_private: false,
    created_by: user.id
  })

  return { workspaceId }
}

export async function joinWorkspaceIfInvited(workspaceId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { data: existingMember } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingMember) {
    return { success: true }
  }

  const { error } = await supabase.from('workspace_members').insert({
    workspace_id: workspaceId,
    user_id: user.id,
    role: 'member'
  })

  if (error) {
    console.error('Error joining workspace:', error)
    return { error: 'Không thể gia nhập không gian làm việc' }
  }

  return { success: true }
}
