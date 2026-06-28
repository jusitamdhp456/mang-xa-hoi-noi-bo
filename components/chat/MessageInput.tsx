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
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    <div className="p-6 bg-transparent shrink-0">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {selectedFile && (
          <div className="flex items-center gap-2 bg-pink-100 p-2 rounded-xl w-max border border-pink-200 shadow-sm ml-4">
             <span className="text-xs font-bold text-pink-700 truncate max-w-xs">{selectedFile.name}</span>
             <button type="button" onClick={() => setSelectedFile(null)} className="text-pink-500 hover:text-pink-800 text-xs font-bold bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm">×</button>
          </div>
        )}
        <div className="bg-zinc-900 rounded-full py-3 px-5 flex items-center shadow-lg transform transition-transform hover:scale-[1.01] duration-200">
           <button 
             type="button" 
             onClick={() => fileInputRef.current?.click()}
             className="text-zinc-900 hover:text-white mr-4 shrink-0 flex items-center justify-center w-8 h-8 bg-white hover:bg-pink-500 rounded-full transition-colors shadow-sm font-bold text-lg"
             title="Đính kèm file"
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
              disabled={isSending}
              placeholder={`Nhắn tin vào ${channelType === 'voice' ? '🔊' : '#'} ${channelName}...`} 
              className="bg-transparent w-full outline-none text-base text-zinc-50 disabled:opacity-50 placeholder-zinc-400 font-medium"
           />
        </div>
      </form>
    </div>
  )
}
