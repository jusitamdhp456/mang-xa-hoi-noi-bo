'use client';

import React, { useState, useEffect } from 'react';
import { useVoiceSettings, playVoiceTone } from '@/components/providers/VoiceSettingsProvider';
import { Mic, MicOff, Headphones, PhoneOff, ChevronDown, Volume2 } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { parseStatus, formatStatus, STATUS_META, STATUS_ORDER, type PresenceState } from '@/lib/status';
import { updateProfile } from '@/app/actions/user';

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
      return `/api/media/${profile.avatar_key}`;
    }
    return null;
  };

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Khách';

  // Presence status (stored encoded in profiles.status_text)
  const [status, setStatus] = useState(() => parseStatus(profile?.status_text));
  const [statusOpen, setStatusOpen] = useState(false);
  const [draftText, setDraftText] = useState(status.text);
  const statusColor = STATUS_META[status.state].dot;

  const applyStatus = async (state: PresenceState, text: string) => {
    setStatus({ state, text });
    setStatusOpen(false);
    await updateProfile({ status_text: formatStatus(state, text) });
    router.refresh();
  };

  return (
    <div className="flex flex-col shrink-0 mt-auto relative">
      {/* Voice Connection Status Widget (Discord style) */}
      {activeChannelId && (
        <div className="bg-[#232428] border-t border-b border-white/10 px-3 py-2.5 flex items-center justify-between z-10 shadow-lg select-none">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0 shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
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
            {/* Camera + screen-share are portaled here from inside LiveKitRoom
                (mic/deafen already live in the profile bar just below). */}
            <div id="voice-extra-controls" className="flex items-center" />

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
        {/* Status menu */}
        {statusOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setStatusOpen(false)} />
            <div className="absolute bottom-[64px] left-2 w-60 bg-[#1e1f22] border border-white/10 rounded-xl shadow-2xl p-2 z-50 animate-scale-in" onClick={(e) => e.stopPropagation()}>
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 px-2 py-1 select-none">Trạng thái</p>
              {STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  onClick={() => applyStatus(s, draftText)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer text-left ${status.state === s ? 'bg-white/10 text-white' : 'text-zinc-300 hover:bg-white/5'}`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${STATUS_META[s].dot}`} />
                  {STATUS_META[s].label}
                  {status.state === s && <span className="ml-auto text-indigo-300">✓</span>}
                </button>
              ))}
              <div className="h-px bg-white/10 my-1.5" />
              <input
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyStatus(status.state, draftText); }}
                placeholder="Trạng thái tùy chỉnh…"
                maxLength={80}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => applyStatus(status.state, draftText)}
                className="w-full mt-1.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Lưu trạng thái
              </button>
            </div>
          </>
        )}

        {/* User Info */}
        <div
          onClick={() => setStatusOpen((v) => !v)}
          className="flex items-center gap-2 flex-1 min-w-0 hover:bg-white/5 p-1 rounded-md cursor-pointer transition-colors mr-1"
        >
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
                    <Mic size={12} className="inline-block mr-1.5 align-text-bottom" /> {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
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
                    <Volume2 size={12} className="inline-block mr-1.5 align-text-bottom" /> {d.label || `Speaker ${d.deviceId.slice(0, 5)}`}
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
