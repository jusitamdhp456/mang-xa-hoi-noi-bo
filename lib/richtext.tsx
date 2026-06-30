'use client'

import React, { useState } from 'react'

// Click-to-reveal spoiler (Discord ||spoiler||).
function Spoiler({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState(false)
  return (
    <span
      onClick={(e) => { e.stopPropagation(); setShown(true) }}
      className={`rounded px-1 cursor-pointer transition-all ${
        shown ? 'bg-white/10' : 'bg-zinc-700 text-transparent select-none hover:bg-zinc-600'
      }`}
      title={shown ? undefined : 'Bấm để xem'}
    >
      {children}
    </span>
  )
}

// Inline formatting: spoiler, bold, strike, code, italic, @mention, #channel.
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const regex = /(\|\|[^|]+\|\|)|(\*\*[^*]+\*\*)|(~~[^~]+~~)|(`[^`]+`)|(\*[^*\n]+\*)|(_[^_\n]+_)|(@everyone|@here|@[\p{L}\d_.]+)|(#[\p{L}\d_-]+)/gu
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    const key = `${keyBase}-${i++}`
    if (t.startsWith('||')) out.push(<Spoiler key={key}>{t.slice(2, -2)}</Spoiler>)
    else if (t.startsWith('**')) out.push(<strong key={key} className="font-extrabold">{t.slice(2, -2)}</strong>)
    else if (t.startsWith('~~')) out.push(<s key={key} className="opacity-70">{t.slice(2, -2)}</s>)
    else if (t.startsWith('`')) out.push(<code key={key} className="bg-black/40 border border-white/10 rounded px-1 py-0.5 text-[0.85em] font-mono">{t.slice(1, -1)}</code>)
    else if (t.startsWith('*')) out.push(<em key={key} className="italic">{t.slice(1, -1)}</em>)
    else if (t.startsWith('_')) out.push(<em key={key} className="italic">{t.slice(1, -1)}</em>)
    else if (t.startsWith('@')) {
      const all = t === '@everyone' || t === '@here'
      out.push(<span key={key} className={`font-bold rounded px-0.5 ${all ? 'text-amber-300 bg-amber-500/15' : 'text-indigo-300 bg-indigo-500/20'}`}>{t}</span>)
    } else if (t.startsWith('#')) {
      out.push(<span key={key} className="font-bold text-cyan-300 bg-cyan-500/15 rounded px-0.5">{t}</span>)
    }
    last = regex.lastIndex
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

// Renders a message body with a Discord-like subset of Markdown.
// Parent should keep `whitespace-pre-wrap` so newlines are preserved.
export function RichText({ text }: { text: string }) {
  if (!text) return null
  // Split out fenced code blocks ```...``` (odd segments are code).
  const segments = text.split(/```([\s\S]*?)```/)
  return (
    <>
      {segments.map((seg, i) =>
        i % 2 === 1 ? (
          <pre key={i} className="my-1 bg-black/40 border border-white/10 rounded-lg p-2.5 text-[0.85em] font-mono overflow-x-auto whitespace-pre-wrap">{seg.replace(/^\n/, '')}</pre>
        ) : (
          <React.Fragment key={i}>{renderInline(seg, String(i))}</React.Fragment>
        )
      )}
    </>
  )
}
