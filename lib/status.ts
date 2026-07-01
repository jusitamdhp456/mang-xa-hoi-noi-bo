// Presence status is encoded into the existing profiles.status_text column as
// "<state>|<custom text>" so we don't need a schema migration.

export type PresenceState = 'online' | 'idle' | 'dnd' | 'invisible'

export const STATUS_META: Record<PresenceState, { label: string; dot: string; text: string }> = {
  online: { label: 'Trực tuyến', dot: 'bg-emerald-500', text: 'text-emerald-400' },
  idle: { label: 'Chờ', dot: 'bg-amber-500', text: 'text-amber-400' },
  dnd: { label: 'Đừng làm phiền', dot: 'bg-rose-500', text: 'text-rose-400' },
  invisible: { label: 'Ẩn', dot: 'bg-zinc-500', text: 'text-zinc-400' },
}

export const STATUS_ORDER: PresenceState[] = ['online', 'idle', 'dnd', 'invisible']

export function parseStatus(raw?: string | null): { state: PresenceState; text: string } {
  if (!raw) return { state: 'online', text: '' }
  const i = raw.indexOf('|')
  if (i >= 0) {
    const s = raw.slice(0, i) as PresenceState
    if (STATUS_META[s]) return { state: s, text: raw.slice(i + 1) }
  }
  // Legacy value with no encoded state — treat as a plain custom message.
  return { state: 'online', text: raw === 'Không có trạng thái' ? '' : raw }
}

export function formatStatus(state: PresenceState, text: string): string {
  return `${state}|${text.trim()}`
}
