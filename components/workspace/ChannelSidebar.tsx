import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CreateChannelModal } from './CreateChannelModal'
import { SidebarChannelLink } from './SidebarChannelLink'
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

  const channelsWithoutCategory = channels.filter(c => !c.category_id)

  return (
    <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 flex-shrink-0 flex flex-col h-full text-white z-10 transition-all">
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
        
        {channelsWithoutCategory.map(channel => (
          <SidebarChannelLink key={channel.id} workspaceId={workspaceId} channel={channel} />
        ))}

        {categories?.map(category => {
          const categoryChannels = channels.filter(c => c.category_id === category.id)
          return (
            <div key={category.id} className="mt-6">
              <div className="flex items-center justify-between px-3 mb-2 group">
                <p className="text-xs font-bold text-white/50 uppercase tracking-wider flex-1">{category.name}</p>
                <CreateChannelModal 
                  workspaceId={workspaceId} 
                  categoryId={category.id} 
                  categories={categories}
                  triggerType="icon"
                />
              </div>
              {categoryChannels.map(channel => (
                <SidebarChannelLink key={channel.id} workspaceId={workspaceId} channel={channel} />
              ))}
            </div>
          )
        })}
        
        <div className="mt-6 pt-4 border-t border-white/10 mb-4">
           <CreateChannelModal workspaceId={workspaceId} isCategory={true} />
        </div>
      </div>
      
      {/* User Panel */}
      <UserPanel user={user} profile={profile} />
    </div>
  )
}
