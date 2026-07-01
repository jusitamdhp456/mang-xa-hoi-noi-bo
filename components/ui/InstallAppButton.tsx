'use client'

import { useEffect, useState } from 'react'
import { Download, Check } from 'lucide-react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// "Install the app" button. Uses the native PWA install prompt when available
// (Chrome/Edge); otherwise shows manual instructions (Safari/Firefox).
export function InstallAppButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    // Already running as an installed app?
    if (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone) {
      setInstalled(true)
    }
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => { setInstalled(true); setDeferred(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = async () => {
    if (deferred) {
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      if (outcome === 'accepted') setInstalled(true)
      setDeferred(null)
    } else {
      setShowHelp((v) => !v)
    }
  }

  if (installed) {
    return (
      <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
        <Check size={15} /> Đã cài ứng dụng
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={install}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer"
      >
        <Download size={15} /> Cài đặt ứng dụng
      </button>
      {showHelp && !deferred && (
        <div className="mt-3 text-[11px] text-zinc-400 leading-relaxed bg-black/20 border border-white/10 rounded-xl p-3">
          <p className="font-bold text-zinc-300 mb-1">Cách cài thủ công:</p>
          <p><strong>Chrome/Edge (máy tính):</strong> bấm biểu tượng cài đặt ⊕ ở cuối thanh địa chỉ → “Cài đặt”.</p>
          <p className="mt-1"><strong>Safari (Mac):</strong> Chia sẻ → “Thêm vào Dock”.</p>
          <p className="mt-1"><strong>Điện thoại:</strong> menu trình duyệt → “Thêm vào Màn hình chính”.</p>
        </div>
      )}
    </div>
  )
}
