'use client';

import React from 'react';
import { useVoiceSettings } from '@/components/providers/VoiceSettingsProvider';
import { Mic, MicOff, Headphones, HeadphonesIcon, Settings } from 'lucide-react';
import { UserSettingsModal } from '@/components/auth/UserSettingsModal';
import { User } from '@supabase/supabase-js';

interface UserPanelProps {
  user: User | null;
  profile: any | null;
}

export function UserPanel({ user, profile }: UserPanelProps) {
  const { isMuted, isDeafened, toggleMute, toggleDeafen } = useVoiceSettings();

  const getAvatarUrl = () => {
    if (profile?.avatar_key) {
      return `https://pub-9664a868c7184eaea9c2c0f43942f9d9.r2.dev/${profile.avatar_key}`;
    }
    return null;
  };

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Khách';
  const statusColor = 'bg-green-500'; // Hardcoded online status for now

  return (
    <div className="bg-black/40 h-[60px] flex items-center px-2 py-1 flex-shrink-0 mt-auto border-t border-white/10">
      
      {/* User Info */}
      <div className="flex items-center gap-2 flex-1 min-w-0 hover:bg-white/10 p-1 rounded-md cursor-pointer transition-colors mr-1">
        <div className="relative flex-shrink-0">
          {getAvatarUrl() ? (
            <img src={getAvatarUrl() as string} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold text-sm">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className={`absolute bottom-0 right-0 w-3 h-3 ${statusColor} rounded-full border-2 border-[#1e1f22]`}></div>
        </div>
        <div className="flex flex-col min-w-0" title={`ID: ${user?.id}`}>
          <span className="text-white text-sm font-bold truncate leading-tight">{displayName}</span>
          <span className="text-white/40 text-[10px] truncate leading-tight mt-0.5 font-semibold">
            @{profile?.username || user?.email?.split('@')[0]}
          </span>
        </div>
      </div>

      {/* Voice Controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button 
          onClick={toggleMute}
          className="w-8 h-8 flex items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors relative group"
          title={isMuted ? "Bật Mic" : "Tắt Mic"}
        >
          {isMuted ? <MicOff size={18} className="text-red-400" /> : <Mic size={18} />}
        </button>

        <button 
          onClick={toggleDeafen}
          className="w-8 h-8 flex items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors relative group"
          title={isDeafened ? "Bật Loa" : "Tắt Loa"}
        >
          {isDeafened ? (
            <div className="relative">
              <Headphones size={18} className="text-red-400" />
              <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-5 h-0.5 bg-red-400 rotate-45 border border-black/50"></div>
              </div>
            </div>
          ) : (
            <Headphones size={18} />
          )}
        </button>

        {/* Settings button wrapper to replace the generic trigger inside UserSettingsModal */}
        <div className="w-8 h-8 flex items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer">
           <UserSettingsModal user={user} profile={profile} customTrigger={<Settings size={18} />} />
        </div>
      </div>
      
    </div>
  );
}
