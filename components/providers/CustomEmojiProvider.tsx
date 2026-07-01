'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getCustomEmojis } from '@/app/actions/emoji'

// Map of custom emoji name -> media object key, for the current workspace.
const CustomEmojiContext = createContext<Record<string, string>>({})

export function CustomEmojiProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const wsId = pathname?.match(/\/workspace\/([^/]+)/)?.[1] || null
  const [map, setMap] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!wsId) { setMap({}); return }
    let cancelled = false
    getCustomEmojis(wsId).then((list) => {
      if (cancelled) return
      const m: Record<string, string> = {}
      ;(list as { name: string; object_key: string }[]).forEach((e) => { m[e.name] = e.object_key })
      setMap(m)
    })
    return () => { cancelled = true }
  }, [wsId])

  return <CustomEmojiContext.Provider value={map}>{children}</CustomEmojiContext.Provider>
}

export function useCustomEmojis() {
  return useContext(CustomEmojiContext)
}
