'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { joinWorkspaceByCode } from '@/app/actions/workspace'
import { Users } from 'lucide-react'

export default function InvitePage() {
  const params = useParams<{ code: string }>()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const join = async () => {
    setBusy(true)
    setError(null)
    const res = await joinWorkspaceByCode(params.code)
    if (res?.error) { setError(res.error); setBusy(false); return }
    router.push(`/workspace/${res.workspaceId}`)
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
          <Users size={28} />
        </div>
        <h1 className="text-xl font-extrabold text-white mb-2">Bạn được mời tham gia</h1>
        <p className="text-sm text-zinc-400 mb-6">Tham gia không gian làm việc này để trò chuyện và gọi cùng mọi người.</p>
        {error && <p className="text-xs text-red-400 mb-4 font-semibold">{error}</p>}
        <button
          onClick={join}
          disabled={busy}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold transition-all cursor-pointer"
        >
          {busy ? 'Đang tham gia…' : 'Chấp nhận lời mời'}
        </button>
      </div>
    </div>
  )
}
