import MemberList from '@/components/workspace/MemberList'
import { ChatArea } from '@/components/chat/ChatArea'
import { VoiceRoom } from '@/components/workspace/VoiceRoom'
import { NotificationBell } from '@/components/workspace/NotificationBell'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function ChannelPage({ params }: { params: Promise<{ workspaceId: string, channelId: string }> }) {
  const { workspaceId, channelId } = await params;
  
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: channel } = await supabase.from('channels').select('*').eq('id', channelId).single()
  
  let initialMessages = []
  if (channel?.type !== 'voice') {
    const { data: msgs } = await supabase
      .from('messages')
      .select('*, profiles(display_name, avatar_key), message_attachments(*)')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(50)
    if (msgs) initialMessages = msgs
  }

  // Get current user profile for VoiceRoom username
  let currentUsername = 'Khách'
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
    if (profile?.display_name) currentUsername = profile.display_name
  }

  return (
    <div className="flex-1 flex h-full">
      {/* Main Content */}
      <div className="flex-1 bg-white flex flex-col h-full overflow-hidden">
         <div className="h-12 border-b flex items-center px-4 font-semibold text-gray-800 shadow-sm shrink-0">
            <span className="text-gray-400 mr-2 text-lg">{channel?.type === 'voice' ? '🔊' : '#'}</span>
            <span className="truncate">{channel?.name || channelId}</span>
            {channel?.topic && <span className="ml-4 pl-4 border-l border-gray-300 text-xs text-gray-500 font-normal hidden md:block truncate">{channel.topic}</span>}
            
            <div className="ml-auto">
               <NotificationBell />
            </div>
         </div>
         
         {channel?.type === 'voice' ? (
           <VoiceRoom channelId={channelId} username={currentUsername} />
         ) : (
           <ChatArea 
             channelId={channelId} 
             channelName={channel?.name || ''} 
             channelType={channel?.type || 'text'} 
             workspaceId={workspaceId}
             initialMessages={initialMessages} 
           />
         )}
      </div>
      
      {/* Member Sidebar */}
      <MemberList workspaceId={workspaceId} channelId={channelId} />
    </div>
  );
}
