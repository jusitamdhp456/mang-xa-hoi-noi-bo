import { type MessageRow } from './ChatArea'

export function MessageItem({ message, onImageClick }: { message: MessageRow; onImageClick?: (url: string) => void }) {
  const senderName = message.profiles?.display_name || 'Người dùng ẩn danh'
  const initial = senderName.charAt(0).toUpperCase()
  
  const timeStr = new Date(message.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  const attachment = message.message_attachments?.[0]
  
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
            <div className="mt-1 bg-white/60 backdrop-blur-sm border border-white/60 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 text-zinc-800 text-[15px] whitespace-pre-wrap leading-relaxed inline-block max-w-[85%] font-medium">
              {message.content}
            </div>
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
                   <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-xl">📄</div>
                   <div>
                     <p className="text-sm font-bold text-pink-600 hover:underline">{attachment.file_name}</p>
                     <p className="text-xs font-medium text-zinc-500 mt-0.5">{(attachment.size_bytes / 1024).toFixed(1)} KB</p>
                   </div>
                 </a>
              )}
            </div>
          )}
       </div>
    </div>
  )
}
