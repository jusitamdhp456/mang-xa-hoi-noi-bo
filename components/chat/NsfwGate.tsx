'use client'

import { useState, useEffect } from 'react'
import { ShieldAlert } from 'lucide-react'

// One-time (per session) confirmation overlay for NSFW channels.
export function NsfwGate({ channelId, channelName }: { channelId: string; channelName: string }) {
  const [confirmed, setConfirmed] = useState(true)

  useEffect(() => {
    try {
      setConfirmed(sessionStorage.getItem(`nsfw_ok_${channelId}`) === '1')
    } catch {
      setConfirmed(false)
    }
  }, [channelId])

  if (confirmed) return null

  const accept = () => {
    try { sessionStorage.setItem(`nsfw_ok_${channelId}`, '1') } catch { /* ignore */ }
    setConfirmed(true)
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-[#0f172a]/95 backdrop-blur-md">
      <div className="max-w-sm text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <ShieldAlert size={30} />
        </div>
        <h2 className="text-lg font-extrabold text-white mb-2">Nội dung nhạy cảm</h2>
        <p className="text-sm text-zinc-400 mb-6">Kênh <strong className="text-white">#{channelName}</strong> được đánh dấu NSFW và có thể chứa nội dung không phù hợp. Bạn có chắc muốn tiếp tục?</p>
        <button onClick={accept} className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors cursor-pointer">
          Tôi hiểu, tiếp tục
        </button>
      </div>
    </div>
  )
}
