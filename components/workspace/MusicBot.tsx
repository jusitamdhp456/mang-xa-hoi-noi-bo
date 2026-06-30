'use client';

import { useEffect, useRef, useState } from 'react';
import { Room, LocalAudioTrack, Track } from 'livekit-client';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { playVoiceTone } from '@/components/providers/VoiceSettingsProvider';
import { useChat } from '@livekit/components-react';

export function MusicBot({ channelId, workspaceId }: { channelId: string; workspaceId: string }) {
  const [botStatus, setBotStatus] = useState<'idle' | 'searching' | 'playing' | 'error'>('idle');
  const [currentSong, setCurrentSong] = useState<string>('');
  
  const roomRef = useRef<Room | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<any>(null);
  
  const { chatMessages, send } = useChat();
  const processedMsgsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Intercept LiveKit chat messages for /play command
    if (chatMessages && chatMessages.length > 0) {
      const lastMessage = chatMessages[chatMessages.length - 1];
      
      // Prevent duplicate processing
      if (processedMsgsRef.current.has(lastMessage.id)) return;
      processedMsgsRef.current.add(lastMessage.id);

      // Only process our own messages to avoid multiple bots spawning
      if (lastMessage.from?.isLocal && lastMessage.message.trim().toLowerCase().startsWith('/play ')) {
        const query = lastMessage.message.trim().substring(6).trim();
        if (query) {
          // Gửi thông báo hệ thống vào LiveKit chat thay vì Supabase
          send(`🎵 Đang yêu cầu Bot phát nhạc: **${query}**...`);
          handlePlayCommand(query);
        }
      }
    }
  }, [chatMessages]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase.channel(`workspace:${workspaceId}:bot-commands`)
      .on(
        'broadcast',
        { event: 'play_music' },
        async ({ payload }) => {
          if (payload.channelId === channelId) {
            handlePlayCommand(payload.query);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      cleanupBot();
    };
  }, [channelId, workspaceId]);

  const cleanupBot = () => {
    if (trackRef.current) {
      trackRef.current.stop();
      trackRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    setBotStatus('idle');
  };

  const handlePlayCommand = async (query: string) => {
    // Nếu Bot đang chạy ở tab khác, ta có thể dùng khóa để đảm bảo chỉ 1 bot chạy.
    // Tạm thời đơn giản: ai là người gửi lệnh thì trình duyệt người đó làm Host.
    // Nếu không phải người gửi, thì bỏ qua không tạo bot (để tránh 2 người cùng host bot)
    // payload.requestedBy có thể là userId để check. Để đơn giản, giả sử luôn tạo mới.
    // Cần cẩn thận nếu nhiều người cùng ở trong phòng, sẽ có nhiều Bot.
    
    // Vì vậy ta thêm một cơ chế: chỉ người tạo lệnh mới chạy hàm này, 
    // Hoặc random delay để tranh chấp làm host (phức tạp).
    // Ở đây ta cứ cleanup cái cũ rồi tạo mới.

    cleanupBot();
    setBotStatus('searching');
    setCurrentSong(query);

    try {
      // 1. Lấy nhạc từ SoundCloud (cực nhanh và không bao giờ bị chặn IP)
      const searchRes = await fetch(`/api/bot/music?q=${encodeURIComponent(query)}`);
      if (!searchRes.ok) throw new Error('Không tìm thấy bài hát trên SoundCloud');
      const searchData = await searchRes.json();
      
      const audioUrl = searchData.streamUrl;

      // 2. Lấy LiveKit Token cho Bot
      // Truyền một username khác biệt để hiện avatar độc lập trong phòng
      const tokenRes = await fetch(`/api/livekit?room=${channelId}&username=${encodeURIComponent('🎵 Bot Nhạc')}&bot=true`);
      const tokenData = await tokenRes.json();
      if (!tokenData.token) throw new Error('Không lấy được token cho Bot');

      // 3. Kết nối LiveKit
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;
      
      const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
      if (!serverUrl) throw new Error('Thiếu LIVEKIT_URL');

      await room.connect(serverUrl, tokenData.token);

      // 4. Phát nhạc qua Web Audio API & captureStream
      const audioEl = new Audio();
      audioEl.crossOrigin = "anonymous";
      // Không cần proxy vì SoundCloud hỗ trợ sẵn CORS
      audioEl.src = audioUrl;
      audioRef.current = audioEl;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const source = audioCtx.createMediaElementSource(audioEl);
      const destination = audioCtx.createMediaStreamDestination();
      
      source.connect(destination);

      await audioEl.play();

      const mediaStreamTrack = destination.stream.getAudioTracks()[0];
      trackRef.current = mediaStreamTrack;

      // Đặt source là Microphone để LiveKit xếp nó vào giao diện dạng người dùng
      await room.localParticipant.publishTrack(mediaStreamTrack, {
        name: 'music',
        source: Track.Source.Microphone, 
      });

      setBotStatus('playing');

      // Khi kết thúc bài hát
      audioEl.onended = () => {
        cleanupBot();
      };

    } catch (e) {
      console.error('Bot Error:', e);
      setBotStatus('error');
      setTimeout(cleanupBot, 3000);
    }
  };

  return null; // Không render UI gì cả, vì Bot chỉ là client ngầm
}
