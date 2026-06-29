'use client';

import React, { useState, useEffect } from 'react';
import { useVoiceSettings, playVoiceTone } from '@/components/providers/VoiceSettingsProvider';
import { Mic, MicOff, Headphones, PhoneOff, ChevronDown } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

interface UserPanelProps {
  user: User | null;
  profile: any | null;
  channels?: any[];
  workspaceName?: string | null;
}

export function UserPanel({ user, profile, channels, workspaceName }: UserPanelProps) {
  const router = useRouter();
  const { isMuted, isDeafened, toggleMute, toggleDeafen, activeChannelId, setActiveChannelId, setWorkspaceId } = useVoiceSettings();

  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [speakerDevices, setSpeakerDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<'mic' | 'speaker' | null>(null);

  const activeChannel = activeChannelId && channels
    ? channels.find(c => c.id === activeChannelId)
    : null;

  const loadDevices = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      setMicDevices(devices.filter(d => d.kind === 'audioinput'));
      setSpeakerDevices(devices.filter(d => d.kind === 'audiooutput'));
    } catch (e) {
      console.warn('Cannot enumerate devices:', e);
    }
  };

  useEffect(() => {
    if (activeDropdown !== null) {
      loadDevices();
    }
  }, [activeDropdown]);

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveDropdown(null);
    };
    if (activeDropdown !== null) {
      window.addEventListener('click', handleOutsideClick);
    }
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, [activeDropdown]);

  const getAvatarUrl = () => {
    if (profile?.avatar_key) {
      return `https://pub-9664a868c7184eaea9c2c0f43942f9d9.r2.dev/${profile.avatar_key}`;
    }
    return null;
  };

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Khách';
  const statusColor = 'bg-green-500';

  return (
    <div className="flex flex-col shrink-0 mt-auto relative">
      {/* Voice Connection Status Widget (Discord style) */}
      {activeChannelId && (
        <div className="bg-[#232428] border-t border-b border-white/10 px-3 py-2.5 flex items-center justify-between z-10 shadow-lg select-none">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-green-500 animate-pulse text-sm shrink-0">🟢</span>
            <div className="min-w-0 flex flex-col">
              <span className="text-green-500 text-[10px] font-extrabold uppercase tracking-wide truncate leading-none">Giọng nói đã kết nối</span>
              <span className="text-zinc-200 text-[11px] truncate leading-none mt-1.5 font-bold">
                {activeChannel?.name || 'Kênh thoại'}
              </span>
              {workspaceName && (
                <span className="text-zinc-500 text-[9px] truncate leading-none mt-0.5 font-semibold uppercase tracking-wider">
                  {workspaceName}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                playVoiceTone('leave');
                setActiveChannelId(null);
                setWorkspaceId(null);
                const currentWorkspaceId = window.location.pathname.split('/workspace/')[1]?.split('/')[0];
                if (currentWorkspaceId) {
                  router.push(`/workspace/${currentWorkspaceId}`);
                }
              }}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-white/5 text-red-400 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
              title="Ngắt kết nối đàm thoại"
            >
              <PhoneOff size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Main Profile Control Bar */}
      <div className="bg-[#232428] h-[60px] flex items-center px-2 py-1 border-t border-white/10 relative z-20">
        {/* User Info */}
        <div className="flex items-center gap-2 flex-1 min-w-0 hover:bg-white/5 p-1 rounded-md cursor-pointer transition-colors mr-1">
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
            <span className="text-white text-xs font-extrabold truncate leading-tight">{displayName}</span>
            <span className="text-white/40 text-[9px] truncate leading-tight mt-0.5 font-bold uppercase tracking-wider">
              @{profile?.username || user?.email?.split('@')[0]}
            </span>
          </div>
        </div>

        {/* Voice Controls */}
        <div className="flex items-center gap-0.5 flex-shrink-0 relative">
          
          {/* Mic Button & Caret */}
          <div className="flex items-center rounded-md hover:bg-white/5 transition-colors">
            <button 
              onClick={toggleMute}
              className="w-7 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
              title={isMuted ? "Bật Mic" : "Tắt Mic"}
            >
              {isMuted ? <MicOff size={16} className="text-red-400" /> : <Mic size={16} />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveDropdown(activeDropdown === 'mic' ? null : 'mic');
              }}
              className="w-3.5 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors cursor-pointer"
              title="Chọn Mic"
            >
              <ChevronDown size={10} />
            </button>
          </div>

          {/* Speaker Button & Caret */}
          <div className="flex items-center rounded-md hover:bg-white/5 transition-colors">
            <button 
              onClick={toggleDeafen}
              className="w-7 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
              title={isDeafened ? "Bật Loa" : "Tắt Loa"}
            >
              {isDeafened ? (
                <div className="relative">
                  <Headphones size={16} className="text-red-400" />
                  <div className="absolute inset-0 flex items-center justify-center">
                     <div className="w-4 h-0.5 bg-red-400 rotate-45 border border-black/50"></div>
                  </div>
                </div>
              ) : (
                <Headphones size={16} />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveDropdown(activeDropdown === 'speaker' ? null : 'speaker');
              }}
              className="w-3.5 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors cursor-pointer"
              title="Chọn Loa"
            >
              <ChevronDown size={10} />
            </button>
          </div>



          {/* Mic dropdown menu */}
          {activeDropdown === 'mic' && (
            <div 
              onClick={e => e.stopPropagation()}
              className="absolute bottom-11 right-12 w-56 bg-[#1e1f22] border border-white/10 rounded-xl shadow-2xl p-1.5 z-50 animate-scale-in text-zinc-300"
            >
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 px-2 py-1 select-none">Thiết bị Mic</p>
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {micDevices.map((d) => (
                  <button
                    key={d.deviceId}
                    onClick={() => {
                      localStorage.setItem('preferred_mic_id', d.deviceId);
                      window.dispatchEvent(new CustomEvent('preferred-devices-changed'));
                      setActiveDropdown(null);
                    }}
                    className={`w-full text-left px-2 py-1.5 text-xs rounded-lg transition-colors truncate block cursor-pointer ${
                      localStorage.getItem('preferred_mic_id') === d.deviceId 
                        ? 'bg-indigo-600 text-white font-bold' 
                        : 'hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    🎤 {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                  </button>
                ))}
                {micDevices.length === 0 && <p className="text-[10px] text-zinc-500 p-2 select-none">Không tìm thấy mic</p>}
              </div>
            </div>
          )}

          {/* Speaker dropdown menu */}
          {activeDropdown === 'speaker' && (
            <div 
              onClick={e => e.stopPropagation()}
              className="absolute bottom-11 right-6 w-56 bg-[#1e1f22] border border-white/10 rounded-xl shadow-2xl p-1.5 z-50 animate-scale-in text-zinc-300"
            >
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 px-2 py-1 select-none">Thiết bị Loa</p>
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {speakerDevices.map((d) => (
                  <button
                    key={d.deviceId}
                    onClick={() => {
                      localStorage.setItem('preferred_output_id', d.deviceId);
                      window.dispatchEvent(new CustomEvent('preferred-devices-changed'));
                      setActiveDropdown(null);
                    }}
                    className={`w-full text-left px-2 py-1.5 text-xs rounded-lg transition-colors truncate block cursor-pointer ${
                      localStorage.getItem('preferred_output_id') === d.deviceId 
                        ? 'bg-indigo-600 text-white font-bold' 
                        : 'hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    🔊 {d.label || `Speaker ${d.deviceId.slice(0, 5)}`}
                  </button>
                ))}
                {speakerDevices.length === 0 && <p className="text-[10px] text-zinc-500 p-2 select-none">Không tìm thấy loa</p>}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
