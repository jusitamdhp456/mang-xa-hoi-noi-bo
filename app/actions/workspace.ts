'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
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
