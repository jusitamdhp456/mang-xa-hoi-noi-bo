'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createCategory(workspaceId: string, formData: FormData) {
  const name = formData.get('name') as string
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from('channel_categories')
    .insert({ workspace_id: workspaceId, name })

  if (error) {
    console.error('Error creating category:', error)
    return { error: 'Không thể tạo danh mục' }
  }

  revalidatePath(`/workspace/${workspaceId}`)
  return { success: true }
}

export async function createChannel(workspaceId: string, categoryId: string | null, formData: FormData) {
  const name = formData.get('name') as string
  const type = formData.get('type') as string || 'text'
  const isPrivate = formData.get('is_private') === 'true'
  
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('channels')
    .insert({
      workspace_id: workspaceId,
      category_id: categoryId,
      name: name.toLowerCase().replace(/\s+/g, '-'),
      type,
      is_private: isPrivate,
      created_by: user?.id
    })

  if (error) {
    console.error('Error creating channel:', error)
    return { error: 'Không thể tạo kênh' }
  }

  revalidatePath(`/workspace/${workspaceId}`)
  return { success: true }
}
