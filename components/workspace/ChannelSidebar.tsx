import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CreateChannelModal } from './CreateChannelModal'

export default async function ChannelSidebar({ workspaceId }: { workspaceId: string }) {
  const supabase = await createSupabaseServerClient()

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .single()

  const { data: categories } = await supabase
    .from('channel_categories')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('sort_order', { ascending: true })

  const { data: channels } = await supabase
    .from('channels')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('sort_order', { ascending: true })

  const channelsWithoutCategory = channels?.filter(c => !c.category_id) || []

  return (
    <div className="w-64 bg-white/40 backdrop-blur-xl border-r border-white/50 flex-shrink-0 flex flex-col h-full text-zinc-700 z-10 transition-all">
      <div className="h-16 flex items-center px-5 font-bold text-lg text-zinc-900 border-b border-white/50 shadow-sm shrink-0 hover:bg-white/50 cursor-pointer transition-colors">
        {workspace?.name || 'Không gian làm việc'}
      </div>
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-zinc-300">
        
        {channelsWithoutCategory.map(channel => (
          <Link key={channel.id} href={`/workspace/${workspaceId}/channel/${channel.id}`}>
            <div className="px-3 py-2 rounded-xl hover:bg-white/60 hover:shadow-sm cursor-pointer text-sm mb-1 flex items-center text-zinc-600 hover:text-zinc-900 font-medium transition-all">
              <span className="mr-3 text-lg leading-none">{channel.type === 'voice' ? '🔊' : '#'}</span>
              <span className="truncate">{channel.name}</span>
            </div>
          </Link>
        ))}

        {categories?.map(category => {
          const categoryChannels = channels?.filter(c => c.category_id === category.id) || []
          return (
            <div key={category.id} className="mt-6">
              <div className="flex items-center justify-between px-3 mb-2 group">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex-1">{category.name}</p>
                <CreateChannelModal workspaceId={workspaceId} categoryId={category.id} />
              </div>
              {categoryChannels.map(channel => (
                <Link key={channel.id} href={`/workspace/${workspaceId}/channel/${channel.id}`}>
                  <div className="px-3 py-2 rounded-xl hover:bg-white/60 hover:shadow-sm cursor-pointer text-sm mb-1 flex items-center text-zinc-600 hover:text-zinc-900 font-medium transition-all">
                    <span className="mr-3 text-lg leading-none">{channel.type === 'voice' ? '🔊' : '#'}</span>
                    <span className="truncate">{channel.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          )
        })}
        
        <div className="mt-6 pt-4 border-t border-white/50">
           <CreateChannelModal workspaceId={workspaceId} isCategory={true} />
        </div>
      </div>
    </div>
  )
}
