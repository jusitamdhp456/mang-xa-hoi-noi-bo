'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { toggleReaction } from '@/app/actions/reaction'
import { Volume2, Download } from 'lucide-react'
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
  currentUser = null
}: {
  channelId: string,
  channelName: string,
  channelType: string,
  workspaceId: string,
  initialMessages: MessageRow[],
  currentUser?: { id: string; display_name: string; avatar_key: string | null } | null
}) {
  const currentUserId = currentUser?.id ?? null
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages)
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null)
  const supabase = createSupabaseBrowserClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Fetch a single message (with author, attachments, reactions) and append it
  // if not already present. Used by realtime, by the new-message broadcast, and
  // by the local send so the chat works even if postgres realtime is disabled.
  const appendMessageById = useCallback(async (messageId: string) => {
    const { data: msg } = await supabase
      .from('messages')
      .select('*, profiles!messages_sender_id_fkey(display_name, avatar_key), message_attachments(*), message_reactions(emoji, user_id)')
      .eq('id', messageId)
      .single()
    if (!msg) return
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg as MessageRow]))
  }, [supabase])

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

  // Append a full message object if not already present.
  const appendMessage = useCallback((msg: MessageRow) => {
    if (!msg?.id) return
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
  }, [])

  // Optimistic UI: show the sender's message instantly, before the round-trip.
  const addOptimistic = useCallback((msg: MessageRow) => {
    setMessages((prev) => [...prev, msg])
  }, [])

  const removeOptimistic = useCallback((tempId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== tempId))
  }, [])

  // After the server confirms: replace the optimistic placeholder with the real
  // message and notify other clients with the full payload.
  const handleSent = useCallback((message: MessageRow, tempId?: string) => {
    setMessages((prev) => {
      const withoutTemp = tempId ? prev.filter((m) => m.id !== tempId) : prev
      if (withoutTemp.some((m) => m.id === message.id)) return withoutTemp
      return [...withoutTemp, message]
    })
    channelRef.current?.send({
      type: 'broadcast',
      event: 'new_message',
      payload: { message },
    })
  }, [])

  // Auto-scroll to bottom on first load and on new messages, but only when the
  // user is already near the bottom — so scrolling up to read history isn't
  // yanked back down.
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    if (!initializedRef.current) {
      initializedRef.current = true
      el.scrollTop = el.scrollHeight
      return
    }
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150
    if (nearBottom) el.scrollTop = el.scrollHeight
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
        (payload) => {
          const id = payload.new?.id
          if (id) appendMessageById(id)
        }
      )
      .on(
        'broadcast',
        { event: 'new_message' },
        (payload) => {
          const msg = payload?.payload?.message as MessageRow | undefined
          if (msg) appendMessage(msg)
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
  }, [channelId, supabase, refreshReactions, appendMessageById, appendMessage])

  return (
    <>
      <div ref={scrollContainerRef} className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col scrollbar-thin scrollbar-thumb-gray-300">
        {/* Spacer keeps messages bottom-aligned when few, collapses when many so
            the overflow scrolls normally. */}
        <div className="flex-1 min-h-0" aria-hidden />
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 my-8">
             <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center text-gray-500">
               {channelType === 'voice' ? <Volume2 size={26} /> : <span className="text-2xl">#</span>}
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
      
      <MessageInput
        channelId={channelId}
        channelName={channelName}
        channelType={channelType}
        workspaceId={workspaceId}
        currentUser={currentUser}
        onOptimistic={addOptimistic}
        onOptimisticFailed={removeOptimistic}
        onSent={handleSent}
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
              <Download size={14} /> Tải ảnh
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
