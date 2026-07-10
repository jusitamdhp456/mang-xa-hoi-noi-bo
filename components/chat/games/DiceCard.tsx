'use client'

import { useState } from 'react'
import { betDice, rollDice } from '@/app/actions/minigames'
import { Dices, Coins } from 'lucide-react'

export function DiceCard({ messageId, payload, currentUserId }: { messageId: string, payload: any, currentUserId: string | null }) {
  const [loading, setLoading] = useState(false)

  const handleBet = async (choice: 'TAI' | 'XIU') => {
    if (loading || payload.status === 'ROLLED') return
    setLoading(true)
    try {
      const res = await betDice(messageId, choice)
      if (res?.error) alert(res.error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoll = async () => {
    if (loading || payload.status === 'ROLLED') return
    setLoading(true)
    try {
      const res = await rollDice(messageId)
      if (res?.error) alert(res.error)
    } finally {
      setLoading(false)
    }
  }

  const isHost = currentUserId === payload.hostId
  const myBet = payload.players.find((p: any) => p.userId === currentUserId)?.choice

  const total = payload.dice.reduce((a: number, b: number) => a + b, 0)
  const resultStr = total >= 11 ? 'TÀI' : 'XỈU'

  const taiPlayers = payload.players.filter((p: any) => p.choice === 'TAI')
  const xiuPlayers = payload.players.filter((p: any) => p.choice === 'XIU')

  const getDiceEmoji = (n: number) => {
    switch(n) {
      case 1: return '⚀'
      case 2: return '⚁'
      case 3: return '⚂'
      case 4: return '⚃'
      case 5: return '⚄'
      case 6: return '⚅'
      default: return '🎲'
    }
  }

  return (
    <div className="bg-[#1e1f22] border border-white/5 rounded-2xl p-4 w-[300px] sm:w-[360px] max-w-full shadow-xl">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-extrabold text-cyan-400 text-sm flex items-center gap-1.5 uppercase tracking-wide">
            <Dices size={16} /> Lắc Tài Xỉu
          </h3>
          <p className="text-xs text-zinc-400 mt-1">{payload.players.length} người đặt cược</p>
        </div>
        {payload.status === 'BETTING' && (
          <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-bold animate-pulse">ĐANG CƯỢC</span>
        )}
        {payload.status === 'ROLLED' && (
          <span className="px-2 py-0.5 rounded-full bg-zinc-500/20 text-zinc-400 text-[10px] font-bold">ĐÃ MỞ BÁT</span>
        )}
      </div>

      <div className="mb-4">
        {payload.status === 'ROLLED' ? (
          <div className="w-full py-4 rounded-xl bg-cyan-950/30 border border-cyan-900/50 flex flex-col items-center justify-center animate-scale-in">
            <div className="flex gap-2 text-4xl mb-2 text-white/90">
              {payload.dice.map((d: number, i: number) => <span key={i}>{getDiceEmoji(d)}</span>)}
            </div>
            <p className="text-sm font-medium text-cyan-200/70">Tổng: {total}</p>
            <p className={`text-2xl font-black mt-1 ${resultStr === 'TÀI' ? 'text-rose-500' : 'text-emerald-500'}`}>{resultStr}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => handleBet('TAI')}
                disabled={loading}
                className={`flex-1 py-3 rounded-xl font-black text-lg transition-all ${myBet === 'TAI' ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)] ring-2 ring-rose-400' : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'}`}
              >
                TÀI
              </button>
              <button
                onClick={() => handleBet('XIU')}
                disabled={loading}
                className={`flex-1 py-3 rounded-xl font-black text-lg transition-all ${myBet === 'XIU' ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(5,150,105,0.4)] ring-2 ring-emerald-400' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'}`}
              >
                XỈU
              </button>
            </div>
            {isHost && (
              <button
                onClick={handleRoll}
                disabled={loading}
                className="w-full mt-2 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm transition-all shadow-md"
              >
                {loading ? 'Đang mở...' : 'Lắc & Mở bát!'}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
        <div>
          <p className="text-[10px] font-extrabold text-rose-400/80 mb-1.5 flex items-center justify-between">
            <span>CỬA TÀI</span>
            <span>{taiPlayers.length}</span>
          </p>
          <div className="flex flex-col gap-1 max-h-24 overflow-y-auto scrollbar-thin">
            {taiPlayers.map((p: any, idx: number) => (
              <span key={idx} className={`text-[11px] font-medium px-2 py-0.5 rounded-md truncate ${payload.status === 'ROLLED' ? (resultStr === 'TÀI' ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-zinc-500') : 'bg-white/5 text-zinc-300'}`}>
                {payload.status === 'ROLLED' && resultStr === 'TÀI' && '🏆 '}
                {p.name}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-extrabold text-emerald-400/80 mb-1.5 flex items-center justify-between">
            <span>CỬA XỈU</span>
            <span>{xiuPlayers.length}</span>
          </p>
          <div className="flex flex-col gap-1 max-h-24 overflow-y-auto scrollbar-thin">
            {xiuPlayers.map((p: any, idx: number) => (
              <span key={idx} className={`text-[11px] font-medium px-2 py-0.5 rounded-md truncate ${payload.status === 'ROLLED' ? (resultStr === 'XỈU' ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-zinc-500') : 'bg-white/5 text-zinc-300'}`}>
                {payload.status === 'ROLLED' && resultStr === 'XỈU' && '🏆 '}
                {p.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
