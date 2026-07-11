'use client'

import { useEffect } from 'react'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Run once on mount to set the initial theme from localStorage
    const savedTheme = localStorage.getItem('app-theme') || 'dark'
    
    // Clear all special themes first
    document.documentElement.classList.remove('theme-pink', 'theme-genshin')
    
    // Add the selected special theme
    if (savedTheme === 'pink') {
      document.documentElement.classList.add('theme-pink')
    } else if (savedTheme === 'genshin') {
      document.documentElement.classList.add('theme-genshin')
    }
  }, [])

  return <>{children}</>
}
