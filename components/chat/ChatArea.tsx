'use client'

import { useEffect, useState, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
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
};

export function ChatArea({ 
  channelId, 
  channelName,
  channelType,
  workspaceId,
  initialMessages 
}: { 
  channelId: string, 
  channelName: string,
  channelType: string,
  workspaceId: string,
  initialMessages: MessageRow[] 
}) {
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages)
  const supabase = createSupabaseBrowserClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [channelId, supabase])

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
              <MessageItem key={msg.id} message={msg} />
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
    </>
  )
}
