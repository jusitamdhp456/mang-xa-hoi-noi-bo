'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Search, Hash, Volume2, Users } from 'lucide-react'

type Item = {
  id: string
  label: string
  sub: string
  type: 'text' | 'voice' | 'dm'
  href: string
}

// Global command palette: Ctrl/Cmd+K to jump to any channel or DMs.
export function QuickSwitcher() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: memberships } = await supabase
      .from('workspace_members')
      .select('workspace_id, workspaces(name)')
      .eq('user_id', user.id)
    const wsName = new Map<string, string>()
    const wsIds: string[] = []
    ;(memberships || []).forEach((m: any) => {
      wsIds.push(m.workspace_id)
      wsName.set(m.workspace_id, m.workspaces?.name || 'Không gian')
    })
    let channels: any[] = []
    if (wsIds.length > 0) {
      const { data } = await supabase
        .from('channels')
        .select('id, name, type, workspace_id')
        .in('workspace_id', wsIds)
        .order('name', { ascending: true })
      channels = data || []
    }
    const list: Item[] = [
      { id: 'dm', label: 'Tin nhắn riêng', sub: 'Bạn bè', type: 'dm', href: '/channels/me' },
      ...channels.map((c) => ({
        id: c.id,
        label: c.name,
        sub: wsName.get(c.workspace_id) || '',
        type: (c.type === 'voice' ? 'voice' : 'text') as 'text' | 'voice',
        href: `/workspace/${c.workspace_id}/channel/${c.id}`,
      })),
    ]
    setItems(list)
  }, [])

  // Global hotkey
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      load()
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open, load])

  const filtered = query.trim()
    ? items.filter((i) => (i.label + ' ' + i.sub).toLowerCase().includes(query.toLowerCase()))
    : items
  const clampedActive = Math.min(active, Math.max(0, filtered.length - 1))

  const go = (item: Item) => {
    setOpen(false)
    router.push(item.href)
  }

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[clampedActive]) go(filtered[clampedActive]) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9997] flex items-start justify-center pt-[15vh] px-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)}>
      <div className="w-full max-w-lg bg-[#1e1b4b]/95 border border-white/15 rounded-2xl shadow-2xl overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
          <Search size={16} className="text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0) }}
            onKeyDown={onInputKey}
            placeholder="Đi tới kênh hoặc tin nhắn…"
            className="bg-transparent w-full outline-none text-sm text-white placeholder:text-zinc-500"
          />
          <kbd className="text-[10px] text-zinc-500 border border-white/10 rounded px-1.5 py-0.5 font-mono shrink-0">Esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-6">Không có kết quả</p>
          ) : (
            filtered.map((item, i) => (
              <button
                key={item.id}
                onClick={() => go(item)}
                onMouseEnter={() => setActive(i)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${i === clampedActive ? 'bg-indigo-600/40' : 'hover:bg-white/5'}`}
              >
                <span className="text-cyan-300 shrink-0">
                  {item.type === 'voice' ? <Volume2 size={15} /> : item.type === 'dm' ? <Users size={15} /> : <Hash size={15} />}
                </span>
                <span className="text-sm font-bold text-white truncate flex-1">{item.label}</span>
                <span className="text-[10px] text-zinc-500 truncate shrink-0">{item.sub}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
