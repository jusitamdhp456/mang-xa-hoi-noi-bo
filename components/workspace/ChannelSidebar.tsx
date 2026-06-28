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
    <div className="w-60 bg-gray-800 flex-shrink-0 flex flex-col h-full text-gray-300">
      <div className="h-12 flex items-center px-4 font-bold text-white border-b border-gray-700 shadow-sm shrink-0 hover:bg-gray-700 cursor-pointer transition-colors">
        {workspace?.name || 'Không gian làm việc'}
      </div>
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-700">
        
        {channelsWithoutCategory.map(channel => (
          <Link key={channel.id} href={`/workspace/${workspaceId}/channel/${channel.id}`}>
            <div className="px-2 py-1 rounded hover:bg-gray-700 cursor-pointer text-sm mb-1 flex items-center text-gray-400 hover:text-gray-200">
              <span className="mr-2 text-lg leading-none">{channel.type === 'voice' ? '🔊' : '#'}</span>
              <span className="truncate">{channel.name}</span>
            </div>
          </Link>
        ))}

        {categories?.map(category => {
          const categoryChannels = channels?.filter(c => c.category_id === category.id) || []
          return (
            <div key={category.id} className="mt-4">
              <div className="flex items-center justify-between px-2 mb-1 group">
                <p className="text-xs font-semibold text-gray-500 uppercase flex-1">{category.name}</p>
                <CreateChannelModal workspaceId={workspaceId} categoryId={category.id} />
              </div>
              {categoryChannels.map(channel => (
                <Link key={channel.id} href={`/workspace/${workspaceId}/channel/${channel.id}`}>
                  <div className="px-2 py-1 rounded hover:bg-gray-700 cursor-pointer text-sm mb-1 flex items-center text-gray-400 hover:text-gray-200">
                    <span className="mr-2 text-lg leading-none">{channel.type === 'voice' ? '🔊' : '#'}</span>
                    <span className="truncate">{channel.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          )
        })}
        
        <div className="mt-6 pt-2 border-t border-gray-700">
           <CreateChannelModal workspaceId={workspaceId} isCategory={true} />
        </div>
      </div>
    </div>
  )
}
