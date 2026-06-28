'use client';

import '@livekit/components-styles';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react';
import { useEffect, useState } from 'react';
import { useVoiceSettings } from '@/components/providers/VoiceSettingsProvider';

export function VoiceRoom({ channelId, username }: { channelId: string; username: string }) {
  const [token, setToken] = useState('');
  const [disconnected, setDisconnected] = useState(false);
  const { isMuted, isDeafened } = useVoiceSettings();

  useEffect(() => {
    // Nếu đã chủ động ngắt kết nối thì không tự lấy lại token
    if (disconnected) return;

    (async () => {
      try {
        const resp = await fetch(
          `/api/livekit?room=${channelId}&username=${encodeURIComponent(username)}`
        );
        const data = await resp.json();
        if (data.token) {
          setToken(data.token);
        } else {
          console.error('Không thể lấy token:', data.error);
        }
      } catch (e) {
        console.error('Lỗi khi fetch token:', e);
      }
    })();
  }, [channelId, username, disconnected]);

  if (disconnected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-800">
        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-4xl mb-6">
          👋
        </div>
        <h2 className="text-xl font-bold mb-2">Bạn đã rời phòng</h2>
        <p className="text-gray-500 mb-8">Bạn đã ngắt kết nối khỏi kênh thoại này.</p>
        <button 
          onClick={() => {
            setToken('');
            setDisconnected(false);
          }}
          className="px-6 py-2 bg-indigo-600 text-white font-medium rounded hover:bg-indigo-700 transition-colors"
        >
          Tham gia lại
        </button>
      </div>
    );
  }

  if (token === '') {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-500">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <span>Đang kết nối vào kênh thoại...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-black/40 overflow-hidden flex flex-col" data-lk-theme="default">
      <LiveKitRoom
        video={false}
        audio={!isMuted}
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        connect={true}
        onDisconnected={() => setDisconnected(true)}
        className="h-full w-full flex flex-col"
      >
        <VideoConference />
        {!isDeafened && <RoomAudioRenderer />}
      </LiveKitRoom>
    </div>
  );
}
