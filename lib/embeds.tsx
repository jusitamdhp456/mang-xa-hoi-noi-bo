'use client'

import React from 'react'

type Embed =
  | { type: 'image'; url: string }
  | { type: 'youtube'; id: string; url: string }

const URL_RE = /https?:\/\/[^\s]+/g
const IMG_RE = /\.(png|jpe?g|gif|webp|avif)(\?.*)?$/i
const YT_RE = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/i

// Pull renderable embeds (images/GIFs + YouTube) out of a message body.
export function extractEmbeds(text: string): Embed[] {
  if (!text) return []
  const urls = text.match(URL_RE) || []
  const embeds: Embed[] = []
  const seen = new Set<string>()
  for (const raw of urls) {
    const url = raw.replace(/[)\]».,]+$/, '')
    if (seen.has(url)) continue
    seen.add(url)
    const yt = url.match(YT_RE)
    if (yt) embeds.push({ type: 'youtube', id: yt[1], url })
    else if (IMG_RE.test(url)) embeds.push({ type: 'image', url })
    if (embeds.length >= 4) break
  }
  return embeds
}

export function EmbedList({ text }: { text: string }) {
  const embeds = extractEmbeds(text)
  if (embeds.length === 0) return null
  return (
    <div className="flex flex-col gap-2 mt-1.5">
      {embeds.map((e, i) =>
        e.type === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={e.url}
            alt=""
            loading="lazy"
            className="max-w-[260px] max-h-72 rounded-xl border border-white/10 object-contain"
          />
        ) : (
          <a
            key={i}
            href={e.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(ev) => ev.stopPropagation()}
            className="relative block w-[260px] max-w-full rounded-xl overflow-hidden border border-white/10 group/yt"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://img.youtube.com/vi/${e.id}/hqdefault.jpg`} alt="YouTube" className="w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover/yt:bg-black/20 transition-colors">
              <span className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                <span className="ml-1 w-0 h-0 border-y-[9px] border-y-transparent border-l-[15px] border-l-white" />
              </span>
            </span>
          </a>
        )
      )}
    </div>
  )
}
