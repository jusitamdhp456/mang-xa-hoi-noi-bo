'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

// Normalize a Vietnamese number to E.164 (+84...). Accepts "0xxx", "84xxx", "+84xxx".
function toE164(raw: string): string {
  let s = raw.replace(/[\s.-]/g, '')
  if (s.startsWith('+')) return s
  if (s.startsWith('0')) return '+84' + s.slice(1)
  if (s.startsWith('84')) return '+' + s
  return '+' + s
}

export function PhoneLinkRow({ initialPhone }: { initialPhone?: string | null }) {
  const [phone, setPhone] = useState<string | null>(initialPhone || null)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [input, setInput] = useState('')
  const [otp, setOtp] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const pendingPhone = toE164(input)

  const sendCode = async () => {
    if (!input.trim()) { setMsg('Nhập số điện thoại'); return }
    setBusy(true); setMsg('')
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({ phone: pendingPhone })
    setBusy(false)
    if (error) { setMsg(error.message || 'Không gửi được mã. SMS có thể chưa được bật.'); return }
    setStep('otp')
    setMsg('Đã gửi mã tới ' + pendingPhone)
  }

  const verify = async () => {
    if (!otp.trim()) { setMsg('Nhập mã xác thực'); return }
    setBusy(true); setMsg('')
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.verifyOtp({ phone: pendingPhone, token: otp.trim(), type: 'phone_change' })
    setBusy(false)
    if (error) { setMsg('Mã không đúng hoặc đã hết hạn'); return }
    setPhone(pendingPhone)
    setOpen(false)
    setStep('phone'); setInput(''); setOtp('')
  }

  const masked = phone ? phone.replace(/.(?=.{4})/g, '*') : null

  return (
    <div className="flex items-center justify-between gap-4 py-1 border-t border-white/5 pt-4">
      <div className="min-w-0">
        <p className="text-[10px] text-zinc-400 uppercase font-black tracking-wider leading-none">Số Điện Thoại</p>
        {phone ? (
          <p className="text-xs text-white font-semibold mt-1.5">{masked} <span className="text-emerald-400 text-[10px] ml-1">Đã liên kết</span></p>
        ) : (
          <p className="text-xs text-zinc-500 mt-1.5">Chưa liên kết số điện thoại</p>
        )}
      </div>
      <button
        onClick={() => { setOpen(true); setStep('phone'); setMsg(''); setInput(''); setOtp('') }}
        className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-[11px] font-bold text-white rounded-lg transition-colors cursor-pointer shrink-0"
      >
        {phone ? 'Đổi số' : 'Liên kết'}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm bg-[#1e1b4b]/95 border border-white/15 rounded-2xl shadow-2xl p-5 animate-scale-in text-white" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-extrabold uppercase tracking-wide mb-4">Liên kết số điện thoại</h3>
            {msg && <p className="text-xs text-indigo-300 mb-3">{msg}</p>}
            {step === 'phone' ? (
              <>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Vd: 0987xxxxxx"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 mb-3"
                />
                <button onClick={sendCode} disabled={busy} className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold cursor-pointer">
                  {busy ? 'Đang gửi…' : 'Gửi mã xác thực'}
                </button>
              </>
            ) : (
              <>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Nhập mã 6 số"
                  inputMode="numeric"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 mb-3 tracking-widest text-center"
                />
                <button onClick={verify} disabled={busy} className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold cursor-pointer">
                  {busy ? 'Đang xác thực…' : 'Xác thực & liên kết'}
                </button>
                <button onClick={() => setStep('phone')} className="w-full mt-2 text-xs text-zinc-400 hover:text-white cursor-pointer">← Nhập lại số</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
