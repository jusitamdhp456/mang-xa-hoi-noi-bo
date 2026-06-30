import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CreateChannelModal } from './CreateChannelModal'
import { SidebarCategoryGroup } from './SidebarCategoryGroup'
import { UserPanel } from './UserPanel'

export default async function ChannelSidebar({ workspaceId }: { workspaceId: string }) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser();

  // Run database fetches in parallel to optimize rendering speed
  const [profileResult, workspaceResult, categoriesResult, channelsResult] = await Promise.all([
    user ? supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single() : Promise.resolve({ data: null }),
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
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('sort_order', { ascending: true })
  ]);

  const profile = profileResult.data;
  const workspace = workspaceResult.data;
  const categories = categoriesResult.data || [];
  const channels = channelsResult.data || [];

  // Group channels globally by type
  const textChannels = channels.filter(c => c.type === 'text')
  const voiceChannels = channels.filter(c => c.type === 'voice')

  return (
    <div className="w-full bg-black/10 border-r border-white/10 flex-shrink-0 flex flex-col h-full text-white z-10 transition-all">
      {/* Workspace Header - Clicking it returns to Dashboard */}
      <div className="h-16 flex items-center justify-between px-5 font-bold text-lg text-white border-b border-white/10 shadow-sm shrink-0 hover:bg-white/5 cursor-pointer transition-colors group/header">
        <Link href={`/workspace/${workspaceId}`} className="truncate flex-1 py-4" title="Trang tổng quan không gian làm việc">
          {workspace?.name || 'Không gian làm việc'}
        </Link>
        <CreateChannelModal 
          workspaceId={workspaceId} 
          categories={categories} 
          triggerType="header" 
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-white/20">
        
        {/* Duyệt các Kênh Button */}
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/10 cursor-pointer text-sm mb-4 font-bold text-white/80 hover:text-white transition-colors group select-none">
          <span className="flex items-center gap-2">
            <span className="text-base leading-none">🔍</span>
            Duyệt các Kênh
          </span>
          <span className="bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
            Mới
          </span>
        </div>

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
