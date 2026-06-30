'use client'

import { useState, useRef } from 'react'
import { sendMessage } from '@/app/actions/message'
import { Send, Smile, File as FileIcon } from 'lucide-react'

const EMOJI_LIST = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😎',
  '🤩', '😢', '😭', '😡', '😱', '🤔', '🙄', '😴',
  '👍', '👎', '👏', '🙏', '💪', '🤝', '👀', '🎉',
  '❤️', '🔥', '⭐', '✅', '❌', '💯', '🚀', '☕',
]

export function MessageInput({
  channelId,
  channelName,
  channelType,
  workspaceId,
  currentUser = null,
  onOptimistic,
  onOptimisticFailed,
  onSent
}: {
  channelId: string,
  channelName: string,
  channelType: string,
  workspaceId: string,
  currentUser?: { id: string; display_name: string; avatar_key: string | null } | null,
  onOptimistic?: (message: any) => void,
  onOptimisticFailed?: (tempId: string) => void,
  onSent?: (message: any, tempId?: string) => void
}) {
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textInputRef = useRef<HTMLInputElement>(null)

  // Insert an emoji at the caret position (or append if no selection).
  const insertEmoji = (emoji: string) => {
    const input = textInputRef.current
    if (!input) {
      setContent((prev) => prev + emoji)
    } else {
      const start = input.selectionStart ?? content.length
      const end = input.selectionEnd ?? content.length
      const next = content.slice(0, start) + emoji + content.slice(end)
      setContent(next)
      // Restore caret right after the inserted emoji.
      requestAnimationFrame(() => {
        input.focus()
        const pos = start + emoji.length
        input.setSelectionRange(pos, pos)
      })
    }
    setEmojiOpen(false)
  }

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_DIM = 1200;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            0.7
          );
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  const handleFileSelection = async (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (file.type.startsWith('image/')) {
      const compressed = await compressImage(file);
      setSelectedFile(compressed);
    } else {
      setSelectedFile(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile()
        if (file) {
          e.preventDefault()
          handleFileSelection(file)
          break
        }
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!content.trim() && !selectedFile) || isSending) return

    setIsSending(true)
    const currentContent = content
    const currentFile = selectedFile

    setContent('')
    setSelectedFile(null)

    // Optimistic render for text-only messages so they appear instantly,
    // without waiting for the server round-trip. Reconciled by onSent.
    let tempId: string | undefined
    if (!currentFile && currentContent.trim() && currentUser) {
      tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
      onOptimistic?.({
        id: tempId,
        content: currentContent.trim(),
        created_at: new Date().toISOString(),
        sender_id: currentUser.id,
        profiles: { display_name: currentUser.display_name, avatar_key: currentUser.avatar_key },
        message_attachments: [],
        message_reactions: [],
      })
    }

    try {
      let attachmentData = undefined

      if (currentFile) {
        const formData = new FormData()
        formData.append('file', currentFile)
        formData.append('workspaceId', workspaceId)
        formData.append('channelId', channelId)

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })
        
        if (!uploadRes.ok) {
          const errData = await uploadRes.json()
          throw new Error(errData.error || 'Upload file thất bại')
        }
        
        const uploadData = await uploadRes.json()
        attachmentData = {
          objectKey: uploadData.objectKey,
          fileName: uploadData.fileName,
          mimeType: uploadData.mimeType,
          sizeBytes: uploadData.sizeBytes
        }
      }
      
      const res = await sendMessage(channelId, workspaceId, currentContent, attachmentData)
      if (res?.error) throw new Error(res.error)
      if (res?.message) onSent?.(res.message, tempId)

    } catch (err: unknown) {
      if (tempId) onOptimisticFailed?.(tempId)
      alert((err as Error).message || 'Có lỗi xảy ra khi gửi tin nhắn')
      setContent(currentContent)
      setSelectedFile(currentFile)
    } finally {
      setIsSending(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div 
      className="p-6 bg-transparent shrink-0 relative"
      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        if (e.dataTransfer.files?.[0]) {
          handleFileSelection(e.dataTransfer.files[0]);
        }
      }}
    >
      {isDragOver && (
        <div className="absolute inset-x-6 inset-y-2 bg-indigo-950/85 border-2 border-dashed border-indigo-500 rounded-2xl flex flex-col items-center justify-center z-50 pointer-events-none animate-fade-in-up">
          <p className="text-xs font-bold text-white">Thả tệp tin hoặc ảnh vào đây</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {selectedFile && (
          selectedFile.type.startsWith('image/') ? (
            /* Staging Image Preview */
            <div className="relative w-28 h-28 ml-4 rounded-xl border border-white/10 overflow-hidden group shadow-md animate-scale-in flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={URL.createObjectURL(selectedFile)} 
                alt="Preview" 
                className="w-full h-full object-cover" 
              />
              <button 
                type="button" 
                onClick={() => setSelectedFile(null)} 
                className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-black/90 text-white rounded-full w-5 h-5 flex items-center justify-center cursor-pointer shadow-sm text-xs font-bold transition-all border border-white/10"
                title="Hủy ảnh"
              >
                ×
              </button>
            </div>
          ) : (
            /* Staging File Card Preview */
            <div className="flex items-center gap-3 bg-[#2b2d31] p-3 rounded-2xl border border-white/5 shadow-md w-max max-w-sm ml-4 animate-scale-in">
              <div className="text-zinc-300"><FileIcon size={20} /></div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-zinc-200 truncate max-w-[200px]">{selectedFile.name}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedFile(null)} 
                className="text-zinc-400 hover:text-white transition-colors text-base font-bold bg-white/5 hover:bg-white/10 rounded-full w-6 h-6 flex items-center justify-center cursor-pointer shadow-sm"
                title="Hủy tệp"
              >
                ×
              </button>
            </div>
          )
        )}

        {isSending && selectedFile && (
          <div className="flex items-center gap-2 text-zinc-400 text-xs px-6 animate-pulse font-medium">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
            <span>Đang tải tệp tin lên kênh...</span>
          </div>
        )}

        <div className="bg-[#383a40]/60 border border-white/5 rounded-2xl py-3 px-4 flex items-center shadow-lg focus-within:border-indigo-500 focus-within:bg-[#383a40]/80 transition-all">
           <button 
             type="button" 
             onClick={() => fileInputRef.current?.click()}
             className="text-zinc-400 hover:text-white mr-3 shrink-0 flex items-center justify-center w-7 h-7 bg-white/5 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-base font-bold animate-pulse-subtle"
             title="Đính kèm tệp tin / hình ảnh"
             disabled={isSending}
           >
             +
           </button>
           <input 
             type="file" 
             className="hidden" 
             ref={fileInputRef}
             onChange={(e) => {
               if (e.target.files?.[0]) handleFileSelection(e.target.files[0])
             }}
           />
           <input
              type="text"
              ref={textInputRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              disabled={isSending}
              placeholder={isSending ? "Vui lòng đợi..." : `Nhắn tin vào ${channelType === 'voice' ? '' : '#'}${channelName}...`}
              className="bg-transparent w-full outline-none text-xs text-white disabled:opacity-50 placeholder:text-zinc-500 font-medium mr-2"
           />
           {/* Emoji picker */}
           <div className="relative shrink-0 mr-1">
             <button
               type="button"
               onClick={() => setEmojiOpen((v) => !v)}
               disabled={isSending}
               className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-1 hover:bg-white/5 rounded-lg flex items-center justify-center disabled:opacity-30"
               title="Chèn emoji"
             >
               <Smile size={16} />
             </button>
             {emojiOpen && (
               <>
                 <div className="fixed inset-0 z-10" onClick={() => setEmojiOpen(false)} />
                 <div className="absolute z-20 bottom-10 right-0 bg-[#2b2d31] border border-white/10 rounded-2xl shadow-2xl p-2 grid grid-cols-8 gap-0.5 w-72 animate-scale-in">
                   {EMOJI_LIST.map((e) => (
                     <button
                       key={e}
                       type="button"
                       onClick={() => insertEmoji(e)}
                       className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-lg transition-colors cursor-pointer"
                     >
                       {e}
                     </button>
                   ))}
                 </div>
               </>
             )}
           </div>
           <button
             type="submit" 
             disabled={isSending || (!content.trim() && !selectedFile)}
             className="text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0 disabled:opacity-30 disabled:hover:text-zinc-400 p-1 hover:bg-white/5 rounded-lg flex items-center justify-center"
             title="Gửi tin nhắn"
           >
             <Send size={16} />
           </button>
        </div>
      </form>
    </div>
  )
}
