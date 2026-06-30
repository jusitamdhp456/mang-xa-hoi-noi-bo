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
  // gate: waiting for the user's tap -> show: intro playing -> hiding -> gone
  const [phase, setPhase] = useState<'gate' | 'show' | 'hiding' | 'gone'>('gate');
  const ctxRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);

  // Prepare the audio (fetch + decode) up front so playback is instant on tap.
  useEffect(() => {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = AC ? new AC() : null;
    ctxRef.current = ctx;
    let cancelled = false;

    if (ctx) {
      fetch('/alovua.mp3')
        .then((r) => r.arrayBuffer())
        .then((b) => ctx.decodeAudioData(b))
        .then((buf) => { if (!cancelled) bufferRef.current = buf; })
        .catch(() => {});
    }

    return () => { cancelled = true; };
  }, []);

  const handleStart = () => {
    if (phase !== 'gate') return;

    // This runs inside a user gesture, so audio is allowed to play.
    const ctx = ctxRef.current;
    if (ctx) {
      ctx.resume().catch(() => {});
      try { ringMelody(ctx); } catch { /* ignore */ }
      if (bufferRef.current) {
        const src = ctx.createBufferSource();
        src.buffer = bufferRef.current;
        const g = ctx.createGain();
        g.gain.value = 0.95;
        src.connect(g);
        g.connect(ctx.destination);
        src.start();
      } else {
        // Buffer not decoded yet — fall back to a plain <audio> element.
        const audio = new Audio('/alovua.mp3');
        audio.volume = 0.95;
        audio.play().catch(() => {});
      }
    }

    setPhase('show');
    setTimeout(() => setPhase('hiding'), 2500);
    setTimeout(() => setPhase('gone'), 3000);
  };

  if (phase === 'gone') return null;

  return (
    <div
      onClick={handleStart}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-7 bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#0f172a] transition-opacity duration-500 ${
        phase === 'hiding' ? 'opacity-0' : 'opacity-100'
      } ${phase === 'gate' ? 'cursor-pointer' : ''}`}
    >
      <div className={`relative ${phase === 'gate' ? 'animate-logo-float' : 'animate-intro-pop'}`}>
        <div className="absolute inset-0 rounded-full bg-indigo-500/60 blur-3xl animate-glow-pulse" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Logo"
          className={`relative w-64 h-64 sm:w-80 sm:h-80 object-contain drop-shadow-2xl ${phase === 'gate' ? 'opacity-90' : 'animate-logo-bounce'}`}
        />
      </div>

      {phase === 'gate' && (
        <button
          type="button"
          onClick={handleStart}
          className="px-8 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-base font-extrabold tracking-wide backdrop-blur-md shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer animate-pulse"
        >
          Chạm để mở
        </button>
      )}
    </div>
  );
}
