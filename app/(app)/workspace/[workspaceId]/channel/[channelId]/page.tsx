import Link from 'next/link'
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
  const { data: msgs } = await supabase
    .from('messages')
    .select('*, profiles!messages_sender_id_fkey(display_name, avatar_key), message_attachments(*), message_reactions(emoji, user_id)')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true })
    .limit(50)
  if (msgs) initialMessages = msgs

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
         <div className="h-16 border-b border-white/10 flex items-center px-4 sm:px-6 font-bold text-lg text-white shadow-sm shrink-0 bg-white/5 backdrop-blur-md">
            <Link 
              href={`/workspace/${workspaceId}`}
              className="md:hidden p-2 bg-white/5 rounded-xl hover:bg-white/10 text-white cursor-pointer mr-2 flex items-center justify-center"
              title="Quay lại danh sách kênh"
            >
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>

            <span className="text-cyan-400 mr-2 sm:mr-3 text-2xl drop-shadow-sm">{channel?.type === 'voice' ? '🔊' : '#'}</span>
            <span className="truncate">{channel?.name || channelId}</span>
            {channel?.topic && <span className="ml-4 pl-4 border-l border-white/20 text-sm text-white/70 font-medium hidden md:block truncate">{channel.topic}</span>}
            
            <div className="ml-auto">
               <NotificationBell />
            </div>
         </div>
         
         {channel?.type === 'voice' ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Upper Part: Calling viewport */}
              <div className="h-[45%] border-b border-white/10 flex-shrink-0 relative">
                <VoiceRoom channelId={channelId} workspaceId={workspaceId} username={currentUsername} />
              </div>
              {/* Lower Part: Text Chat area */}
              <div className="flex-1 flex flex-col overflow-hidden bg-black/10">
                <ChatArea
                  channelId={channelId}
                  channelName={channel?.name || ''}
                  channelType={channel?.type || 'voice'}
                  workspaceId={workspaceId}
                  initialMessages={initialMessages}
                  currentUserId={user?.id || null}
                />
              </div>
            </div>
          ) : (
            <ChatArea
              channelId={channelId}
              channelName={channel?.name || ''}
              channelType={channel?.type || 'text'}
              workspaceId={workspaceId}
              initialMessages={initialMessages}
              currentUserId={user?.id || null}
            />
          )}
      </div>
      
      {/* Member Sidebar */}
      <div className="hidden lg:block shrink-0">
        <MemberList workspaceId={workspaceId} channelId={channelId} />
      </div>
    </div>
  );
}
