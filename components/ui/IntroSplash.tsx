'use client';

import { useEffect, useState } from 'react';

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

function playIntroSound() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();

    const fire = () => {
      ctx.resume().catch(() => {});
      ringMelody(ctx);
    };

    if (ctx.state === 'suspended') {
      // Autoplay is blocked until a gesture — play on the first interaction.
      const onGesture = () => {
        fire();
        window.removeEventListener('pointerdown', onGesture);
        window.removeEventListener('keydown', onGesture);
        window.removeEventListener('touchstart', onGesture);
      };
      window.addEventListener('pointerdown', onGesture, { once: true });
      window.addEventListener('keydown', onGesture, { once: true });
      window.addEventListener('touchstart', onGesture, { once: true });
      // Still try immediately in case the policy allows it.
      fire();
    } else {
      fire();
    }
  } catch {
    /* ignore */
  }
}

export function IntroSplash() {
  const [phase, setPhase] = useState<'show' | 'hiding' | 'gone'>('show');

  useEffect(() => {
    playIntroSound();
    const t1 = setTimeout(() => setPhase('hiding'), 1900);
    const t2 = setTimeout(() => setPhase('gone'), 2400);
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
      <div className="relative animate-intro-pop">
        <div className="absolute inset-0 rounded-full bg-indigo-500/60 blur-3xl animate-glow-pulse" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Logo"
          className="relative w-64 h-64 sm:w-80 sm:h-80 object-contain drop-shadow-2xl animate-logo-bounce"
        />
      </div>
    </div>
  );
}
