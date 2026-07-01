'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Upload, Trash2, Smile } from 'lucide-react'
import { getCustomEmojis, addCustomEmoji, deleteCustomEmoji } from '@/app/actions/emoji'

export function CustomEmojiModal({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const [emojis, setEmojis] = useState<{ id: string; name: string; object_key: string }[]>([])
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = () => getCustomEmojis(workspaceId).then(setEmojis)
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [workspaceId])

  const upload = async () => {
    if (!name.trim() || !file) { alert('Cần tên và ảnh emoji'); return }
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'avatars') // served publicly by /api/media
      const up = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!up.ok) throw new Error('Tải ảnh thất bại')
      const d = await up.json()
      const res = await addCustomEmoji(workspaceId, name, d.objectKey)
      if (res?.error) throw new Error(res.error)
      setName(''); setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      await load()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Xoá emoji này?')) return
    const res = await deleteCustomEmoji(id)
    if (res?.error) { alert(res.error); return }
    load()
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md bg-[#1e1b4b]/95 border border-white/15 rounded-2xl shadow-2xl p-5 animate-scale-in text-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wide flex items-center gap-2"><Smile size={16} /> Emoji server</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white cursor-pointer"><X size={18} /></button>
        </div>

        {/* Upload row */}
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => fileRef.current?.click()} className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center cursor-pointer shrink-0 overflow-hidden">
            {file ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-contain" />
            ) : <Upload size={18} className="text-zinc-400" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <input
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="tên_emoji"
            className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
          />
          <button onClick={upload} disabled={busy} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer shrink-0">
            {busy ? '...' : 'Thêm'}
          </button>
        </div>

        {/* List */}
        <div className="max-h-72 overflow-y-auto">
          {emojis.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-8">Chưa có emoji nào. Dùng <code className="text-cyan-300">:tên:</code> sau khi thêm.</p>
          ) : (
            <div className="grid grid-cols-1 gap-1">
              {emojis.map((e) => (
                <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/media/${e.object_key}`} alt={e.name} className="w-8 h-8 object-contain shrink-0" />
                  <span className="text-sm font-bold text-white flex-1 truncate">:{e.name}:</span>
                  <button onClick={() => remove(e.id)} className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-400 cursor-pointer p-1"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
