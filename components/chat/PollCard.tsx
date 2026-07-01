'use client'

import { BarChart3, Check } from 'lucide-react'
import type { ReactionRow } from './ChatArea'

// A poll is a normal message whose content is `[POLL]:{json}`. Votes are stored
// as reactions with emoji `poll:<optionIndex>`, so no extra table is needed.
export const POLL_PREFIX = '[POLL]:'

export function parsePoll(content: string): { question: string; options: string[] } | null {
  if (!content?.startsWith(POLL_PREFIX)) return null
  try {
    const data = JSON.parse(content.slice(POLL_PREFIX.length))
    if (data && typeof data.question === 'string' && Array.isArray(data.options)) return data
  } catch { /* ignore */ }
  return null
}

export function PollCard({
  question,
  options,
  messageId,
  reactions = [],
  currentUserId = null,
  onVote,
}: {
  question: string
  options: string[]
  messageId: string
  reactions?: ReactionRow[]
  currentUserId?: string | null
  onVote?: (messageId: string, emoji: string) => void
}) {
  const votesFor = (i: number) => reactions.filter((r) => r.emoji === `poll:${i}`)
  const total = options.reduce((n, _, i) => n + votesFor(i).length, 0)
  const myVote = options.findIndex((_, i) => votesFor(i).some((r) => r.user_id === currentUserId))

  return (
    <div className="w-full max-w-[320px] bg-black/25 border border-white/10 rounded-2xl p-3.5 mt-1">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={15} className="text-indigo-300 shrink-0" />
        <p className="text-sm font-extrabold text-white break-words">{question}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        {options.map((opt, i) => {
          const count = votesFor(i).length
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          const mine = myVote === i
          return (
            <button
              key={i}
              onClick={() => onVote?.(messageId, `poll:${i}`)}
              className="relative w-full text-left rounded-lg border border-white/10 overflow-hidden group/opt cursor-pointer hover:border-indigo-400/60 transition-colors"
            >
              <span className={`absolute inset-y-0 left-0 transition-all ${mine ? 'bg-indigo-600/40' : 'bg-white/10'}`} style={{ width: `${pct}%` }} />
              <span className="relative flex items-center gap-2 px-3 py-2">
                {mine && <Check size={13} className="text-indigo-300 shrink-0" />}
                <span className="text-xs font-bold text-white flex-1 break-words">{opt}</span>
                <span className="text-[10px] font-bold text-zinc-400 shrink-0">{pct}% · {count}</span>
              </span>
            </button>
          )
        })}
      </div>
      <p className="text-[10px] text-zinc-500 mt-2 font-semibold">{total} lượt bình chọn · bấm để chọn/bỏ chọn</p>
    </div>
  )
}
