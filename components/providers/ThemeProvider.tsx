'use client'

import { useEffect } from 'react'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Run once on mount to set the initial theme from localStorage
    const savedTheme = localStorage.getItem('app-theme') || 'dark'
    if (savedTheme === 'pink') {
      document.documentElement.classList.add('theme-pink')
    } else {
      document.documentElement.classList.remove('theme-pink')
    }
  }, [])

  return <>{children}</>
}
