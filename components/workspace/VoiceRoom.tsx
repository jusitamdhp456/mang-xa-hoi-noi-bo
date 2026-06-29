'use client';

import '@livekit/components-styles';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react';
import { useEffect, useState } from 'react';
import { useVoiceSettings } from '@/components/providers/VoiceSettingsProvider';
import { Edit3, Check, X } from 'lucide-react';

export function VoiceRoom({ 
  channelId, 
  workspaceId = null, 
  username, 
  video = false 
}: { 
  channelId: string; 
  workspaceId?: string | null; 
  username: string; 
  video?: boolean 
}) {
  const [token, setToken] = useState('');
  const [disconnected, setDisconnected] = useState(false);
  const [error, setError] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  const { 
    isMuted, 
    isDeafened, 
    setActiveChannelId, 
    setWorkspaceId, 
    customName, 
    setCustomName 
  } = useVoiceSettings();

  // Sync connection state with presence tracking provider
  useEffect(() => {
    setActiveChannelId(channelId);
    setWorkspaceId(workspaceId);
    return () => {
      setActiveChannelId(null);
      setWorkspaceId(null);
    };
  }, [channelId, workspaceId, setActiveChannelId, setWorkspaceId]);

  // Fetch LiveKit Token
  useEffect(() => {
    if (disconnected) return;

    (async () => {
      try {
        setError('');
        const resp = await fetch(
          `/api/livekit?room=${channelId}&username=${encodeURIComponent(customName || username)}`
        );
        const data = await resp.json();
        
        if (data.token) {
          setToken(data.token);
        } else {
          setError(data.error || 'Không thể lấy mã thông báo phòng thoại.');
        }
      } catch (e) {
        console.error('Lỗi khi fetch token:', e);
        setError('Có lỗi xảy ra khi thiết lập kết nối phòng thoại.');
      }
    })();
  }, [channelId, username, customName, disconnected]);

  const handleSaveName = () => {
    const trimmed = tempName.trim();
    if (trimmed) {
      setCustomName(trimmed);
      // Re-trigger token fetch with new username
      setToken(''); 
    } else {
      setCustomName(null);
      setToken('');
    }
    setIsEditingName(false);
  };

  if (disconnected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#121214] text-zinc-300 p-6 select-none">
        <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center text-4xl mb-6 shadow-lg border border-white/5">
          👋
        </div>
        <h2 className="text-xl font-bold mb-2 text-white">Bạn đã rời phòng</h2>
        <p className="text-zinc-400 text-sm mb-8">Bạn đã ngắt kết nối khỏi kênh thoại này.</p>
        <button 
          onClick={() => {
            setToken('');
            setDisconnected(false);
          }}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-sm font-bold text-white rounded-xl transition-colors cursor-pointer"
        >
          Tham gia lại
        </button>
      </div>
    );
  }

  if (error) {
    const isMissingKeys = error.includes("Missing LiveKit API keys");

    return (
      <div className="absolute inset-0 z-40 bg-zinc-950/95 backdrop-blur-md flex flex-col items-center justify-center text-zinc-300 p-4 select-none overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
        <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center text-xl mb-3 border border-red-500/20 shrink-0">
          ⚠️
        </div>
        <h2 className="text-sm font-bold mb-1 text-white shrink-0">
          {isMissingKeys ? "Chưa cấu hình API Key cho Đàm thoại" : "Lỗi kết nối phòng thoại"}
        </h2>
        
        {isMissingKeys ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 text-left w-full text-xs leading-relaxed max-w-md my-2.5 animate-scale-in shrink-0">
            <p className="text-zinc-300 text-[11px]">
              Hệ thống sử dụng <strong>LiveKit (WebRTC)</strong> để đàm thoại trực tiếp giữa các thiết bị. Bạn cần thêm 3 biến môi trường sau:
            </p>
            <div className="space-y-1 bg-black/40 p-2.5 rounded-lg border border-white/5 font-mono text-[9px] text-cyan-400 select-all cursor-pointer">
              <div>LIVEKIT_API_KEY=your_api_key</div>
              <div>LIVEKIT_API_SECRET=your_api_secret</div>
              <div>NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud</div>
            </div>
            <div className="text-zinc-400 space-y-1 text-[11px] pl-1">
              <p>• Bước 1: Tạo project miễn phí tại <strong><a href="https://cloud.livekit.io/" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">LiveKit Cloud</a></strong>.</p>
              <p>• Bước 2: Thêm các mã này vào <strong>Environment Variables</strong> trên <strong>Vercel Settings</strong> (hoặc file local <strong>.env.local</strong>) rồi redeploy.</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-400 mb-4 text-center max-w-sm shrink-0">{error}</p>
        )}

        <button 
          onClick={() => {
            setError('');
            setDisconnected(false);
            setToken('');
          }}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-lg transition-colors cursor-pointer shrink-0"
        >
          Thử kết nối lại
        </button>
      </div>
    );
  }

  if (token === '') {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#121214] text-zinc-400 select-none">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <span className="text-xs font-medium text-zinc-400">Đang kết nối vào kênh thoại...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#121214] overflow-hidden flex flex-col" data-lk-theme="default">
      {/* Voice Room Nickname Control Bar */}
      <div className="bg-zinc-900/60 border-b border-white/5 px-6 py-3.5 flex items-center justify-between gap-4 backdrop-blur-md shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/15 text-sm font-bold shadow-sm">
            🔊
          </div>
          <div>
            <h3 className="font-bold text-white text-xs">Phòng đàm thoại</h3>
            <p className="text-[9px] text-zinc-400 uppercase tracking-wider font-extrabold mt-0.5">Trực tiếp</p>
          </div>
        </div>

        {/* Edit Nickname Form */}
        {isEditingName ? (
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-2 py-1 animate-scale-in">
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Đặt biệt danh..."
              className="bg-transparent border-none outline-none text-xs text-white w-32 font-bold placeholder-zinc-500"
              maxLength={20}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') setIsEditingName(false);
              }}
              autoFocus
            />
            <button onClick={handleSaveName} className="text-emerald-400 hover:text-emerald-300 p-1 cursor-pointer">
              <Check size={14} />
            </button>
            <button onClick={() => setIsEditingName(false)} className="text-red-400 hover:text-red-300 p-1 cursor-pointer">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-zinc-300 font-semibold bg-white/5 border border-white/5 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
              Tên hiển thị: <strong className="text-white font-bold">{customName || username}</strong>
            </span>
            <button
              onClick={() => {
                setTempName(customName || username);
                setIsEditingName(true);
              }}
              className="px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 transition-colors text-xs font-bold text-white rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Edit3 size={12} />
              Đổi biệt danh
            </button>
          </div>
        )}
      </div>

      <LiveKitRoom
        video={video}
        audio={!isMuted}
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        connect={true}
        onDisconnected={() => setDisconnected(true)}
        className="h-full w-full flex flex-col flex-1"
      >
        <VideoConference />
        {!isDeafened && <RoomAudioRenderer />}
      </LiveKitRoom>
    </div>
  );
}
