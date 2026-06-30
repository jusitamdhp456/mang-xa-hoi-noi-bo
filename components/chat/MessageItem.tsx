'use client'

import { useState } from 'react'
import { SmilePlus, FileText, Reply, Pencil, Trash2, Pin, Check, X } from 'lucide-react'
import { type MessageRow } from './ChatArea'
import { VoiceInviteCard } from './VoiceInviteCard'
import { RichText } from '@/lib/richtext'
import { EmbedList } from '@/lib/embeds'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '😮', '😢', '🔥', '👀']

export function MessageItem({
  message,
  onImageClick,
  currentUserId = null,
  onToggleReaction,
  onReply,
  onEdit,
  onDelete,
  onTogglePin,
  isPinned = false,
}: {
  message: MessageRow;
  onImageClick?: (url: string) => void;
  currentUserId?: string | null;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onReply?: () => void;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onTogglePin?: () => void;
  isPinned?: boolean;
}) {
  const senderName = message.profiles?.display_name || 'Người dùng ẩn danh'
  const initial = senderName.charAt(0).toUpperCase()
  const avatar = message.profiles?.avatar_key ? `/api/media/${message.profiles.avatar_key}` : null

  const timeStr = new Date(message.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  const attachment = message.message_attachments?.[0]
  const isMe = currentUserId && message.sender_id === currentUserId
  const isVoiceInvite = !!message.content?.startsWith('[VOICE_INVITE]:')

  const [pickerOpen, setPickerOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(message.content || '')

  const saveEdit = () => {
    const t = editText.trim()
    setEditing(false)
    if (t && t !== message.content) onEdit?.(message.id, t)
  }

  // Group reactions by emoji with count + whether the current user reacted.
  const reactionGroups = (message.message_reactions || []).reduce<Record<string, { count: number; mine: boolean }>>(
    (acc, r) => {
      const g = acc[r.emoji] || { count: 0, mine: false }
      g.count += 1
      if (currentUserId && r.user_id === currentUserId) g.mine = true
      acc[r.emoji] = g
      return acc
    },
    {}
  )
  const groupedReactions = Object.entries(reactionGroups)

  const react = (emoji: string) => {
    setPickerOpen(false)
    onToggleReaction?.(message.id, emoji)
  }

  return (
    <div id={`msg-${message.id}`} className={`group flex gap-3 items-end max-w-[85%] sm:max-w-[75%] transition-all mb-4 ${isMe ? 'self-end flex-row-reverse' : 'self-start flex-row'}`}>
       {/* Avatar */}
       <div className="relative flex-shrink-0 mb-0.5">
         {avatar ? (
           <img src={avatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-white/5 shadow-md" />
         ) : (
           <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs uppercase shadow-md border border-white/5 ${isMe ? 'bg-cyan-600' : 'bg-indigo-900'}`}>
             {initial}
           </div>
         )}
       </div>

       {/* Chat Bubble container */}
       <div className={`flex flex-col min-w-0 ${isMe ? 'items-end' : 'items-start'}`}>
          {/* Sender Info */}
          <div className="flex items-center gap-1.5 px-1 mb-1 text-[10px] text-zinc-300 font-bold select-none">
             {isPinned && <Pin size={10} className="text-amber-400" />}
             <span>{isMe ? 'Bạn' : senderName}</span>
             <span>•</span>
             <span>{timeStr}</span>
             {message.edited_at && <span className="text-zinc-500 font-normal italic">(đã sửa)</span>}
          </div>

          {/* Reply preview */}
          {message.reply_to && (
            <div className={`mb-1 px-2.5 py-1 rounded-lg bg-black/20 border-l-2 border-indigo-400/60 max-w-full ${isMe ? 'self-end' : 'self-start'}`}>
              <p className="text-[10px] font-bold text-indigo-300 truncate">↩ {message.reply_to.profiles?.display_name || 'tin nhắn'}</p>
              <p className="text-[11px] text-zinc-400 truncate max-w-[220px]">{message.reply_to.content || '(tệp đính kèm)'}</p>
            </div>
          )}

          {editing ? (
            <div className="flex items-center gap-1.5 w-full">
              <input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false); }}
                autoFocus
                className="flex-1 bg-black/40 border border-indigo-500/50 rounded-xl px-3 py-2 text-[14px] text-white outline-none"
              />
              <button onClick={saveEdit} className="text-emerald-400 hover:text-emerald-300 p-1 cursor-pointer"><Check size={16} /></button>
              <button onClick={() => setEditing(false)} className="text-red-400 hover:text-red-300 p-1 cursor-pointer"><X size={16} /></button>
            </div>
          ) : (
            message.content && (
              isVoiceInvite ? (
                <VoiceInviteCard payload={message.content.slice('[VOICE_INVITE]:'.length)} />
              ) : (
                <div className="flex items-end gap-1.5">
                  <div
                    className={`px-4 py-2.5 rounded-2xl whitespace-pre-wrap leading-relaxed break-words text-[13.5px] sm:text-[14px] font-medium shadow-md border ${
                      isMe
                        ? 'bg-indigo-600 border-indigo-500 text-white rounded-br-none'
                        : 'bg-zinc-800/90 border-white/5 text-zinc-200 rounded-bl-none'
                    }`}
                  >
                    <RichText text={message.content} />
                  </div>
                  {/* Hover actions */}
                  {!isVoiceInvite && (
                    <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity self-center ${isMe ? 'order-first' : ''}`}>
                      {onReply && <button onClick={onReply} title="Trả lời" className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"><Reply size={13} /></button>}
                      {onTogglePin && <button onClick={onTogglePin} title={isPinned ? 'Bỏ ghim' : 'Ghim'} className={`w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10 cursor-pointer ${isPinned ? 'text-amber-400' : 'text-zinc-400 hover:text-white'}`}><Pin size={13} /></button>}
                      {isMe && onEdit && <button onClick={() => { setEditText(message.content || ''); setEditing(true); }} title="Sửa" className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"><Pencil size={13} /></button>}
                      {isMe && onDelete && <button onClick={() => { if (confirm('Xoá tin nhắn này?')) onDelete(message.id); }} title="Xoá" className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-400 hover:text-red-400 hover:bg-white/10 cursor-pointer"><Trash2 size={13} /></button>}
                    </div>
                  )}
                </div>
              )
            )
          )}

          {!isVoiceInvite && message.content && <EmbedList text={message.content} />}

          {attachment && (
            <div className="mt-2">
              {attachment.mime_type?.startsWith('image/') ? (
                onImageClick ? (
                  <button 
                    type="button" 
                    onClick={() => onImageClick(`/api/media/${attachment.object_key}`)}
                    className="inline-block relative group/img cursor-pointer text-left"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={`/api/media/${attachment.object_key}`} 
                      alt={attachment.file_name} 
                      className={`max-w-[150px] sm:max-w-[180px] max-h-72 object-cover rounded-xl border border-white/10 shadow-md transition-all hover:scale-[1.02] duration-200 ${isMe ? 'rounded-br-none' : 'rounded-bl-none'}`}
                    />
                  </button>
                ) : (
                  <a href={`/api/media/${attachment.object_key}`} target="_blank" rel="noopener noreferrer" className="inline-block relative group/img">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={`/api/media/${attachment.object_key}`} 
                      alt={attachment.file_name} 
                      className={`max-w-[150px] sm:max-w-[180px] max-h-72 object-cover rounded-xl border border-white/10 shadow-md transition-all hover:scale-[1.02] duration-200 ${isMe ? 'rounded-br-none' : 'rounded-bl-none'}`}
                    />
                  </a>
                )
              ) : (
                 <div className="flex items-center gap-3 bg-black/25 p-3 rounded-xl border border-white/5 max-w-sm mt-1">
                   <span className="text-2xl shrink-0">📎</span>
                   <div className="min-w-0 flex-1">
                     <p className="text-xs font-bold text-zinc-200 truncate">{attachment.file_name}</p>
                     <p className="text-[10px] text-zinc-400 mt-0.5">{(attachment.size_bytes / 1024).toFixed(1)} KB</p>
                   </div>
                   <a 
                     href={`/api/media/${attachment.object_key}`} 
                     download={attachment.file_name}
                     className="p-1.5 bg-white/5 hover:bg-white/15 rounded-lg text-xs font-bold text-white transition-all select-none shrink-0"
                   >
                     Tải xuống
                   </a>
                 </div>
              )}
            </div>
          )}

          {/* Reactions */}
          {onToggleReaction && (
            <div className={`flex items-center gap-1.5 mt-1.5 flex-wrap ${isMe ? 'justify-end' : 'justify-start'}`}>
              {groupedReactions.map(([emoji, g]) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => react(emoji)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                    g.mine
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-zinc-200'
                  }`}
                  title={g.mine ? 'Bấm để bỏ cảm xúc' : 'Bấm để thả cảm xúc'}
                >
                  <span>{emoji}</span>
                  <span>{g.count}</span>
                </button>
              ))}

              {/* Add reaction button + quick picker */}
              <div className="relative group/picker">
                <button
                  type="button"
                  onClick={() => setPickerOpen((v) => !v)}
                  className={`w-6 h-6 flex items-center justify-center rounded-full text-zinc-400 hover:text-indigo-400 hover:bg-white/10 transition-all cursor-pointer ${
                    groupedReactions.length > 0 ? '' : 'opacity-0 group-hover/picker:opacity-100'
                  }`}
                  title="Thả cảm xúc"
                >
                  <SmilePlus size={15} />
                </button>
                {pickerOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
                    <div className={`absolute z-20 bottom-8 ${isMe ? 'right-0' : 'left-0'} bg-[#2b2d31] border border-white/10 rounded-2xl shadow-xl p-1.5 flex items-center gap-1 animate-scale-in`}>
                      {QUICK_EMOJIS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => react(e)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-lg transition-colors cursor-pointer"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
       </div>
    </div>
  )
}
