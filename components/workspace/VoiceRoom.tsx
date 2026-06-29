'use client';

import '@livekit/components-styles';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
} from '@livekit/components-react';

function LiveKitSync({ isMuted, isDeafened }: { isMuted: boolean; isDeafened: boolean }) {
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    if (localParticipant) {
      const isMicEnabled = !isMuted && !isDeafened;
      localParticipant.setMicrophoneEnabled(isMicEnabled).catch(err => {
        console.warn('Failed to sync microphone state with LiveKit:', err);
      });
    }
  }, [isMuted, isDeafened, localParticipant]);

  return null;
}

function LiveKitActiveSpeakersSync({ setSpeakingUserIds }: { setSpeakingUserIds: (ids: string[]) => void }) {
  const participants = useParticipants();

  useEffect(() => {
    const speakingIds = participants
      .filter(p => p.isSpeaking)
      .map(p => p.identity);
    setSpeakingUserIds(speakingIds);
  }, [participants, setSpeakingUserIds]);

  return null;
}
import { useEffect, useState, useRef } from 'react';
import { useVoiceSettings } from '@/components/providers/VoiceSettingsProvider';
import { Edit3, Check, X, Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Volume2, VolumeX, Settings } from 'lucide-react';
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

  // Media device settings states
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('');
  const [selectedOutputId, setSelectedOutputId] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const { 
    isMuted, 
    isDeafened, 
    toggleDeafen,
    setActiveChannelId, 
    setWorkspaceId, 
    customName, 
    setCustomName,
    setSpeakingUserIds,
    activeParticipants,
    currentUser,
    speakingUserIds
  } = useVoiceSettings();

  const myUserId = currentUser?.id || userId;
  const otherParticipants = activeParticipants.filter(p => p.user_id !== myUserId && p.voice_channel_id === channelId);
  const matchedPartnerId = otherParticipants[0]?.user_id || '';

  // Sync connection state with presence tracking provider
  useEffect(() => {
    setActiveChannelId(channelId);
    setWorkspaceId(workspaceId);
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
  }, [channelId, username, customName, disconnected]);

  // P2P WebRTC connection setup
  useEffect(() => {
    if (!useP2P || !myUserId || !matchedPartnerId) return;

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
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        });
        peerConnection = pc;
        pcRef.current = pc;

        // Add local tracks to peer connection
        localMediaStream.getTracks().forEach(track => {
          peerConnection!.addTrack(track, localMediaStream!);
        });

        // Initialize remote stream container
        const remoteMediaStream = new MediaStream();
        
        // Receive remote tracks
        peerConnection.ontrack = (event) => {
          remoteMediaStream.addTrack(event.track);
          // Force state refresh to bind stream
          setRemoteStream(new MediaStream(remoteMediaStream.getTracks()));
        };

        // Gather ICE Candidates and broadcast to peer
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            signalChannel.send({
              type: 'broadcast',
              event: 'ice-candidate',
              payload: { candidate: event.candidate, senderId: myUserId }
            });
          }
        };

        // Handshake: peer_ready synchronization logic
        signalChannel
          .on('broadcast', { event: 'peer_ready' }, async (payload) => {
            if (payload.payload.senderId === myUserId || !peerConnection) return;
            
            // Create offer if we are the initiator (e.g. alphabetical comparison to resolve role conflict)
            const isInitiator = myUserId < matchedPartnerId;
            if (isInitiator) {
              const offer = await peerConnection.createOffer();
              await peerConnection.setLocalDescription(offer);
              
              signalChannel.send({
                type: 'broadcast',
                event: 'sdp-offer',
                payload: { offer, senderId: myUserId }
              });
            }
          })
          .on('broadcast', { event: 'sdp-offer' }, async (payload) => {
            if (payload.payload.senderId === myUserId || !peerConnection) return;
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
              payload: { answer, senderId: myUserId }
            });
          })
          .on('broadcast', { event: 'sdp-answer' }, async (payload) => {
            if (payload.payload.senderId === myUserId || !peerConnection) return;
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
            if (payload.payload.senderId === myUserId || !peerConnection) return;
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
              // Wait slightly for connection to establish and then send ready
              setTimeout(() => {
                signalChannel.send({
                  type: 'broadcast',
                  event: 'peer_ready',
                  payload: { senderId: myUserId }
                });
              }, 500);
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
  }, [useP2P, channelId, video, myUserId, matchedPartnerId]);

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

  // Bind local source objects to visual element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Bind remote source objects to media tags, configure volume/mute, and play
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.volume = isDeafened ? 0 : 1;
      remoteVideoRef.current.muted = isDeafened;
      remoteVideoRef.current.play().catch(e => console.warn('Video play warning:', e));
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.volume = isDeafened ? 0 : 1;
      remoteAudioRef.current.muted = isDeafened;
      remoteAudioRef.current.play().catch(e => console.warn('Audio play warning:', e));
    }
  }, [remoteStream, isDeafened]);

  // For P2P speaking detection using Web Audio API AnalyserNode
  useEffect(() => {
    if (!useP2P || !localStream) return;

    let audioContext: AudioContext | null = null;
    let localAnalyser: AnalyserNode | null = null;
    let remoteAnalyser: AnalyserNode | null = null;
    let localSource: MediaStreamAudioSourceNode | null = null;
    let remoteSource: MediaStreamAudioSourceNode | null = null;
    let intervalId: any = null;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContext = new AudioContextClass();
      
      localAnalyser = audioContext.createAnalyser();
      localAnalyser.fftSize = 512;
      localSource = audioContext.createMediaStreamSource(localStream);
      localSource.connect(localAnalyser);

      if (remoteStream) {
        remoteAnalyser = audioContext.createAnalyser();
        remoteAnalyser.fftSize = 512;
        remoteSource = audioContext.createMediaStreamSource(remoteStream);
        remoteSource.connect(remoteAnalyser);
      }

      const bufferLength = localAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      intervalId = setInterval(() => {
        const speakingList: string[] = [];

        // Check local mic volume
        if (localAnalyser && !isMuted && !isDeafened) {
          localAnalyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          if (average > 15) { // volume threshold
            speakingList.push(userId);
          }
        }

        // Check remote mic volume
        if (remoteAnalyser && remoteStream && !isDeafened) {
          remoteAnalyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          if (average > 15) { // volume threshold
            if (partnerId) {
              speakingList.push(partnerId);
            }
          }
        }

        setSpeakingUserIds(speakingList);
      }, 150);

    } catch (e) {
      console.warn("P2P speaking analyzer error:", e);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (localSource) localSource.disconnect();
      if (remoteSource) remoteSource.disconnect();
      if (audioContext) audioContext.close();
      setSpeakingUserIds([]);
    };
  }, [useP2P, localStream, remoteStream, isMuted, isDeafened, userId, partnerId, setSpeakingUserIds]);

  // Query available media input and output devices
  useEffect(() => {
    if (!useP2P) return;

    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        const mDevices = devices.filter(d => d.kind === 'audioinput');
        const oDevices = devices.filter(d => d.kind === 'audiooutput');
        
        setMicDevices(mDevices);
        setOutputDevices(oDevices);

        // Auto select current active microphone deviceId
        if (localStream) {
          const activeMicTrack = localStream.getAudioTracks()[0];
          if (activeMicTrack) {
            const settings = activeMicTrack.getSettings();
            if (settings.deviceId) {
              setSelectedMicId(settings.deviceId);
            }
          }
        }
      } catch (e) {
        console.warn('enumerateDevices error:', e);
      }
    };

    getDevices();
    
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    };
  }, [useP2P, localStream]);

  // Handle changing the microphone device dynamically
  const changeMicrophone = async (deviceId: string) => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
        video: video ? { width: 640, height: 480 } : false
      });
      
      const newAudioTrack = newStream.getAudioTracks()[0];
      
      if (localStream) {
        const oldAudioTrack = localStream.getAudioTracks()[0];
        if (oldAudioTrack) {
          localStream.removeTrack(oldAudioTrack);
          oldAudioTrack.stop();
        }
        localStream.addTrack(newAudioTrack);
        setLocalStream(new MediaStream(localStream.getTracks()));
      }

      if (pcRef.current) {
        const senders = pcRef.current.getSenders();
        const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
        if (audioSender) {
          await audioSender.replaceTrack(newAudioTrack);
        }
      }
      setSelectedMicId(deviceId);
    } catch (e) {
      console.error('Failed to change microphone:', e);
    }
  };

  // Handle changing the speaker / headphones output device
  const changeAudioOutput = async (deviceId: string) => {
    try {
      if (remoteAudioRef.current && (remoteAudioRef.current as any).setSinkId) {
        await (remoteAudioRef.current as any).setSinkId(deviceId);
      }
      if (remoteVideoRef.current && (remoteVideoRef.current as any).setSinkId) {
        await (remoteVideoRef.current as any).setSinkId(deviceId);
      }
      setSelectedOutputId(deviceId);
    } catch (e) {
      console.error('Failed to change audio output device:', e);
    }
  };

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
          className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-xs font-bold text-white rounded-lg transition-colors cursor-pointer shrink-0"
        >
          Thử kết nối lại
        </button>
      </div>
    );
  }

  if (useP2P) {
    return (
      <div className="flex-1 w-full h-full relative bg-zinc-950 flex flex-col justify-between p-6 overflow-hidden rounded-2xl select-none border border-white/5 shadow-2xl">
        
        {/* Call Content Area */}
        <div className="flex-1 w-full h-full flex items-center justify-center relative rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 shadow-inner">
          {video ? (
            remoteStream ? (
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-3 text-zinc-500">
                <div className="w-9 h-9 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin"></div>
                <p className="text-xs font-semibold">Đang truyền video của bạn & kết nối camera đối phương...</p>
              </div>
            )
          ) : (
            /* Discord-like Voice Call Grid Layout */
            <div className="flex flex-wrap items-center justify-center gap-6 p-6 select-none max-w-4xl mx-auto w-full">
              {activeParticipants
                .filter(p => p.voice_channel_id === channelId)
                .map(p => {
                  const isSelf = p.user_id === myUserId;
                  const displayName = p.custom_name || p.display_name;
                  const initial = displayName.charAt(0).toUpperCase();
                  const isMutedOrDeafened = p.is_muted || p.is_deafened;
                  const isSpeaking = speakingUserIds.includes(p.user_id);

                  return (
                    <div 
                      key={p.user_id} 
                      className={`bg-zinc-850/70 border backdrop-blur-md rounded-2xl p-6 flex flex-col items-center justify-center space-y-4 w-44 h-44 shadow-2xl relative transition-all duration-300 ${
                        isSpeaking 
                          ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-105' 
                          : 'border-white/10'
                      }`}
                    >
                      <div className="relative">
                        {p.avatar_key ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={`https://pub-9664a868c7184eaea9c2c5f43942f9d9.r2.dev/${p.avatar_key}`} 
                            alt="" 
                            className={`w-16 h-16 rounded-full object-cover border-2 transition-all duration-300 ${
                              isSpeaking ? 'border-emerald-400' : 'border-zinc-700'
                            }`}
                          />
                        ) : (
                          <div 
                            className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-black uppercase border-2 transition-all duration-300 ${
                              isSelf ? 'bg-indigo-650' : 'bg-zinc-700'
                            } ${
                              isSpeaking ? 'border-emerald-400' : 'border-zinc-500'
                            }`}
                          >
                            {initial}
                          </div>
                        )}
                        {isMutedOrDeafened && (
                          <span className="absolute -bottom-1 -right-1 bg-red-600 text-white rounded-full p-1 border border-zinc-900 shadow-md">
                            <MicOff size={10} />
                          </span>
                        )}
                      </div>
                      <div className="text-center w-full">
                        <h5 className="font-extrabold text-xs text-white truncate px-2">{displayName}</h5>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-1">
                          {isSelf ? 'Bạn (Thiết bị)' : 'Đang kết nối'}
                        </p>
                      </div>
                      {/* Audio tag for WebRTC remote streams */}
                      {!isSelf && <audio ref={remoteAudioRef} autoPlay playsInline />}
                    </div>
                  );
                })}
            </div>
          )}

          {/* Local Camera PIP Overlay */}
          {video && localStream && !p2pVideoOff && (
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-36 h-28 object-cover rounded-xl border border-white/20 absolute top-4 right-4 z-10 bg-zinc-950 shadow-2xl transition-all hover:scale-105" 
            />
          )}
        </div>

        {/* Action Toggle controls */}
        <div className="mt-5 flex items-center justify-center gap-4 shrink-0 bg-zinc-900/60 p-3 rounded-2xl border border-white/5 backdrop-blur-md max-w-sm mx-auto w-full relative">
          <button
            onClick={toggleMute}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer border ${p2pMuted ? 'bg-red-600 border-red-600 text-white' : 'bg-zinc-800 border-white/10 text-zinc-300 hover:bg-zinc-700'}`}
            title={p2pMuted ? 'Mở khóa Micro' : 'Tắt tiếng Micro'}
          >
            {p2pMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <button
            onClick={toggleDeafen}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer border ${isDeafened ? 'bg-red-600 border-red-600 text-white' : 'bg-zinc-800 border-white/10 text-zinc-300 hover:bg-zinc-700'}`}
            title={isDeafened ? 'Bật âm thanh (Nghe)' : 'Tắt âm thanh (Deafen)'}
          >
            {isDeafened ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          {video && (
            <button
              onClick={toggleVideo}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer border ${p2pVideoOff ? 'bg-red-600 border-red-600 text-white' : 'bg-zinc-800 border-white/10 text-zinc-300 hover:bg-zinc-700'}`}
              title={p2pVideoOff ? 'Bật Camera' : 'Tắt Camera'}
            >
              {p2pVideoOff ? <VideoOff size={18} /> : <VideoIcon size={18} />}
            </button>
          )}

          {/* Device Audio Settings Popover trigger */}
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer border ${isSettingsOpen ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-zinc-800 border-white/10 text-zinc-300 hover:bg-zinc-700'}`}
            title="Cài đặt thiết bị âm thanh"
          >
            <Settings size={18} />
          </button>

          {/* Device settings popover menu */}
          {isSettingsOpen && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-[#1e1f22]/95 border border-white/10 rounded-2xl p-4 w-[280px] shadow-2xl z-30 space-y-4 animate-scale-in text-left">
              <h4 className="font-extrabold text-[11px] text-zinc-400 uppercase tracking-wider">Cấu hình Thiết bị</h4>
              
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-400 font-bold">🎙️ Đầu vào (Microphone)</label>
                <select
                  value={selectedMicId}
                  onChange={(e) => changeMicrophone(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/5 text-zinc-200 text-xs rounded-xl p-2.5 outline-none font-semibold cursor-pointer"
                >
                  {micDevices.map((d, idx) => (
                    <option key={d.deviceId || idx} value={d.deviceId}>
                      {d.label || `Microphone ${idx + 1}`}
                    </option>
                  ))}
                  {micDevices.length === 0 && <option>Không tìm thấy thiết bị thu</option>}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-400 font-bold">🔊 Đầu ra (Loa / Tai nghe)</label>
                <select
                  value={selectedOutputId}
                  onChange={(e) => changeAudioOutput(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/5 text-zinc-200 text-xs rounded-xl p-2.5 outline-none font-semibold cursor-pointer"
                >
                  {outputDevices.map((d, idx) => (
                    <option key={d.deviceId || idx} value={d.deviceId}>
                      {d.label || `Speaker/Headphones ${idx + 1}`}
                    </option>
                  ))}
                  {outputDevices.length === 0 && <option>Thiết bị mặc định hệ thống</option>}
                </select>
              </div>
            </div>
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
        <LiveKitSync isMuted={isMuted} isDeafened={isDeafened} />
        <LiveKitActiveSpeakersSync setSpeakingUserIds={setSpeakingUserIds} />
        <VideoConference />
        {!isDeafened && <RoomAudioRenderer />}
      </LiveKitRoom>
    </div>
  );
}
