'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createWorkspace(formData: FormData) {
  const name = formData.get('name') as string
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 10000)

  const supabase = await createSupabaseServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return redirect('/login')
  }

  const { data: workspace, error } = await supabase
    .from('workspaces')
    .insert({
      name,
      slug,
      owner_id: user.id
    })
    .select()
    .single()

  if (error || !workspace) {
    return redirect('/onboarding?error=Không thể tạo không gian làm việc')
  }

  await supabase.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: 'owner'
  })

  return redirect(`/workspace/${workspace.id}`)
}
