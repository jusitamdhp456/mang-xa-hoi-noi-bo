'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
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
  isAmbient?: boolean;
}

export function ParticleTrail() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false, lastMove: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // List of active particles
    const particles: Particle[] = [];

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
      // Spawn 1 to 2 trailing sparkles on move
      const count = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 1.2 + 0.3;
        
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.2,
          size: Math.random() * 2 + 1.5,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1.0,
          decay: Math.random() * 0.02 + 0.015,
          isStar: Math.random() > 0.4,
          rotation: Math.random() * Math.PI,
          rotationSpeed: (Math.random() - 0.5) * 0.06,
          isAmbient: false
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
      mouseRef.current.lastMove = Date.now();
      addParticle(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        mouseRef.current.x = touch.clientX;
        mouseRef.current.y = touch.clientY;
        mouseRef.current.active = true;
        mouseRef.current.lastMove = Date.now();
        addParticle(touch.clientX, touch.clientY);
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

      const mouse = mouseRef.current;
      const isMouseActive = mouse.active && (Date.now() - mouse.lastMove < 2500);

      // Keep spawning background ambient particles to keep the screen alive
      while (particles.filter(p => p.isAmbient).length < 50) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5 - 0.1,
          size: Math.random() * 2 + 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: Math.random() * 0.5 + 0.3,     // Slightly fainter ambient particles
          decay: Math.random() * 0.006 + 0.002,  // Decays slowly
          isStar: Math.random() > 0.5,
          rotation: Math.random() * Math.PI,
          rotationSpeed: (Math.random() - 0.5) * 0.02,
          isAmbient: true
        });
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        if (isMouseActive) {
          // Physics attraction pull towards mouse
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 400 && dist > 15) {
            // Pull force relative to distance
            const force = (400 - dist) / 400 * 0.12;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
            
            // Friction dampening to stabilize hovering
            p.vx *= 0.94;
            p.vy *= 0.94;
          } else if (dist <= 15) {
            // Gently orbit/hover extremely close to cursor
            p.vx += (Math.random() - 0.5) * 0.2;
            p.vy += (Math.random() - 0.5) * 0.2;
            p.vx *= 0.88;
            p.vy *= 0.88;
          }
        } else {
          // Ambient gentle drifting
          p.vx *= 0.98;
          p.vy *= 0.98;
          p.vx += (Math.random() - 0.5) * 0.03;
          p.vy += (Math.random() - 0.5) * 0.03;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        p.rotation += p.rotationSpeed;

        // Clean up or reset particles
        if (p.alpha <= 0 || p.size < 0.3) {
          if (p.isAmbient) {
            // Recycle ambient particle into a new position
            p.x = Math.random() * width;
            p.y = Math.random() * height;
            p.vx = (Math.random() - 0.5) * 0.5;
            p.vy = (Math.random() - 0.5) * 0.5 - 0.1;
            p.size = Math.random() * 2 + 1;
            p.alpha = Math.random() * 0.5 + 0.3;
            p.decay = Math.random() * 0.006 + 0.002;
          } else {
            particles.splice(i, 1);
          }
          continue;
        }

        if (p.isStar) {
          drawSparkle(ctx, p.x, p.y, p.size * 2.2, p.color, p.alpha, p.rotation);
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
