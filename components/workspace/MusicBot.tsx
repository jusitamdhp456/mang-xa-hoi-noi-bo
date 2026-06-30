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
  const botPresenceChannelRef = useRef<any>(null);
  
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
    const handlePlayRequest = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.channelId === channelId) {
        handlePlayCommand(detail.query);
      }
    };
    window.addEventListener('play_music_request', handlePlayRequest);

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
      window.removeEventListener('play_music_request', handlePlayRequest);
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
    if (botPresenceChannelRef.current) {
      botPresenceChannelRef.current.unsubscribe();
      botPresenceChannelRef.current = null;
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
      // 1. Bắt đầu lấy token LiveKit và tìm nhạc song song để tăng tốc
      const tokenPromise = fetch(`/api/livekit?room=${channelId}&username=${encodeURIComponent('🎵 Bot Nhạc')}&bot=true`).then(r => r.json());
      const searchPromise = fetch(`/api/bot/music?q=${encodeURIComponent(query)}`);

      // 2. Ưu tiên kết nối LiveKit ngay lập tức để Bot hiện trên giao diện
      const tokenData = await tokenPromise;
      if (!tokenData.token) throw new Error('Không lấy được token cho Bot');

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;
      
      const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
      if (!serverUrl) throw new Error('Thiếu LIVEKIT_URL');

      await room.connect(serverUrl, tokenData.token);

      // 2.5 Theo dõi Presence của Bot trên Supabase để hiện trên thanh Sidebar
      const botIdentity = room.localParticipant.identity;
      const supabase = createSupabaseBrowserClient();
      const botPresenceChannel = supabase.channel(`workspace_presence:${workspaceId}_bots`, {
        config: { presence: { key: botIdentity } },
      });
      botPresenceChannelRef.current = botPresenceChannel;
      
      botPresenceChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await botPresenceChannel.track({
            user_id: botIdentity,
            display_name: '🎵 Bot Nhạc',
            avatar_key: null,
            voice_channel_id: channelId,
            custom_name: '🎵 Bot Nhạc',
            is_muted: false,
            is_deafened: false,
          });
        }
      });

      // 3. Đợi kết quả tìm nhạc
      const searchRes = await searchPromise;
      if (!searchRes.ok) throw new Error('Không tìm thấy bài hát trên SoundCloud');
      const searchData = await searchRes.json();
      
      const audioUrl = searchData.streamUrl;

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
