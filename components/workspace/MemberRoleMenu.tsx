'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, Shield, UserMinus, Ban, Check } from 'lucide-react'
import { updateMemberRole, kickMember } from '@/app/actions/workspace'
import { blockUser, unblockUser } from '@/app/actions/block'

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'admin', label: 'Quản trị' },
  { value: 'mod', label: 'Điều hành' },
  { value: 'member', label: 'Thành viên' },
]

export function MemberRoleMenu({
  workspaceId,
  targetUserId,
  currentRole,
  canManage = false,
  isBlocked = false,
}: {
  workspaceId: string
  targetUserId: string
  currentRole: string
  canManage?: boolean
  isBlocked?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const setRole = async (role: string) => {
    setBusy(true)
    const res = await updateMemberRole(workspaceId, targetUserId, role)
    setBusy(false)
    setOpen(false)
    if (res?.error) { alert(res.error); return }
    router.refresh()
  }

  const kick = async () => {
    setOpen(false)
    if (!confirm('Xoá thành viên này khỏi không gian?')) return
    const res = await kickMember(workspaceId, targetUserId)
    if (res?.error) { alert(res.error); return }
    router.refresh()
  }

  const toggleBlock = async () => {
    setOpen(false)
    const res = isBlocked ? await unblockUser(targetUserId) : await blockUser(targetUserId)
    if (res?.error) { alert(res.error); return }
    router.refresh()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer shrink-0"
        title="Quản lý thành viên"
      >
        <MoreVertical size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-30 w-44 bg-[#1e1b4b]/95 border border-white/15 backdrop-blur-2xl rounded-xl p-1.5 shadow-2xl animate-scale-in">
          {canManage && (
            <>
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 px-2 py-1 select-none flex items-center gap-1">
                <Shield size={10} /> Đổi vai trò
              </p>
              {ROLE_OPTIONS.map((r) => (
                <button
                  key={r.value}
                  disabled={busy || r.value === currentRole}
                  onClick={() => setRole(r.value)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    r.value === currentRole ? 'text-indigo-300 bg-white/5' : 'text-white hover:bg-white/10'
                  }`}
                >
                  {r.label}{r.value === currentRole ? ' ✓' : ''}
                </button>
              ))}
              <div className="h-px bg-white/10 my-1" />
              <button
                onClick={kick}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
              >
                <UserMinus size={13} /> Xoá khỏi nhóm
              </button>
              <div className="h-px bg-white/10 my-1" />
            </>
          )}
          <button
            onClick={toggleBlock}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${isBlocked ? 'text-emerald-400 hover:bg-white/10' : 'text-red-400 hover:bg-red-600 hover:text-white'}`}
          >
            {isBlocked ? <Check size={13} /> : <Ban size={13} />} {isBlocked ? 'Bỏ chặn' : 'Chặn người dùng'}
          </button>
        </div>
      )}
    </div>
  )
}
