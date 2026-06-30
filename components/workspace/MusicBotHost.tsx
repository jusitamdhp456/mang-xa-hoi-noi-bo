'use client';

import { useEffect, useState, useRef } from 'react';
import { Room, Track } from 'livekit-client';

export function MusicBotHost({ channelId }: { channelId: string }) {
  const [botState, setBotState] = useState<{ videoId: string, title: string, status: string } | null>(null);
  const roomRef = useRef<Room | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const handlePlayRequest = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.channelId !== channelId) return;

      setBotState({ videoId: '', title: detail.query, status: 'Đang tìm kiếm...' });

      try {
        // 1. Search & Get Stream from SoundCloud
        const musicRes = await fetch(`/api/bot/music?q=${encodeURIComponent(detail.query)}`);
        
        if (!musicRes.ok) {
          const errData = await musicRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Không tìm thấy bài hát hoặc lỗi máy chủ');
        }
        
        const data = await musicRes.json();
        
        setBotState({ videoId: data.trackId, title: data.title, status: 'Đang kết nối...' });

        // 2. Disconnect existing bot if any
        if (roomRef.current) {
          await roomRef.current.disconnect();
          roomRef.current = null;
        }

        // 3. Get Token for Bot Music
        const tokenRes = await fetch(`/api/livekit/get-participant-token?room=${channelId}&username=Bot%20Music`);
        const tokenData = await tokenRes.json();
        const token = tokenData.token;

        // 4. Connect Room
        const room = new Room();
        roomRef.current = room;
        await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token);

        // 5. Setup Audio Element & Web Audio API
        if (audioRef.current) {
          // Trình duyệt sẽ phát trực tiếp streamUrl này mà không cần proxy vì SoundCloud cấp sẵn CORS
          audioRef.current.src = data.streamUrl;
          audioRef.current.crossOrigin = 'anonymous';
          
          if (!audioCtxRef.current) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            audioCtxRef.current = new AudioContext();
            const source = audioCtxRef.current.createMediaElementSource(audioRef.current);
            const dest = audioCtxRef.current.createMediaStreamDestination();
            source.connect(dest);
            // Cố tình không connect source vào destination chính để không phát tiếng trên máy người gọi bot (tránh vang âm)
            (audioRef.current as any)._capturedStream = dest.stream;
          }

          // Cần play trước khi capture
          await audioRef.current.play();

          // 6. Publish
          const stream = (audioRef.current as any)._capturedStream;
          const audioTrack = stream.getAudioTracks()[0];
          
          if (audioTrack) {
            await room.localParticipant.publishTrack(audioTrack, { name: 'music', source: Track.Source.Microphone });
            setBotState({ videoId: data.trackId, title: data.title, status: 'Đang phát' });
          } else {
            throw new Error('Không thể lấy luồng âm thanh');
          }
        }
      } catch (err: any) {
        console.error('Bot Error:', err);
        setBotState(null);
      }
    };

    window.addEventListener('play_music_request', handlePlayRequest);
    return () => {
      window.removeEventListener('play_music_request', handlePlayRequest);
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, [channelId]);

  return (
    <>
      <audio 
        ref={audioRef} 
        onEnded={() => {
          if (roomRef.current) roomRef.current.disconnect();
          setBotState(null);
        }}
        className="hidden" 
      />
    </>
  );
}
