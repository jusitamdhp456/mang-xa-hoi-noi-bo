'use client'

import { useState } from 'react'
import { joinGiveaway, rollGiveaway } from '@/app/actions/minigames'
import { Gift, Users, Trophy } from 'lucide-react'

export function GiveawayCard({ messageId, payload, currentUserId }: { messageId: string, payload: any, currentUserId: string | null }) {
  const [loading, setLoading] = useState(false)

  const handleJoin = async () => {
    if (loading || payload.status === 'ENDED') return
    setLoading(true)
    try {
      const res = await joinGiveaway(messageId)
      if (res?.error) alert(res.error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoll = async () => {
    if (loading || payload.status === 'ENDED') return
    setLoading(true)
    try {
      const res = await rollGiveaway(messageId)
      if (res?.error) alert(res.error)
    } finally {
      setLoading(false)
    }
  }

  const isHost = currentUserId === payload.hostId
  const hasJoined = payload.participants.some((p: any) => p.userId === currentUserId)

  return (
    <div className="bg-[#1e1f22] border border-white/5 rounded-2xl p-4 w-[280px] sm:w-[320px] max-w-full shadow-xl">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-extrabold text-amber-400 text-sm flex items-center gap-1.5 uppercase tracking-wide">
            <Gift size={16} /> Rút thăm may mắn
          </h3>
          <p className="text-xs text-zinc-400 mt-1">{payload.participants.length} người tham gia</p>
        </div>
        {payload.status === 'WAITING' && (
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold animate-pulse">ĐANG CHỜ</span>
        )}
        {payload.status === 'ENDED' && (
          <span className="px-2 py-0.5 rounded-full bg-zinc-500/20 text-zinc-400 text-[10px] font-bold">KẾT THÚC</span>
        )}
      </div>

      <div className="mb-4 space-y-2">
        {payload.status === 'WAITING' ? (
          <>
            {!hasJoined && (
              <button
                onClick={handleJoin}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-md disabled:opacity-50"
              >
                Tham gia
              </button>
            )}
            {hasJoined && (
              <p className="text-xs font-bold text-emerald-400 text-center bg-emerald-500/10 py-2 rounded-xl">
                Bạn đã tham gia. Đang chờ kết quả...
              </p>
            )}
            {isHost && (
              <button
                onClick={handleRoll}
                disabled={loading || payload.participants.length === 0}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-sm transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] disabled:opacity-50"
              >
                {loading ? 'Đang quay...' : 'Bắt đầu quay thưởng'}
              </button>
            )}
          </>
        ) : (
          <div className="w-full py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center justify-center text-amber-400 animate-fade-in-up">
            <Trophy size={24} className="mb-1" />
            <p className="text-xs text-amber-300/70 mb-1">Người chiến thắng</p>
            <p className="text-lg font-black text-amber-400">{payload.winner?.name}</p>
          </div>
        )}
      </div>

      {payload.participants.length > 0 && (
        <div className="pt-2 border-t border-white/5">
          <p className="text-[10px] font-extrabold uppercase text-zinc-500 mb-2 flex items-center gap-1">
            <Users size={12} /> Danh sách
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scrollbar-thin">
            {payload.participants.map((p: any, idx: number) => (
              <span key={idx} className="text-[11px] font-medium px-2 py-0.5 bg-white/5 text-zinc-300 rounded-md">
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
