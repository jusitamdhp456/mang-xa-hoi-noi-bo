// Lightweight synthesized soundboard — no audio assets needed.
// Each effect is generated with the Web Audio API on a shared AudioContext.

export type SoundId = 'airhorn' | 'drum' | 'fanfare' | 'cheers' | 'sad' | 'pop'

export const SOUNDBOARD: { id: SoundId; label: string; emoji: string }[] = [
  { id: 'airhorn', label: 'Còi hơi', emoji: '📣' },
  { id: 'drum', label: 'Trống', emoji: '🥁' },
  { id: 'fanfare', label: 'Tèn ten', emoji: '🎉' },
  { id: 'cheers', label: 'Cụng ly', emoji: '🥂' },
  { id: 'sad', label: 'Tụt mood', emoji: '😢' },
  { id: 'pop', label: 'Pop', emoji: '💧' },
]

let ctx: AudioContext | null = null
function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = AC ? new AC() : null
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
    return ctx
  } catch {
    return null
  }
}

function tone(c: AudioContext, t: number, freq: number, dur: number, type: OscillatorType, vol = 0.25) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(gain)
  gain.connect(c.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
  return osc
}

function glide(c: AudioContext, t: number, from: number, to: number, dur: number, type: OscillatorType, vol = 0.25) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, t)
  osc.frequency.exponentialRampToValueAtTime(to, t + dur)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.03)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(gain)
  gain.connect(c.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

function noiseHit(c: AudioContext, t: number, dur: number, vol = 0.4) {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  const src = c.createBufferSource()
  src.buffer = buf
  const gain = c.createGain()
  gain.gain.value = vol
  src.connect(gain)
  gain.connect(c.destination)
  src.start(t)
}

// Play an uploaded sound file (custom soundboard entry) from a URL.
export function playUrl(url: string) {
  try {
    const a = new Audio(url)
    a.volume = 0.9
    a.play().catch(() => {})
  } catch {
    /* ignore */
  }
}

export function playSound(id: SoundId) {
  const c = ac()
  if (!c) return
  const now = c.currentTime
  switch (id) {
    case 'airhorn': {
      // Three rising honks on a buzzy sawtooth.
      ;[0, 0.28, 0.56].forEach((off) => {
        glide(c, now + off, 180, 240, 0.22, 'sawtooth', 0.3)
        glide(c, now + off, 360, 480, 0.22, 'sawtooth', 0.18)
      })
      break
    }
    case 'drum': {
      // Kick thump + a snare-ish noise hit.
      glide(c, now, 160, 50, 0.18, 'sine', 0.5)
      noiseHit(c, now + 0.18, 0.12, 0.35)
      glide(c, now + 0.3, 160, 50, 0.18, 'sine', 0.5)
      break
    }
    case 'fanfare': {
      const seq = [523.25, 659.25, 783.99, 1046.5]
      seq.forEach((f, i) => tone(c, now + i * 0.1, f, 0.4, 'triangle', 0.28))
      break
    }
    case 'cheers': {
      // Glassy clink: two short high bells.
      tone(c, now, 1568, 0.25, 'sine', 0.25)
      tone(c, now + 0.04, 2093, 0.3, 'sine', 0.2)
      break
    }
    case 'sad': {
      // Sad trombone — four descending wobbly notes.
      const seq = [392, 349.23, 311.13, 261.63]
      seq.forEach((f, i) => glide(c, now + i * 0.22, f, f * 0.94, 0.24, 'sawtooth', 0.22))
      break
    }
    case 'pop': {
      glide(c, now, 600, 1200, 0.08, 'sine', 0.3)
      break
    }
  }
}
