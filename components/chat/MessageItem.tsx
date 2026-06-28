import { type MessageRow } from './ChatArea'

export function MessageItem({ message }: { message: MessageRow }) {
  const senderName = message.profiles?.display_name || 'Người dùng ẩn danh'
  const initial = senderName.charAt(0).toUpperCase()
  
  const timeStr = new Date(message.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  const attachment = message.message_attachments?.[0]
  
  return (
    <div className="flex gap-3 mb-1 hover:bg-gray-100 p-2 -mx-2 rounded transition-colors group">
       <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center font-bold text-indigo-700 shrink-0">
         {initial}
       </div>
       <div className="flex-1">
          <div className="flex items-baseline gap-2">
             <span className="font-semibold text-gray-900">{senderName}</span>
             <span className="text-xs text-gray-500">{timeStr}</span>
          </div>
          {message.content && <div className="text-gray-800 text-sm mt-0.5 whitespace-pre-wrap leading-relaxed">{message.content}</div>}
          
          {attachment && (
            <div className="mt-2">
              {attachment.mime_type?.startsWith('image/') ? (
                 <a href={`/api/media/${attachment.object_key}`} target="_blank" rel="noopener noreferrer">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img 
                     src={`/api/media/${attachment.object_key}`} 
                     alt={attachment.file_name} 
                     className="max-w-xs max-h-64 object-contain rounded-lg border border-gray-200 bg-gray-50"
                   />
                 </a>
              ) : (
                 <a 
                   href={`/api/media/${attachment.object_key}`} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded p-3 w-max hover:bg-gray-100"
                 >
                   <span className="text-2xl">📄</span>
                   <div>
                     <p className="text-sm font-medium text-blue-600 hover:underline">{attachment.file_name}</p>
                     <p className="text-xs text-gray-500">{(attachment.size_bytes / 1024).toFixed(1)} KB</p>
                   </div>
                 </a>
              )}
            </div>
          )}
       </div>
    </div>
  )
}
