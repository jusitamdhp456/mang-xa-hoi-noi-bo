import { createSupabaseServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { WorkspaceDashboard } from '@/components/workspace/WorkspaceDashboard'

export default async function WorkspacePage({
  params
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const supabase = await createSupabaseServerClient()

  // Run database fetches in parallel to optimize loading times
  const [workspaceResult, categoriesResult, channelsResult, membersResult] = await Promise.all([
    supabase
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId)
      .single(),
    supabase
      .from('channel_categories')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('channels')
      .select('id, name, type, topic, is_private, category_id')
      .eq('workspace_id', workspaceId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('workspace_members')
      .select('role, profiles(id, display_name, avatar_key, status_text)')
      .eq('workspace_id', workspaceId)
  ])

  const workspace = workspaceResult.data
  if (!workspace) {
    notFound()
  }

  const categories = categoriesResult.data || []
  const channels = channelsResult.data || []
  const members = membersResult.data || []

  return (
    <WorkspaceDashboard
      workspaceId={workspaceId}
      workspaceName={workspace.name}
      categories={categories}
      channels={channels}
      members={members as any}
    />
  )
}
