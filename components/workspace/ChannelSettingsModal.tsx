'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { X, Clock, Megaphone, ShieldAlert } from 'lucide-react'
import { updateChannelSettings } from '@/app/actions/channel'

const SLOWMODE_OPTIONS = [
  { v: 0, label: 'Tắt' },
  { v: 5, label: '5 giây' },
  { v: 10, label: '10 giây' },
  { v: 30, label: '30 giây' },
  { v: 60, label: '1 phút' },
  { v: 300, label: '5 phút' },
  { v: 900, label: '15 phút' },
]

export function ChannelSettingsModal({
  channelId,
  channelName,
  initial,
  onClose,
}: {
  channelId: string
  channelName: string
  initial: { slowmodeSeconds: number; isAnnouncement: boolean; isNsfw: boolean }
  onClose: () => void
}) {
  const router = useRouter()
  const [slowmode, setSlowmode] = useState(initial.slowmodeSeconds)
  const [announcement, setAnnouncement] = useState(initial.isAnnouncement)
  const [nsfw, setNsfw] = useState(initial.isNsfw)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const res = await updateChannelSettings(channelId, {
      slowmodeSeconds: slowmode,
      isAnnouncement: announcement,
      isNsfw: nsfw,
    })
    setSaving(false)
    if (res?.error) { alert(res.error); return }
    router.refresh()
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md bg-[#1e1b4b]/95 border border-white/15 rounded-2xl shadow-2xl p-5 animate-scale-in text-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wide truncate">Cài đặt kênh #{channelName}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white cursor-pointer"><X size={18} /></button>
        </div>

        {/* Slow mode */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 mb-2"><Clock size={14} className="text-cyan-400" /> Chế độ chờ (slow mode)</label>
          <div className="flex flex-wrap gap-1.5">
            {SLOWMODE_OPTIONS.map((o) => (
              <button
                key={o.v}
                onClick={() => setSlowmode(o.v)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${slowmode === o.v ? 'bg-indigo-600 text-white' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-zinc-500 mt-1.5">Thành viên phải đợi giữa các tin nhắn. Quản trị viên không bị giới hạn.</p>
        </div>

        {/* Announcement */}
        <button onClick={() => setAnnouncement((v) => !v)} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer mb-1.5 text-left">
          <Megaphone size={16} className="text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-bold">Kênh thông báo</p>
            <p className="text-[10px] text-zinc-500">Chỉ quản trị viên được đăng bài.</p>
          </div>
          <span className={`w-9 h-5 rounded-full transition-colors shrink-0 relative ${announcement ? 'bg-indigo-600' : 'bg-white/10'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${announcement ? 'left-4' : 'left-0.5'}`} />
          </span>
        </button>

        {/* NSFW */}
        <button onClick={() => setNsfw((v) => !v)} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left">
          <ShieldAlert size={16} className="text-rose-400 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-bold">Kênh nhạy cảm (NSFW)</p>
            <p className="text-[10px] text-zinc-500">Hiện cảnh báo trước khi vào kênh.</p>
          </div>
          <span className={`w-9 h-5 rounded-full transition-colors shrink-0 relative ${nsfw ? 'bg-indigo-600' : 'bg-white/10'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${nsfw ? 'left-4' : 'left-0.5'}`} />
          </span>
        </button>

        <button onClick={save} disabled={saving} className="w-full mt-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold transition-colors cursor-pointer">
          {saving ? 'Đang lưu…' : 'Lưu cài đặt'}
        </button>
      </div>
    </div>,
    document.body
  )
}
