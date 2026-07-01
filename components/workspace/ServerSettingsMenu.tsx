'use client'

import { useState, useRef, useEffect, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Pencil, Link2, Trash2, Check, Smile, ScrollText, ImagePlus } from 'lucide-react'
import { updateWorkspace, deleteWorkspace, updateWorkspaceIcon } from '@/app/actions/workspace'
import { CustomEmojiModal } from './CustomEmojiModal'
import { AuditLogModal } from './AuditLogModal'

export function ServerSettingsMenu({
  workspaceId,
  workspaceName,
  isOwner,
}: {
  workspaceId: string
  workspaceName: string
  isOwner: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [auditOpen, setAuditOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const iconInputRef = useRef<HTMLInputElement>(null)

  const onPickIcon = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setOpen(false)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', 'avatars')
    const up = await fetch('/api/upload', { method: 'POST', body: fd })
    if (!up.ok) { alert('Tải ảnh thất bại'); return }
    const d = await up.json()
    const res = await updateWorkspaceIcon(workspaceId, d.objectKey)
    if (res?.error) { alert(res.error); return }
    // Hard reload so the server-rail (cached in the app layout) shows the new icon.
    window.location.reload()
  }

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const rename = async () => {
    setOpen(false)
    const name = prompt('Tên không gian mới:', workspaceName)
    if (name === null) return
    const res = await updateWorkspace(workspaceId, name)
    if (res?.error) { alert(res.error); return }
    router.refresh()
  }

  const copyInvite = async () => {
    const link = `${window.location.origin}/invite/${workspaceId}`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => { setCopied(false); setOpen(false) }, 1200)
    } catch {
      prompt('Sao chép link mời:', link)
    }
  }

  const remove = async () => {
    setOpen(false)
    if (!confirm(`Xoá không gian "${workspaceName}"? Hành động không thể hoàn tác.`)) return
    const res = await deleteWorkspace(workspaceId)
    if (res?.error) { alert(res.error); return }
    router.push('/channels/me')
    router.refresh()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
        title="Cài đặt không gian"
      >
        <Settings size={17} />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-40 w-52 bg-[#1e1b4b]/95 border border-white/15 backdrop-blur-2xl rounded-xl p-1.5 shadow-2xl animate-scale-in text-white">
          <button onClick={copyInvite} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-left">
            {copied ? <Check size={14} className="text-emerald-400 shrink-0" /> : <Link2 size={14} className="text-cyan-400 shrink-0" />}
            <span>{copied ? 'Đã sao chép link!' : 'Sao chép link mời'}</span>
          </button>
          <button onClick={rename} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-left">
            <Pencil size={14} className="text-zinc-300 shrink-0" />
            <span>Đổi tên không gian</span>
          </button>
          <button onClick={() => iconInputRef.current?.click()} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-left">
            <ImagePlus size={14} className="text-zinc-300 shrink-0" />
            <span>Đổi ảnh không gian</span>
          </button>
          <button onClick={() => { setOpen(false); setEmojiOpen(true) }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-left">
            <Smile size={14} className="text-zinc-300 shrink-0" />
            <span>Emoji server</span>
          </button>
          <button onClick={() => { setOpen(false); setAuditOpen(true) }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-left">
            <ScrollText size={14} className="text-zinc-300 shrink-0" />
            <span>Nhật ký quản trị</span>
          </button>
          {isOwner && (
            <>
              <div className="h-px bg-white/10 my-1" />
              <button onClick={remove} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-colors cursor-pointer text-left">
                <Trash2 size={14} className="shrink-0" />
                <span>Xoá không gian</span>
              </button>
            </>
          )}
        </div>
      )}
      <input ref={iconInputRef} type="file" accept="image/*" className="hidden" onChange={onPickIcon} />
      {emojiOpen && <CustomEmojiModal workspaceId={workspaceId} onClose={() => setEmojiOpen(false)} />}
      {auditOpen && <AuditLogModal workspaceId={workspaceId} onClose={() => setAuditOpen(false)} />}
    </div>
  )
}
