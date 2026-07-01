'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ScrollText } from 'lucide-react'
import { getAuditLogs } from '@/app/actions/workspace'

const ACTION_LABEL: Record<string, string> = {
  role_change: 'Đổi vai trò',
  kick_member: 'Xoá thành viên',
  rename_workspace: 'Đổi tên không gian',
  delete_channel: 'Xoá kênh',
}

export function AuditLogModal({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAuditLogs(workspaceId).then((d) => { setLogs(d); setLoading(false) })
  }, [workspaceId])

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg bg-[#1e1b4b]/95 border border-white/15 rounded-2xl shadow-2xl p-5 animate-scale-in text-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wide flex items-center gap-2"><ScrollText size={16} /> Nhật ký quản trị</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white cursor-pointer"><X size={18} /></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto flex flex-col gap-1.5">
          {loading ? (
            <p className="text-xs text-zinc-500 text-center py-8 animate-pulse">Đang tải…</p>
          ) : logs.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-8">Chưa có hoạt động nào.</p>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="bg-white/5 border border-white/10 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-indigo-300">{ACTION_LABEL[l.action] || l.action}</span>
                  <span className="text-[10px] text-zinc-500 shrink-0">{new Date(l.created_at).toLocaleString('vi-VN')}</span>
                </div>
                <p className="text-xs text-zinc-300 mt-1 break-words">{l.detail || '—'}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">bởi {l.profiles?.display_name || 'Không rõ'}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
