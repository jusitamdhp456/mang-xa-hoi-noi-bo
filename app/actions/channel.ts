'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createCategory(workspaceId: string, formData: FormData) {
  const name = formData.get('name') as string
  
  if (!name || name.trim() === '') {
    return { error: 'Tên danh mục không được để trống' }
  }

  const supabase = await createSupabaseServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    return { error: 'Bạn cần đăng nhập để thực hiện' }
  }

  const { error } = await supabase
    .from('channel_categories')
    .insert({ workspace_id: workspaceId, name: name.trim() })

  if (error) {
    console.error('Error creating category:', error)
    if (error.code === '23505') {
      return { error: 'Tên danh mục này đã tồn tại trong không gian' }
    }
    return { error: `Không thể tạo danh mục: ${error.message}` }
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
  const { data: { user } } = await supabase.auth.getUser()

  // Format channel name according to standard rules
  const formattedName = name.trim().toLowerCase().replace(/\s+/g, '-')

  const { error } = await supabase
    .from('channels')
    .insert({
      workspace_id: workspaceId,
      category_id: categoryId,
      name: formattedName,
      type,
      is_private: isPrivate,
      created_by: user?.id
    })

  if (error) {
    console.error('Error creating channel:', error)
    if (error.code === '23505') {
      return { error: `Tên kênh "#${formattedName}" đã tồn tại trong không gian này` }
    }
    return { error: `Không thể tạo kênh: ${error.message}` }
  }

  revalidatePath(`/workspace/${workspaceId}`)
  return { success: true }
}
