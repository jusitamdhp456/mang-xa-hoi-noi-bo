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
    <div className="p-4 bg-white shrink-0">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        {selectedFile && (
          <div className="flex items-center gap-2 bg-indigo-50 p-2 rounded w-max border border-indigo-100">
             <span className="text-xs font-medium text-indigo-700 truncate max-w-xs">{selectedFile.name}</span>
             <button type="button" onClick={() => setSelectedFile(null)} className="text-indigo-500 hover:text-indigo-800 text-xs font-bold">×</button>
          </div>
        )}
        <div className="bg-gray-100 rounded-lg p-3 flex items-center shadow-inner">
           <button 
             type="button" 
             onClick={() => fileInputRef.current?.click()}
             className="text-gray-400 hover:text-gray-600 mr-3 shrink-0 flex items-center justify-center w-6 h-6 bg-gray-200 rounded-full"
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
              placeholder={`Nhắn tin vào ${channelType === 'voice' ? '🔊' : '#'} ${channelName}`} 
              className="bg-transparent w-full outline-none text-sm text-gray-800 disabled:opacity-50"
           />
        </div>
      </form>
    </div>
  )
}
