'use client'

import { useState } from 'react'
import { SmilePlus, FileText } from 'lucide-react'
import { type MessageRow } from './ChatArea'
import { VoiceInviteCard } from './VoiceInviteCard'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '😮', '😢', '🔥', '👀']

export function MessageItem({
  message,
  onImageClick,
  currentUserId = null,
  onToggleReaction,
}: {
  message: MessageRow;
  onImageClick?: (url: string) => void;
  currentUserId?: string | null;
  onToggleReaction?: (messageId: string, emoji: string) => void;
}) {
  const senderName = message.profiles?.display_name || 'Người dùng ẩn danh'
  const initial = senderName.charAt(0).toUpperCase()

  const timeStr = new Date(message.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  const attachment = message.message_attachments?.[0]

  const [pickerOpen, setPickerOpen] = useState(false)

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
    <div className="flex gap-4 mb-4 group p-2">
       <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-200 to-purple-200 shadow-sm border border-white flex items-center justify-center font-bold text-pink-700 shrink-0 text-lg">
         {initial}
       </div>
       <div className="flex-1">
          <div className="flex items-baseline gap-2 ml-1">
             <span className="font-bold text-zinc-800 text-[15px]">{senderName}</span>
             <span className="text-xs text-zinc-500 font-medium">{timeStr}</span>
          </div>
          {message.content && (
            message.content.startsWith('[VOICE_INVITE]:') ? (
              <VoiceInviteCard payload={message.content.slice('[VOICE_INVITE]:'.length)} />
            ) : (
              <div className="mt-1 bg-white/60 backdrop-blur-sm border border-white/60 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 text-zinc-800 text-[15px] whitespace-pre-wrap leading-relaxed inline-block max-w-[85%] font-medium">
                {message.content}
              </div>
            )
          )}
          
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
                      className="max-w-sm max-h-72 object-cover rounded-2xl border-4 border-white shadow-md transition-transform transform group-hover/img:scale-[1.02]"
                    />
                  </button>
                ) : (
                  <a href={`/api/media/${attachment.object_key}`} target="_blank" rel="noopener noreferrer" className="inline-block relative group/img">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={`/api/media/${attachment.object_key}`} 
                      alt={attachment.file_name} 
                      className="max-w-sm max-h-72 object-cover rounded-2xl border-4 border-white shadow-md transition-transform transform group-hover/img:scale-[1.02]"
                    />
                  </a>
                )
              ) : (
                 <a 
                   href={`/api/media/${attachment.object_key}`} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="flex items-center gap-3 bg-white/70 backdrop-blur-md border border-white rounded-2xl p-4 w-max hover:bg-white transition-all shadow-sm hover:shadow-md"
                 >
                   <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600"><FileText size={18} /></div>
                   <div>
                     <p className="text-sm font-bold text-pink-600 hover:underline">{attachment.file_name}</p>
                     <p className="text-xs font-medium text-zinc-500 mt-0.5">{(attachment.size_bytes / 1024).toFixed(1)} KB</p>
                   </div>
                 </a>
              )}
            </div>
          )}

          {/* Reactions */}
          {onToggleReaction && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {groupedReactions.map(([emoji, g]) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => react(emoji)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                    g.mine
                      ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                      : 'bg-white/70 border-zinc-200 text-zinc-600 hover:bg-white'
                  }`}
                  title={g.mine ? 'Bấm để bỏ cảm xúc' : 'Bấm để thả cảm xúc'}
                >
                  <span>{emoji}</span>
                  <span>{g.count}</span>
                </button>
              ))}

              {/* Add reaction button + quick picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPickerOpen((v) => !v)}
                  className={`w-6 h-6 flex items-center justify-center rounded-full text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer ${
                    groupedReactions.length > 0 ? '' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  title="Thả cảm xúc"
                >
                  <SmilePlus size={15} />
                </button>
                {pickerOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
                    <div className="absolute z-20 bottom-8 left-0 bg-white border border-zinc-200 rounded-2xl shadow-xl p-1.5 flex items-center gap-1 animate-scale-in">
                      {QUICK_EMOJIS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => react(e)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-lg transition-colors cursor-pointer"
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
