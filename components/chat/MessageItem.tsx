import { type MessageRow } from './ChatArea'
import { VoiceInviteCard } from './VoiceInviteCard'

export function MessageItem({ message, onImageClick, currentUserId }: { message: MessageRow; onImageClick?: (url: string) => void; currentUserId?: string }) {
  const senderName = message.profiles?.display_name || 'Người dùng ẩn danh'
  const initial = senderName.charAt(0).toUpperCase()
  const avatar = message.profiles?.avatar_key ? `https://pub-9664a868c7184eaea9c2c0f43942f9d9.r2.dev/${message.profiles.avatar_key}` : null
  
  const timeStr = new Date(message.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  const attachment = message.message_attachments?.[0]
  const isMe = currentUserId && message.sender_id === currentUserId
  
  return (
    <div className={`flex gap-3 items-end max-w-[85%] sm:max-w-[75%] transition-all mb-4 ${isMe ? 'self-end flex-row-reverse' : 'self-start flex-row'}`}>
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
             <span>{isMe ? 'Bạn' : senderName}</span>
             <span>•</span>
             <span>{timeStr}</span>
          </div>

          {message.content && (
            message.content.startsWith('[VOICE_INVITE]:') ? (
              <VoiceInviteCard payload={message.content.slice('[VOICE_INVITE]:'.length)} />
            ) : (
              <div 
                className={`px-4 py-2.5 rounded-2xl whitespace-pre-wrap leading-relaxed break-words text-[13.5px] sm:text-[14px] font-medium shadow-md border ${
                  isMe 
                    ? 'bg-indigo-600 border-indigo-500 text-white rounded-br-none' 
                    : 'bg-zinc-800/90 border-white/5 text-zinc-200 rounded-bl-none'
                }`}
              >
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
       </div>
    </div>
  )
}
