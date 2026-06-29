'use client';

import '@livekit/components-styles';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react';
import { useEffect, useState, useRef } from 'react';
import { useVoiceSettings } from '@/components/providers/VoiceSettingsProvider';
import { Edit3, Check, X } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export function VoiceRoom({ 
  channelId, 
  workspaceId = null, 
  username, 
  video = false,
  partnerId = '',
  userId = ''
}: { 
  channelId: string; 
  workspaceId?: string | null; 
  username: string; 
  video?: boolean;
  partnerId?: string;
  userId?: string;
}) {
  const [token, setToken] = useState('');
  const [disconnected, setDisconnected] = useState(false);
  const [error, setError] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  // P2P WebRTC Fallback States
  const [useP2P, setUseP2P] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [p2pMuted, setP2PMuted] = useState(false);
  const [p2pVideoOff, setP2PVideoOff] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

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

  // Fetch LiveKit Token - switch to P2P fallback on failure or missing keys
  useEffect(() => {
    if (disconnected || useP2P) return;

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
          // If LiveKit API keys are missing on server, fall back to P2P calling!
          if (data.error && data.error.includes('Missing LiveKit API keys')) {
            console.log('LiveKit keys are missing. Switching to P2P WebRTC Fallback...');
            setUseP2P(true);
          } else {
            setError(data.error || 'Không thể lấy mã thông báo phòng thoại.');
          }
        }
      } catch (e) {
        console.error('Lỗi khi fetch token:', e);
        setUseP2P(true);
      }
    })();
  }, [channelId, username, customName, disconnected, useP2P]);

  // P2P WebRTC connection setup
  useEffect(() => {
    if (!useP2P || !userId || !partnerId) return;

    const supabase = createSupabaseBrowserClient();
    const signalChannel = supabase.channel(`call-sig-${channelId}`);

    let localMediaStream: MediaStream | null = null;
    let peerConnection: RTCPeerConnection | null = null;
    const candidatesQueue: any[] = [];

    const startP2P = async () => {
      try {
        setError('');
        // Request microphone and camera (if video is enabled)
        localMediaStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: video ? { width: 640, height: 480 } : false
        });
        setLocalStream(localMediaStream);

        // Initialize Peer Connection with Google Stun Servers
        peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        });

        // Add local tracks to peer connection
        localMediaStream.getTracks().forEach(track => {
          peerConnection!.addTrack(track, localMediaStream!);
        });

        // Receive remote tracks
        peerConnection.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            setRemoteStream(event.streams[0]);
          }
        };

        // Gather ICE Candidates and broadcast to peer
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            signalChannel.send({
              type: 'broadcast',
              event: 'ice-candidate',
              payload: { candidate: event.candidate, senderId: userId }
            });
          }
        };

        // Handshake: create offer only when peer_ready is received to avoid timing issues
        signalChannel
          .on('broadcast', { event: 'peer_ready' }, async (payload) => {
            if (payload.payload.senderId === userId || !peerConnection) return;
            
            // Tie breaker: Alphabetically smaller UUID initiates the connection offer
            const isOfferCreator = userId < partnerId;
            if (isOfferCreator) {
              const offer = await peerConnection.createOffer();
              await peerConnection.setLocalDescription(offer);
              signalChannel.send({
                type: 'broadcast',
                event: 'sdp-offer',
                payload: { offer, senderId: userId }
              });
            }
          })
          .on('broadcast', { event: 'sdp-offer' }, async (payload) => {
            if (payload.payload.senderId === userId || !peerConnection) return;
            await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.payload.offer));
            
            // Process queued ICE candidates
            while (candidatesQueue.length > 0) {
              const candidate = candidatesQueue.shift();
              try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (e) {
                console.warn('Queued candidate error:', e);
              }
            }

            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            signalChannel.send({
              type: 'broadcast',
              event: 'sdp-answer',
              payload: { answer, senderId: userId }
            });
          })
          .on('broadcast', { event: 'sdp-answer' }, async (payload) => {
            if (payload.payload.senderId === userId || !peerConnection) return;
            await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.payload.answer));
            
            // Process queued ICE candidates
            while (candidatesQueue.length > 0) {
              const candidate = candidatesQueue.shift();
              try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (e) {
                console.warn('Queued candidate error:', e);
              }
            }
          })
          .on('broadcast', { event: 'ice-candidate' }, async (payload) => {
            if (payload.payload.senderId === userId || !peerConnection) return;
            const candidate = payload.payload.candidate;
            if (candidate) {
              if (peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
                try {
                  await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                  console.warn('Error adding ICE candidate:', e);
                }
              } else {
                candidatesQueue.push(candidate);
              }
            }
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              // Inform partner that we are ready to initiate/receive
              signalChannel.send({
                type: 'broadcast',
                event: 'peer_ready',
                payload: { senderId: userId }
              });
            }
          });

      } catch (err) {
        console.error('Failed to get media devices / WebRTC:', err);
        setError('Không thể truy cập Microphone hoặc Camera của bạn. Vui lòng cấp quyền truy cập thiết bị.');
      }
    };

    startP2P();

    return () => {
      if (localMediaStream) {
        localMediaStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnection) {
        peerConnection.close();
      }
      supabase.removeChannel(signalChannel);
    };
  }, [useP2P, channelId, video, userId, partnerId]);

  // Sync global isMuted and isDeafened settings to P2P connection
  useEffect(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMuted;
        setP2PMuted(isMuted);
      }
    }
  }, [isMuted, localStream]);

  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = isDeafened ? 0 : 1;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.volume = isDeafened ? 0 : 1;
    }
  }, [isDeafened, remoteStream]);

  // Bind local/remote source objects to visual elements and trigger playback
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(e => console.warn('Video play warning:', e));
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(e => console.warn('Audio play warning:', e));
    }
  }, [remoteStream]);

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setP2PMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setP2PVideoOff(!videoTrack.enabled);
      }
    }
  };

  const handleSaveName = () => {
    const trimmed = tempName.trim();
    if (trimmed) {
      setCustomName(trimmed);
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
        <h2 className="text-xl font-bold mb-2 text-white">Bạn đã rời cuộc gọi</h2>
        <p className="text-zinc-400 text-sm mb-8">Bạn đã ngắt kết nối.</p>
        <button 
          onClick={() => {
            setToken('');
            setDisconnected(false);
            setUseP2P(false);
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
            setUseP2P(false);
          }}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-lg transition-colors cursor-pointer shrink-0"
        >
          Thử kết nối lại
        </button>
      </div>
    );
  }

  if (useP2P) {
    return (
      <div className="flex-1 w-full h-full relative bg-zinc-950 flex flex-col justify-between p-4 overflow-hidden rounded-xl select-none">
        {/* WebRTC Video/Audio Render Frame */}
        <div className="flex-1 w-full h-full flex items-center justify-center relative rounded-xl overflow-hidden bg-zinc-900 border border-white/5">
          {video ? (
            remoteStream ? (
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-zinc-500">
                <div className="w-8 h-8 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin"></div>
                <p className="text-xs">Đang kết nối camera đối phương...</p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center p-8 select-none text-center">
              <div className="w-20 h-20 rounded-full bg-indigo-600/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 text-4xl mb-4 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400/10 opacity-75"></span>
                🎙️
              </div>
              <h4 className="font-extrabold text-sm text-white">Đang gọi thoại</h4>
              <p className="text-[10px] text-emerald-400 font-black uppercase tracking-wider mt-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Kết nối thiết bị trực tiếp (P2P WebRTC)
              </p>
              <audio ref={remoteAudioRef} autoPlay playsInline />
            </div>
          )}

          {/* Local Camera PIP Overlay */}
          {video && localStream && !p2pVideoOff && (
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-32 h-24 object-cover rounded-lg border border-white/20 absolute top-4 right-4 z-10 bg-zinc-950 shadow-2xl" 
            />
          )}
        </div>

        {/* Action Toggle controls */}
        <div className="mt-4 flex items-center justify-center gap-3 shrink-0">
          <button
            onClick={toggleMute}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer border ${p2pMuted ? 'bg-red-600 border-red-600 text-white' : 'bg-zinc-800 border-white/5 text-zinc-300 hover:bg-zinc-700'}`}
          >
            {p2pMuted ? 'Bỏ tắt Mic 🎙️' : 'Tắt tiếng 🎙️'}
          </button>

          {video && (
            <button
              onClick={toggleVideo}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer border ${p2pVideoOff ? 'bg-red-600 border-red-600 text-white' : 'bg-zinc-800 border-white/5 text-zinc-300 hover:bg-zinc-700'}`}
            >
              {p2pVideoOff ? 'Bật Camera 📷' : 'Tắt Camera 📷'}
            </button>
          )}
        </div>
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
              className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-600 transition-colors text-xs font-bold text-white rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
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
