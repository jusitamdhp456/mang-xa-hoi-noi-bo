'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { toggleReaction } from '@/app/actions/reaction'
import { MessageItem } from './MessageItem'
import { MessageInput } from './MessageInput'

export type AttachmentRow = {
  id: string;
  message_id: string;
  object_key: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
};

export type ReactionRow = {
  emoji: string;
  user_id: string;
};

export type MessageRow = {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  profiles?: {
    display_name: string;
    avatar_key: string | null;
  };
  message_attachments?: AttachmentRow[];
  message_reactions?: ReactionRow[];
};

export function ChatArea({ 
  channelId,
  channelName,
  channelType,
  workspaceId,
  initialMessages,
  currentUserId = null
}: {
  channelId: string,
  channelName: string,
  channelType: string,
  workspaceId: string,
  initialMessages: MessageRow[],
  currentUserId?: string | null
}) {
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages)
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null)
  const supabase = createSupabaseBrowserClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Re-fetch the reactions for a single message and merge into state.
  const refreshReactions = useCallback(async (messageId: string) => {
    const { data } = await supabase
      .from('message_reactions')
      .select('emoji, user_id')
      .eq('message_id', messageId)
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, message_reactions: data || [] } : m))
    )
  }, [supabase])

  // Toggle a reaction: optimistic local update, persist, then notify others.
  const handleToggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUserId) return
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m
        const list = m.message_reactions || []
        const mine = list.some((r) => r.user_id === currentUserId && r.emoji === emoji)
        return {
          ...m,
          message_reactions: mine
            ? list.filter((r) => !(r.user_id === currentUserId && r.emoji === emoji))
            : [...list, { emoji, user_id: currentUserId }],
        }
      })
    )

    const res = await toggleReaction(messageId, emoji)
    if (res?.error) {
      // Reconcile with the server on failure.
      await refreshReactions(messageId)
      return
    }
    // Tell other clients to refresh this message's reactions.
    channelRef.current?.send({
      type: 'broadcast',
      event: 'reaction',
      payload: { messageId },
    })
  }, [currentUserId, refreshReactions])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const channel = supabase
      .channel(`realtime:channel:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const newMessage = payload.new;
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_key')
            .eq('id', newMessage.sender_id)
            .single()

          // Cần fetch thêm attachment nếu có, nhưng hiện tại payload chỉ có bảng messages.
          // Cách an toàn là fetch lại toàn bộ message hoặc chỉ lấy attachment dựa trên message.id
          let message_attachments = []
          if (newMessage.type === 'image' || newMessage.type === 'file') {
            const { data: attach } = await supabase.from('message_attachments').select('*').eq('message_id', newMessage.id)
            if (attach) message_attachments = attach
          }

          const enrichedMessage = { ...(newMessage as MessageRow), profiles: profile as unknown as { display_name: string; avatar_key: string | null }, message_attachments } as MessageRow
          
          setMessages((prev) => [...prev, enrichedMessage])
        }
      )
      .on(
        'broadcast',
        { event: 'reaction' },
        (payload) => {
          const messageId = payload?.payload?.messageId
          if (messageId) refreshReactions(messageId)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      channelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [channelId, supabase, refreshReactions])

  return (
    <>
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col scrollbar-thin scrollbar-thumb-gray-300">
        <div className="mt-auto flex flex-col justify-end min-h-full">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 my-8">
               <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl text-gray-500">
                 {channelType === 'voice' ? '🔊' : '#'}
               </div>
               <h3 className="text-lg font-bold text-gray-800 mb-1">Chào mừng bạn đến với {channelName}</h3>
               <p className="text-sm">Đây là sự khởi đầu của kênh <strong>{channelName}</strong>.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                onImageClick={setActiveLightboxImg}
                currentUserId={currentUserId}
                onToggleReaction={handleToggleReaction}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <MessageInput 
        channelId={channelId} 
        channelName={channelName} 
        channelType={channelType} 
        workspaceId={workspaceId}
      />

      {/* Image Lightbox Modal Overlay */}
      {activeLightboxImg && (
        <div 
          onClick={() => setActiveLightboxImg(null)}
          className="fixed inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center z-[100] p-4 cursor-zoom-out animate-fade-in"
        >
          {/* Close & Action bar at the top */}
          <div className="absolute top-4 right-4 flex items-center gap-3 z-10" onClick={e => e.stopPropagation()}>
            <a 
              href={activeLightboxImg}
              download
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-white/10"
              title="Tải ảnh gốc"
            >
              📥 Tải ảnh
            </a>
            <button
              type="button"
              onClick={() => setActiveLightboxImg(null)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg font-bold transition-all cursor-pointer border border-white/10"
              title="Đóng xem ảnh"
            >
              ×
            </button>
          </div>

          {/* Main image view container */}
          <div className="max-w-4xl max-h-[85vh] relative animate-scale-in" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={activeLightboxImg} 
              alt="Lightbox View" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg border border-white/10 shadow-2xl select-none"
            />
          </div>
        </div>
      )}
    </>
  )
}
