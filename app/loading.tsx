import React from 'react';

export default function RootLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#0f172a]">
      <div className="relative flex items-center justify-center w-24 h-24">
        <div className="absolute inset-0 border-4 border-white/10 border-t-cyan-400 rounded-full animate-spin shadow-lg"></div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="" className="w-12 h-12 object-contain rounded-full animate-logo-float" />
      </div>
      <span className="mt-4 text-sm font-semibold tracking-wider text-zinc-300 animate-pulse">Đang tải...</span>
    </div>
  );
}
