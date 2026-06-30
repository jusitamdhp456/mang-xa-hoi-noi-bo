'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { toggleReaction } from '@/app/actions/reaction'
import { editMessage, deleteMessage, togglePin, getPinnedMessages } from '@/app/actions/message'
import { Volume2, Download, Pin } from 'lucide-react'
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

export type ReplyPreview = {
  id: string;
  content: string | null;
  profiles?: { display_name: string } | null;
};

export type MessageRow = {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  edited_at?: string | null;
  reply_to_id?: string | null;
  reply_to?: ReplyPreview | null;
  profiles?: {
    display_name: string;
    avatar_key: string | null;
  };
  message_attachments?: AttachmentRow[];
  message_reactions?: ReactionRow[];
};

const MSG_SELECT = '*, profiles!messages_sender_id_fkey(display_name, avatar_key), message_attachments(*), message_reactions(emoji, user_id), reply_to:reply_to_id(id, content, profiles!messages_sender_id_fkey(display_name))';

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
      .select(MSG_SELECT)
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

  // Send the message over realtime immediately for zero-latency feel for text messages
  const handleBroadcastInstantly = useCallback((message: MessageRow) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'new_message',
      payload: { message },
    })
  }, [])

  const handleBroadcastFailed = useCallback((tempId: string) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'delete_message',
      payload: { tempId },
    })
  }, [])

  // After the server confirms: replace the optimistic placeholder with the real
  // message and notify other clients with the full payload.
  const handleSent = useCallback((message: MessageRow, tempId?: string) => {
    setMessages((prev) => {
      const withoutTemp = tempId ? prev.filter((m) => m.id !== tempId) : prev
      if (withoutTemp.some((m) => m.id === message.id)) return withoutTemp
      return [...withoutTemp, message]
    })
    // We broadcast again just in case there are attachments or modifications
    channelRef.current?.send({
      type: 'broadcast',
      event: 'new_message',
      payload: { message },
    })
    // Notify the global toast listener on a dedicated topic (separate from this
    // channel's topic to avoid duplicate-subscription conflicts).
    supabase.channel(`workspace-notify:${workspaceId}`).send({
      type: 'broadcast',
      event: 'message_toast',
      payload: { channelId, channelName, message },
    })
  }, [supabase, workspaceId, channelId, channelName])

  // --- Reply ---
  const [replyTo, setReplyTo] = useState<MessageRow | null>(null)

  // --- Edit ---
  const handleEdit = useCallback(async (messageId: string, content: string) => {
    const editedAt = new Date().toISOString()
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, content, edited_at: editedAt } : m)))
    const res = await editMessage(messageId, content)
    if (res?.error) return
    channelRef.current?.send({ type: 'broadcast', event: 'edit_message', payload: { messageId, content, editedAt } })
  }, [])

  // --- Delete ---
  const handleDelete = useCallback(async (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
    const res = await deleteMessage(messageId)
    if (res?.error) { alert(res.error); return }
    channelRef.current?.send({ type: 'broadcast', event: 'message_deleted', payload: { messageId } })
  }, [])

  // --- Pin ---
  const [pinned, setPinned] = useState<MessageRow[]>([])
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set())
  const [showPinned, setShowPinned] = useState(false)
  const refreshPinned = useCallback(async () => {
    const list = (await getPinnedMessages(channelId)) as MessageRow[]
    setPinned(list)
    setPinnedIds(new Set(list.map((m) => m.id)))
  }, [channelId])
  const handleTogglePin = useCallback(async (messageId: string) => {
    const res = await togglePin(messageId, channelId)
    if (res?.error) { alert(res.error); return }
    await refreshPinned()
    channelRef.current?.send({ type: 'broadcast', event: 'pin_changed', payload: {} })
  }, [channelId, refreshPinned])
  useEffect(() => { refreshPinned() }, [refreshPinned])

  // --- Typing indicator ---
  const [typingNames, setTypingNames] = useState<string[]>([])
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const lastTypingSent = useRef(0)
  const handleTyping = useCallback(() => {
    const now = Date.now()
    if (now - lastTypingSent.current < 2000) return
    lastTypingSent.current = now
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUserId, name: currentUser?.display_name || 'Ai đó' },
    })
  }, [currentUserId, currentUser])

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
      .on(
        'broadcast',
        { event: 'delete_message' },
        (payload) => {
          const tempId = payload?.payload?.tempId
          if (tempId) removeOptimistic(tempId)
        }
      )
      .on('broadcast', { event: 'edit_message' }, (payload) => {
        const { messageId, content, editedAt } = payload?.payload || {}
        if (!messageId) return
        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, content, edited_at: editedAt } : m)))
      })
      .on('broadcast', { event: 'message_deleted' }, (payload) => {
        const messageId = payload?.payload?.messageId
        if (messageId) setMessages((prev) => prev.filter((m) => m.id !== messageId))
      })
      .on('broadcast', { event: 'pin_changed' }, () => {
        refreshPinned()
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userId, name } = payload?.payload || {}
        if (!userId || userId === currentUserId || !name) return
        setTypingNames((prev) => (prev.includes(name) ? prev : [...prev, name]))
        clearTimeout(typingTimers.current[userId])
        typingTimers.current[userId] = setTimeout(() => {
          setTypingNames((prev) => prev.filter((n) => n !== name))
        }, 3500)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      channelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [channelId, supabase, refreshReactions, appendMessageById, appendMessage, removeOptimistic, refreshPinned, currentUserId])

  return (
    <>
      {/* Pinned messages bar */}
      {pinned.length > 0 && (
        <div className="shrink-0 border-b border-white/10 bg-black/20 backdrop-blur-md">
          <button
            onClick={() => setShowPinned((v) => !v)}
            className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Pin size={13} />
            {pinned.length} tin đã ghim
          </button>
          {showPinned && (
            <div className="max-h-60 overflow-y-auto px-3 pb-2 space-y-1.5">
              {pinned.map((p) => (
                <div key={p.id} className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs">
                  <p className="font-bold text-white/90">{p.profiles?.display_name || 'Người dùng'}</p>
                  <p className="text-zinc-300 break-words line-clamp-3">{p.content || '(tệp đính kèm)'}</p>
                  <button
                    onClick={() => handleTogglePin(p.id)}
                    className="mt-1 text-[10px] text-amber-300/80 hover:text-amber-200 cursor-pointer"
                  >
                    Bỏ ghim
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div ref={scrollContainerRef} className="flex-1 p-4 overflow-y-auto bg-transparent flex flex-col scrollbar-thin scrollbar-thumb-gray-300">
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
          <div className="flex flex-col justify-end space-y-5">
            {messages.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                onImageClick={setActiveLightboxImg}
                currentUserId={currentUserId}
                onToggleReaction={handleToggleReaction}
                onReply={() => setReplyTo(msg)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onTogglePin={() => handleTogglePin(msg.id)}
                isPinned={pinnedIds.has(msg.id)}
              />
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Typing indicator */}
      {typingNames.length > 0 && (
        <div className="px-5 pb-1 text-[11px] text-zinc-400 italic animate-pulse shrink-0">
          {typingNames.slice(0, 3).join(', ')} đang gõ…
        </div>
      )}

      <MessageInput
        channelId={channelId}
        channelName={channelName}
        channelType={channelType}
        workspaceId={workspaceId}
        currentUser={currentUser}
        replyingTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onTyping={handleTyping}
        onOptimistic={addOptimistic}
        onOptimisticFailed={(tempId) => {
          removeOptimistic(tempId)
          handleBroadcastFailed(tempId)
        }}
        onBroadcastInstantly={handleBroadcastInstantly}
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
