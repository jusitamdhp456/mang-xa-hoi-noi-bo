'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { X, Plus } from 'lucide-react'
import { createWorkspace, joinWorkspaceByCode } from '@/app/actions/workspace'

export function AddWorkspaceButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [invite, setInvite] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const create = async () => {
    if (!name.trim()) { setError('Nhập tên không gian'); return }
    setBusy(true); setError('')
    const fd = new FormData()
    fd.append('name', name.trim())
    const res = await createWorkspace(fd)
    setBusy(false)
    if (res?.error) { setError(res.error); return }
    if (res?.workspaceId) { setOpen(false); router.push(`/workspace/${res.workspaceId}`); router.refresh() }
  }

  const join = async () => {
    const code = invite.trim().split('/').filter(Boolean).pop() || '' // accept full link or raw id
    if (!code) { setError('Dán link mời hoặc mã'); return }
    setBusy(true); setError('')
    const res = await joinWorkspaceByCode(code)
    setBusy(false)
    if (res?.error) { setError(res.error); return }
    if (res?.workspaceId) { setOpen(false); router.push(`/workspace/${res.workspaceId}`); router.refresh() }
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setError(''); setName(''); setInvite('') }}
        className="w-12 h-12 bg-white/5 border border-white/10 text-emerald-400 rounded-full flex items-center justify-center cursor-pointer hover:bg-emerald-600 hover:text-white hover:rounded-2xl hover:scale-105 transition-all duration-200 shadow-sm flex-shrink-0"
        title="Thêm không gian làm việc"
      >
        <Plus size={24} />
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md bg-[#1e1b4b]/95 border border-white/15 rounded-2xl shadow-2xl p-5 animate-scale-in text-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wide">Thêm không gian</h3>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>

            {error && <p className="text-xs text-red-400 mb-3 font-semibold">{error}</p>}

            <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 mb-2">Tạo mới</p>
            <div className="flex gap-2 mb-5">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') create() }}
                placeholder="Tên không gian…"
                className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
              />
              <button onClick={create} disabled={busy} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer shrink-0">Tạo</button>
            </div>

            <div className="h-px bg-white/10 mb-4" />

            <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 mb-2">Tham gia bằng link mời</p>
            <div className="flex gap-2">
              <input
                value={invite}
                onChange={(e) => setInvite(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') join() }}
                placeholder="Dán link mời hoặc mã…"
                className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
              />
              <button onClick={join} disabled={busy} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white text-xs font-bold cursor-pointer shrink-0">Tham gia</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
