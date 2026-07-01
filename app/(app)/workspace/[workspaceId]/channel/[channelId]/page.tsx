import Link from 'next/link'
import MemberList from '@/components/workspace/MemberList'
import { ChatArea } from '@/components/chat/ChatArea'
import { JoinVoiceChannel } from '@/components/workspace/JoinVoiceChannel'
import { NotificationBell } from '@/components/workspace/NotificationBell'
import { NsfwGate } from '@/components/chat/NsfwGate'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Volume2, Megaphone, ShieldAlert, Clock } from 'lucide-react'

export default async function ChannelPage({ params }: { params: Promise<{ workspaceId: string, channelId: string }> }) {
  const { workspaceId, channelId } = await params;
  
  const supabase = await createSupabaseServerClient()

  // Channel + messages don't depend on the user, so fire them alongside getUser
  // instead of waiting in series (faster first paint -> voice connects sooner).
  const userPromise = supabase.auth.getUser()
  const channelPromise = supabase.from('channels').select('*').eq('id', channelId).single()
  const msgsPromise = supabase
    .from('messages')
    .select('*, profiles!messages_sender_id_fkey(display_name, avatar_key), message_attachments(*), message_reactions(emoji, user_id), reply_to:reply_to_id(id, content, profiles!messages_sender_id_fkey(display_name))')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true })
    .limit(50)

  const { data: { user } } = await userPromise
  const profilePromise = user
    ? supabase.from('profiles').select('display_name, avatar_key').eq('id', user.id).single()
    : Promise.resolve({ data: null })

  const [{ data: channel }, { data: msgs }, { data: profile }] = await Promise.all([
    channelPromise,
    msgsPromise,
    profilePromise,
  ])

  const initialMessages = msgs || []

  // Current user profile for VoiceRoom username + optimistic chat rendering
  let currentUsername = 'Khách'
  let currentUser: { id: string; display_name: string; avatar_key: string | null } | null = null
  if (user) {
    if (profile?.display_name) currentUsername = profile.display_name
    currentUser = {
      id: user.id,
      display_name: profile?.display_name || currentUsername,
      avatar_key: profile?.avatar_key || null,
    }
  }

  return (
    <div className="flex-1 flex h-full bg-transparent">
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-black/20">
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

            <span className="text-cyan-400 mr-2 sm:mr-3 flex items-center drop-shadow-sm">{channel?.type === 'voice' ? <Volume2 size={22} /> : <span className="text-2xl">#</span>}</span>
            <span className="truncate">{channel?.name || channelId}</span>
            {channel?.is_announcement && <span className="ml-2 flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/15 rounded-full px-2 py-0.5 shrink-0" title="Kênh thông báo"><Megaphone size={11} /> Thông báo</span>}
            {channel?.is_nsfw && <span className="ml-2 flex items-center gap-1 text-[10px] font-bold text-rose-300 bg-rose-500/15 rounded-full px-2 py-0.5 shrink-0" title="Nội dung nhạy cảm"><ShieldAlert size={11} /> NSFW</span>}
            {channel?.slowmode_seconds > 0 && <span className="ml-2 flex items-center gap-1 text-[10px] font-bold text-cyan-300 bg-cyan-500/15 rounded-full px-2 py-0.5 shrink-0" title="Chế độ chờ"><Clock size={11} /> {channel.slowmode_seconds}s</span>}
            {channel?.topic && <span className="ml-4 pl-4 border-l border-white/20 text-sm text-white/70 font-medium hidden md:block truncate">{channel.topic}</span>}
            
            <div className="ml-auto">
               <NotificationBell />
            </div>
         </div>
         {channel?.type === 'voice' ? (
            <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
              {/* Media stage (video / screen share / future watch-party,
                  livestream, game-live). Stacks on top on mobile, takes the
                  majority of the width on desktop. */}
              {/* Joining this page connects voice globally; the persistent
                  GlobalVoiceMount portals the live stage into this slot. */}
              <JoinVoiceChannel channelId={channelId} workspaceId={workspaceId} />
              <div id="voice-stage-slot" className="h-[40%] min-h-[200px] md:h-auto md:flex-1 min-w-0 flex flex-col overflow-hidden relative border-b border-white/10 md:border-b-0 md:border-r bg-transparent" />
              {/* Chat: full width below on mobile, ~1/5 vertical column on desktop. */}
              <div className="flex-1 md:flex-none md:w-1/5 md:min-w-[260px] flex flex-col overflow-hidden bg-black/10">
                <ChatArea
                  channelId={channelId}
                  channelName={channel?.name || ''}
                  channelType={channel?.type || 'voice'}
                  workspaceId={workspaceId}
                  initialMessages={initialMessages}
                  currentUser={currentUser}
                />
              </div>
            </div>
          ) : (
            <div className="relative flex-1 flex flex-col overflow-hidden">
              {channel?.is_nsfw && <NsfwGate channelId={channelId} channelName={channel?.name || ''} />}
              <ChatArea
                channelId={channelId}
                channelName={channel?.name || ''}
                channelType={channel?.type || 'text'}
                workspaceId={workspaceId}
                initialMessages={initialMessages}
                currentUser={currentUser}
              />
            </div>
          )}
      </div>
      
      {/* Member Sidebar */}
      <div className="hidden lg:block shrink-0">
        <MemberList workspaceId={workspaceId} channelId={channelId} />
      </div>
    </div>
  );
}
