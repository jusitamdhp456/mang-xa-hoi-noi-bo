import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CreateChannelModal } from './CreateChannelModal'
import { SidebarCategoryGroup } from './SidebarCategoryGroup'
import { UserPanel } from './UserPanel'
import { ServerSettingsMenu } from './ServerSettingsMenu'
import { Compass } from 'lucide-react'

export default async function ChannelSidebar({ workspaceId }: { workspaceId: string }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Fetch user profile and member role first
  const [profileResult, memberResult] = await Promise.all([
    user ? supabase.from('profiles').select('*').eq('id', user.id).single() : Promise.resolve({ data: null }),
    user ? supabase.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  // 2. Fetch workspace data using serviceClient to avoid RLS false-negatives
  const serviceClient = createSupabaseServiceClient();
  const [workspaceResult, categoriesResult, channelsResult] = await Promise.all([
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
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('sort_order', { ascending: true }),
  ]);

  const profile = profileResult.data;
  const workspace = workspaceResult.data;
  const categories = categoriesResult.data || [];
  const channels = channelsResult.data || [];
  const myRole = (memberResult.data as { role?: string } | null)?.role || 'member';
  const canManageServer = myRole === 'owner' || myRole === 'admin';

  // Group channels globally by type
  const textChannels = channels.filter(c => c.type === 'text')
  const voiceChannels = channels.filter(c => c.type === 'voice')

  return (
    <div className="w-full bg-transparent border-r border-white/10 flex-shrink-0 flex flex-col h-full text-white z-10 transition-all">
      {/* Workspace Header - Clicking it returns to Dashboard */}
      <div className="h-16 flex items-center justify-between px-5 font-bold text-lg text-white border-b border-white/10 shadow-sm shrink-0 hover:bg-white/5 cursor-pointer transition-colors group/header">
        <Link href={`/workspace/${workspaceId}`} className="truncate flex-1 py-4" title="Trang tổng quan không gian làm việc">
          {workspace?.name || 'Không gian làm việc'}
        </Link>
        {canManageServer && (
          <ServerSettingsMenu
            workspaceId={workspaceId}
            workspaceName={workspace?.name || ''}
            isOwner={myRole === 'owner'}
          />
        )}
        <CreateChannelModal
          workspaceId={workspaceId}
          categories={categories}
          triggerType="header"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin scrollbar-thumb-white/20">

        {/* Browse channels (Discord-style muted row) */}
        <Link
          href={`/workspace/${workspaceId}`}
          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/10 cursor-pointer text-sm mb-3 font-medium text-white/60 hover:text-white transition-colors select-none"
        >
          <Compass size={18} className="shrink-0" />
          Duyệt các kênh
        </Link>

        {/* Kênh Chat collapsible group */}
        <SidebarCategoryGroup
          title="Kênh Chat"
          type="text"
          channels={textChannels}
          workspaceId={workspaceId}
          categories={categories}
        />

        {/* Kênh đàm thoại collapsible group */}
        <SidebarCategoryGroup
          title="Kênh đàm thoại"
          type="voice"
          channels={voiceChannels}
          workspaceId={workspaceId}
          categories={categories}
        />
        
      </div>
      
      {/* User Panel */}
      <UserPanel user={user} profile={profile} channels={channels} workspaceName={workspace?.name} />
    </div>
  )
}
