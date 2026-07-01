'use server'

import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logAudit } from '@/lib/audit'

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

  // Verify that at least one workspace member shares a DM thread with the current user.
  // This ensures the caller was genuinely invited via an in-app voice invite message.
  const serviceClient = createSupabaseServiceClient()

  const { data: userThreads } = await serviceClient
    .from('direct_thread_members')
    .select('thread_id')
    .eq('user_id', user.id)

  if (!userThreads || userThreads.length === 0) {
    return { error: 'Không có quyền gia nhập không gian làm việc này' }
  }

  const threadIds = userThreads.map(m => m.thread_id)

  const { data: wsMembers } = await serviceClient
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)

  if (!wsMembers || wsMembers.length === 0) {
    return { error: 'Không tìm thấy không gian làm việc' }
  }

  const wsMemberIds = wsMembers.map(m => m.user_id)

  const { data: sharedThread } = await serviceClient
    .from('direct_thread_members')
    .select('thread_id')
    .in('thread_id', threadIds)
    .in('user_id', wsMemberIds)
    .limit(1)

  if (!sharedThread || sharedThread.length === 0) {
    return { error: 'Không có quyền gia nhập không gian làm việc này' }
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

const ROLE_RANK: Record<string, number> = { owner: 3, admin: 2, mod: 1, member: 0 }

// The current user's role in a workspace (or null if not a member).
export async function getWorkspaceRole(workspaceId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('workspace_members').select('role')
    .eq('workspace_id', workspaceId).eq('user_id', user.id).maybeSingle()
  return data?.role || null
}

// Change a member's role. Owner can set admin/mod/member; admin can set mod/member.
// Nobody can change an owner, assign owner, or act on someone ranked >= themselves.
export async function updateMemberRole(workspaceId: string, targetUserId: string, newRole: string) {
  if (!['admin', 'mod', 'member'].includes(newRole)) return { error: 'Vai trò không hợp lệ' }
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }
  if (targetUserId === user.id) return { error: 'Không thể đổi vai trò của chính mình' }

  const service = createSupabaseServiceClient()
  const [{ data: me }, { data: target }] = await Promise.all([
    service.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', user.id).maybeSingle(),
    service.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', targetUserId).maybeSingle(),
  ])
  if (!me || (me.role !== 'owner' && me.role !== 'admin')) return { error: 'Bạn không có quyền' }
  if (!target) return { error: 'Thành viên không tồn tại' }
  if (target.role === 'owner') return { error: 'Không thể đổi vai trò chủ sở hữu' }
  // Can't act on someone ranked at or above you, nor grant a rank >= yours.
  if (ROLE_RANK[target.role] >= ROLE_RANK[me.role]) return { error: 'Không đủ quyền với thành viên này' }
  if (ROLE_RANK[newRole] >= ROLE_RANK[me.role]) return { error: 'Không thể cấp vai trò ngang/cao hơn bạn' }

  const { error } = await service
    .from('workspace_members').update({ role: newRole })
    .eq('workspace_id', workspaceId).eq('user_id', targetUserId)
  if (error) return { error: 'Lỗi cập nhật vai trò' }
  void logAudit(workspaceId, user.id, 'role_change', `Đổi vai trò một thành viên thành ${newRole}`)
  return { success: true }
}

// Remove a member from the workspace (owner/admin, on lower-ranked members).
export async function kickMember(workspaceId: string, targetUserId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }
  if (targetUserId === user.id) return { error: 'Không thể tự xoá mình' }

  const service = createSupabaseServiceClient()
  const [{ data: me }, { data: target }] = await Promise.all([
    service.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', user.id).maybeSingle(),
    service.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', targetUserId).maybeSingle(),
  ])
  if (!me || (me.role !== 'owner' && me.role !== 'admin')) return { error: 'Bạn không có quyền' }
  if (!target) return { error: 'Thành viên không tồn tại' }
  if (ROLE_RANK[target.role] >= ROLE_RANK[me.role]) return { error: 'Không đủ quyền với thành viên này' }

  const { error } = await service
    .from('workspace_members').delete()
    .eq('workspace_id', workspaceId).eq('user_id', targetUserId)
  if (error) return { error: 'Lỗi xoá thành viên' }
  void logAudit(workspaceId, user.id, 'kick_member', 'Xoá một thành viên khỏi không gian')
  return { success: true }
}

// Rename a workspace (owner/admin)
export async function updateWorkspace(workspaceId: string, name: string) {
  if (!name?.trim()) return { error: 'Tên không được để trống' }
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }
  const service = createSupabaseServiceClient()
  const { data: m } = await service.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', user.id).maybeSingle()
  if (!m || !['owner', 'admin'].includes(m.role)) return { error: 'Bạn không có quyền' }
  const { error } = await service.from('workspaces').update({ name: name.trim() }).eq('id', workspaceId)
  if (error) return { error: 'Lỗi đổi tên' }
  void logAudit(workspaceId, user.id, 'rename_workspace', `Đổi tên không gian thành "${name.trim()}"`)
  return { success: true }
}

// Delete a workspace (owner only)
export async function deleteWorkspace(workspaceId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }
  const service = createSupabaseServiceClient()
  const { data: m } = await service.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', user.id).maybeSingle()
  if (!m || m.role !== 'owner') return { error: 'Chỉ chủ sở hữu mới được xoá' }
  const { error } = await service.from('workspaces').delete().eq('id', workspaceId)
  if (error) return { error: 'Lỗi xoá không gian' }
  return { success: true }
}

// Join a workspace via an invite code (the code is the workspace id).
export async function joinWorkspaceByCode(code: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }
  const service = createSupabaseServiceClient()
  const { data: ws } = await service.from('workspaces').select('id, name').eq('id', code).maybeSingle()
  if (!ws) return { error: 'Lời mời không hợp lệ hoặc đã hết hạn' }
  const { data: existing } = await service.from('workspace_members').select('user_id').eq('workspace_id', ws.id).eq('user_id', user.id).maybeSingle()
  if (existing) return { success: true, workspaceId: ws.id, name: ws.name }
  const { error } = await service.from('workspace_members').insert({ workspace_id: ws.id, user_id: user.id, role: 'member' })
  if (error) return { error: 'Lỗi tham gia không gian' }
  return { success: true, workspaceId: ws.id, name: ws.name }
}

// Audit log for a workspace (owner/admin only; RLS enforces read access).
export async function getAuditLogs(workspaceId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('audit_logs')
    .select('id, action, detail, created_at, profiles:actor_id(display_name)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(100)
  return data || []
}
