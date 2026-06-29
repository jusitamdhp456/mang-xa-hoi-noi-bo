'use client'

import { useState, useRef } from 'react'
import { sendMessage } from '@/app/actions/message'

export function MessageInput({ 
  channelId, 
  channelName, 
  channelType, 
  workspaceId 
}: { 
  channelId: string, 
  channelName: string, 
  channelType: string,
  workspaceId: string
}) {
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile()
        if (file) {
          e.preventDefault()
          setSelectedFile(file)
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
    
    try {
      let attachmentData = undefined
      
      if (currentFile) {
        const presignRes = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: currentFile.name,
            fileType: currentFile.type,
            workspaceId,
            channelId
          })
        })
        
        if (!presignRes.ok) throw new Error('Không thể lấy URL upload')
        
        const { uploadUrl, objectKey } = await presignRes.json()
        
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': currentFile.type },
          body: currentFile
        })
        
        if (!uploadRes.ok) throw new Error('Upload file thất bại')
        
        attachmentData = {
          objectKey,
          fileName: currentFile.name,
          mimeType: currentFile.type || 'application/octet-stream',
          sizeBytes: currentFile.size
        }
      }
      
      const res = await sendMessage(channelId, workspaceId, currentContent, attachmentData)
      if (res?.error) throw new Error(res.error)
      
    } catch (err: unknown) {
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
          setSelectedFile(e.dataTransfer.files[0]);
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
          <div className="flex items-center gap-3 bg-[#2b2d31] p-3 rounded-2xl border border-white/5 shadow-md w-max max-w-sm ml-4 animate-scale-in">
            <div className="text-xl">
              {selectedFile.type.startsWith('image/') ? '🖼️' : '📁'}
            </div>
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
               if (e.target.files?.[0]) setSelectedFile(e.target.files[0])
             }}
           />
           <input 
              type="text" 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              disabled={isSending}
              placeholder={isSending ? "Vui lòng đợi..." : `Nhắn tin vào ${channelType === 'voice' ? '🔊' : '#'} ${channelName}...`} 
              className="bg-transparent w-full outline-none text-xs text-white disabled:opacity-50 placeholder:text-zinc-500 font-medium"
           />
        </div>
      </form>
    </div>
  )
}
