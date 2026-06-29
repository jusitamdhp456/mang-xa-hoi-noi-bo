'use client';

import { useEffect, useRef, useState } from 'react';

// Cheerful little fanfare, synthesized so it needs no audio asset.
function ringMelody(ctx: AudioContext) {
  const now = ctx.currentTime;
  const seq = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C5 E5 G5 C6 E6
  seq.forEach((f, i) => {
    const t = now + i * 0.1;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.28, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.5);
  });
}

export function IntroSplash() {
  const [phase, setPhase] = useState<'show' | 'hiding' | 'gone'>('show');
  const [needsTap, setNeedsTap] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playedRef = useRef(false);

  useEffect(() => {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctxRef.current = AC ? new AC() : null;
    const audio = new Audio('/alovua.mp3');
    audio.volume = 0.95;
    audio.preload = 'auto';
    audioRef.current = audio;

    // Play both the mp3 and the synth chime. Returns the audio play promise.
    const play = () => {
      if (playedRef.current) return Promise.resolve();
      playedRef.current = true;
      const ctx = ctxRef.current;
      if (ctx) {
        ctx.resume().catch(() => {});
        try { ringMelody(ctx); } catch { /* ignore */ }
      }
      audio.currentTime = 0;
      return audio.play();
    };

    const onGesture = () => {
      playedRef.current = false; // allow the gesture to actually start playback
      play().then(() => setNeedsTap(false)).catch(() => {});
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
      window.removeEventListener('touchstart', onGesture);
    };

    // Try to autoplay; if the browser blocks it, wait for the first interaction.
    play().catch(() => {
      setNeedsTap(true);
      window.addEventListener('pointerdown', onGesture, { once: true });
      window.addEventListener('keydown', onGesture, { once: true });
      window.addEventListener('touchstart', onGesture, { once: true });
    });

    const t1 = setTimeout(() => setPhase('hiding'), 2500);
    const t2 = setTimeout(() => setPhase('gone'), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
      window.removeEventListener('touchstart', onGesture);
    };
  }, []);

  if (phase === 'gone') return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#0f172a] transition-opacity duration-500 ${
        phase === 'hiding' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="relative animate-intro-pop">
        <div className="absolute inset-0 rounded-full bg-indigo-500/60 blur-3xl animate-glow-pulse" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Logo"
          className="relative w-64 h-64 sm:w-80 sm:h-80 object-contain drop-shadow-2xl animate-logo-bounce"
        />
      </div>

      {needsTap && (
        <div className="text-white/90 text-sm font-bold tracking-wide animate-pulse select-none">
          🔊 Chạm để bật âm thanh
        </div>
      )}
    </div>
  );
}
