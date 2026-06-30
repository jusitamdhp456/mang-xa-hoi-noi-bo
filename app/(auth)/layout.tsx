import React from 'react';
import { ParticleTrail } from '@/components/effects/ParticleTrail';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Particle trail canvas backdrop */}
      <ParticleTrail />
      
      {/* Auth Content Pages */}
      <div className="relative z-10 w-full min-h-screen">
        {children}
      </div>
    </div>
  );
}
