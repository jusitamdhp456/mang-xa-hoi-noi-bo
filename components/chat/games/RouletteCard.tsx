'use client'

import { useState } from 'react'
import { pullRouletteTrigger } from '@/app/actions/minigames'
import { Skull, ShieldCheck } from 'lucide-react'

export function RouletteCard({ messageId, payload }: { messageId: string, payload: any }) {
  const [loading, setLoading] = useState(false)

  const handlePull = async () => {
    if (loading || payload.status === 'ENDED') return
    setLoading(true)
    try {
      const res = await pullRouletteTrigger(messageId)
      if (res?.error) alert(res.error)
    } finally {
      setLoading(false)
    }
  }

  const isDead = payload.dead !== null

  return (
    <div className="bg-[#1e1f22] border border-white/5 rounded-2xl p-4 w-[280px] sm:w-[320px] max-w-full shadow-xl">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-extrabold text-red-400 text-sm flex items-center gap-1.5 uppercase tracking-wide">
            🔫 Cò quay Nga
          </h3>
          <p className="text-xs text-zinc-400 mt-1">Lượt thứ {payload.currentTurn} / 6</p>
        </div>
        {payload.status === 'PLAYING' && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold animate-pulse">ĐANG CHƠI</span>
        )}
        {payload.status === 'ENDED' && (
          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">KẾT THÚC</span>
        )}
      </div>

      <div className="mb-4">
        {payload.status === 'PLAYING' ? (
          <button
            onClick={handlePull}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang thử...' : 'Bóp cò'}
          </button>
        ) : (
          <div className="w-full py-3 rounded-xl bg-red-950/50 border border-red-900/50 flex flex-col items-center justify-center text-red-400">
            <Skull size={24} className="mb-1" />
            <p className="text-sm font-bold text-red-300">{payload.dead?.name} đã dính đạn!</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {payload.survivors.length > 0 && (
          <div>
            <p className="text-[10px] font-extrabold uppercase text-emerald-500/70 mb-1 flex items-center gap-1">
              <ShieldCheck size={12} /> Sống sót
            </p>
            <div className="flex flex-wrap gap-1">
              {payload.survivors.map((s: any, idx: number) => (
                <span key={idx} className="text-xs font-bold px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
