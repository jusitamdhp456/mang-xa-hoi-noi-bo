// Per-channel notification muting, stored client-side in localStorage.
// A muted channel produces no toast/sound and no unread marker.

const KEY = 'muted_channels'

export function getMutedChannels(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'))
  } catch {
    return new Set()
  }
}

export function isChannelMuted(id: string): boolean {
  return getMutedChannels().has(id)
}

// Toggle mute for a channel; returns the new muted state.
export function toggleChannelMute(id: string): boolean {
  const s = getMutedChannels()
  const muted = !s.has(id)
  if (muted) s.add(id)
  else s.delete(id)
  try {
    localStorage.setItem(KEY, JSON.stringify([...s]))
    window.dispatchEvent(new CustomEvent('app:mute-changed', { detail: { channelId: id, muted } }))
  } catch { /* ignore */ }
  return muted
}
