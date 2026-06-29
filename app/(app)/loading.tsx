import React from 'react';

export default function AppLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full bg-white/5 backdrop-blur-md animate-scale-in">
      <div className="flex flex-col items-center gap-3">
        {/* Loading Spinner */}
        <div className="w-12 h-12 border-4 border-white/10 border-t-cyan-400 rounded-full animate-spin shadow-lg"></div>
        <span className="text-sm font-semibold tracking-wider text-zinc-300 animate-pulse">Đang tải...</span>
      </div>
    </div>
  );
}
