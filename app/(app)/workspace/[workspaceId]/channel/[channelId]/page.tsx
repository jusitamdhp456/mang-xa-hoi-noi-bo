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
    <div className="flex-1 flex h-full bg-transparent">
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white/20">
         <div className="h-16 border-b border-white/50 flex items-center px-6 font-bold text-lg text-zinc-800 shadow-sm shrink-0 bg-white/30 backdrop-blur-md">
            <span className="text-pink-400 mr-3 text-2xl drop-shadow-sm">{channel?.type === 'voice' ? '🔊' : '#'}</span>
            <span className="truncate">{channel?.name || channelId}</span>
            {channel?.topic && <span className="ml-4 pl-4 border-l border-white/60 text-sm text-zinc-600 font-medium hidden md:block truncate">{channel.topic}</span>}
            
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
