import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { WorkspaceDashboard } from '@/components/workspace/WorkspaceDashboard'

export default async function WorkspacePage({
  params
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Kiểm tra quyền bằng RLS bình thường
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user?.id || '')
    .maybeSingle()

  if (!membership) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-black/20 text-white p-8 h-full rounded-2xl border border-white/5 shadow-xl m-4">
        <div className="w-24 h-24 mb-6 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-lg">
          <span className="text-4xl">🔒</span>
        </div>
        <h1 className="text-2xl font-bold mb-4 text-center">Không thể truy cập không gian này</h1>
        <p className="text-zinc-400 mb-8 text-center max-w-md">
          Không gian làm việc này không tồn tại, hoặc bạn chưa được mời tham gia. Vui lòng kiểm tra lại đường dẫn hoặc yêu cầu quản trị viên thêm bạn vào.
        </p>
        <Link href="/channels/me" className="px-6 py-3 bg-[#5865F2] hover:bg-[#4752C4] rounded-xl font-bold transition-all shadow-md hover:shadow-lg">
          Trở về Trang chủ
        </Link>
      </div>
    )
  }

  // 2. Lấy dữ liệu bằng serviceClient để đảm bảo không bị lỗi RLS ngầm
  const serviceClient = createSupabaseServiceClient()
  const [workspaceResult, categoriesResult, channelsResult, membersResult] = await Promise.all([
    serviceClient
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId)
      .single(),
    serviceClient
      .from('channel_categories')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .order('sort_order', { ascending: true }),
    serviceClient
      .from('channels')
      .select('id, name, type, topic, is_private, category_id')
      .eq('workspace_id', workspaceId)
      .order('sort_order', { ascending: true }),
    serviceClient
      .from('workspace_members')
      .select('role, profiles(id, display_name, avatar_key, status_text)')
      .eq('workspace_id', workspaceId)
  ])

  const workspace = workspaceResult.data

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
