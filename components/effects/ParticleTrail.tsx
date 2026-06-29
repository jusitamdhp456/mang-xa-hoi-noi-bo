'use client';

import React, { useEffect, useRef } from 'react';

export function ParticleTrail() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // List of active particles
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      decay: number;
      isStar: boolean;
      rotation: number;
      rotationSpeed: number;
    }> = [];

    // Pastel/Neon sparkle colors
    const colors = [
      '#ffffff', // Sparkle White
      '#22d3ee', // Cyan Sparkle
      '#38bdf8', // Blue Sparkle
      '#fef08a', // Gold Sparkle
      '#c084fc', // Purple Sparkle
      '#f472b6'  // Pink Sparkle
    ];

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const addParticle = (x: number, y: number) => {
      // Spawn 2 to 4 particles for every mouse/touch movement
      const count = Math.floor(Math.random() * 3) + 2;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 1.8 + 0.4;
        
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.3, // Slight floating upwards
          size: Math.random() * 2.5 + 1.5,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1.0,
          decay: Math.random() * 0.02 + 0.012, // Particle duration fade rate
          isStar: Math.random() > 0.45,       // Mix of stars and round glowing dots
          rotation: Math.random() * Math.PI,
          rotationSpeed: (Math.random() - 0.5) * 0.08,
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      addParticle(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        addParticle(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    // Draw custom 4-pointed sparkle star shape
    const drawSparkle = (
      c: CanvasRenderingContext2D,
      x: number,
      y: number,
      radius: number,
      color: string,
      alpha: number,
      rotation: number
    ) => {
      c.save();
      c.translate(x, y);
      c.rotate(rotation);
      c.globalAlpha = alpha;
      c.fillStyle = color;
      
      c.beginPath();
      c.moveTo(0, -radius);
      // Quadratic curve from outer tip to center
      c.quadraticCurveTo(0, 0, radius, 0);
      c.quadraticCurveTo(0, 0, 0, radius);
      c.quadraticCurveTo(0, 0, -radius, 0);
      c.quadraticCurveTo(0, 0, 0, -radius);
      c.closePath();
      c.fill();
      
      c.restore();
    };

    // Main animation loop
    const updateAndDraw = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        p.size *= 0.98; // Shrink size slightly
        p.rotation += p.rotationSpeed;

        // Clean up dead particles
        if (p.alpha <= 0 || p.size < 0.3) {
          particles.splice(i, 1);
          continue;
        }

        if (p.isStar) {
          drawSparkle(ctx, p.x, p.y, p.size * 2, p.color, p.alpha, p.rotation);
        } else {
          // Draw standard glowing round particle
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      animationFrameId = requestAnimationFrame(updateAndDraw);
    };

    updateAndDraw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
