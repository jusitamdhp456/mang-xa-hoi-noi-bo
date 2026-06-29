'use client';

import { useEffect, useState } from 'react';

// Cheerful ascending chime, synthesized so it needs no audio asset.
function playIntroSound() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((f, i) => {
      const t = now + i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  } catch {
    /* autoplay may be blocked until the user interacts — ignore */
  }
}

export function IntroSplash() {
  const [phase, setPhase] = useState<'show' | 'hiding' | 'gone'>('show');

  useEffect(() => {
    playIntroSound();
    const t1 = setTimeout(() => setPhase('hiding'), 1800);
    const t2 = setTimeout(() => setPhase('gone'), 2300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === 'gone') return null;

  return (
    <div
      onClick={() => setPhase('gone')}
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#0f172a] transition-opacity duration-500 ${
        phase === 'hiding' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative animate-intro-pop">
          <div className="absolute inset-0 rounded-full bg-indigo-500/50 blur-3xl animate-glow-pulse" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Logo"
            className="relative w-40 h-40 object-contain drop-shadow-2xl animate-logo-float"
          />
        </div>
        <div className="text-white font-extrabold text-xl tracking-wide animate-fade-in-up">
          Mạng Xã Hội Nội Bộ
        </div>
      </div>
    </div>
  );
}
