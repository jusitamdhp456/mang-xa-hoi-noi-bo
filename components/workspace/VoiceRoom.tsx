'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import '@livekit/components-styles';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  ParticipantTile,
  useTracks,
  useLocalParticipant,
  useParticipants,
  useTrackRefContext,
  VideoTrack
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Monitor, MonitorOff, AlertTriangle } from 'lucide-react';
import { useVoiceSettings, playVoiceTone } from '@/components/providers/VoiceSettingsProvider';
import { useRouter } from 'next/navigation';
import { Edit3, Check, X, Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Volume2, VolumeX, Settings } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

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

function ScreenShareOverlay({
  setWatchingScreenShares,
}: {
  setWatchingScreenShares: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const trackRef = useTrackRefContext();
  const { localParticipant } = useLocalParticipant();
  
  if (trackRef.source !== Track.Source.ScreenShare) return null;
  
  const id = trackRef.participant.identity;
  if (id === localParticipant.identity) return null;
  
  return (
    <div className="absolute inset-0 bg-zinc-900 z-10 flex flex-col items-center justify-center">
      <Monitor size={32} className="text-white/30 mb-3" />
      <p className="text-white text-xs font-medium mb-3">{trackRef.participant.name || 'Người dùng'} đang chia sẻ màn hình</p>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setWatchingScreenShares(prev => {
            const next = new Set(prev);
            next.add(id);
            return next;
          });
        }}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg transition-colors flex items-center gap-2 text-sm"
      >
        <Monitor size={16} />
        Vào xem
      </button>
    </div>
  );
}

// Compact media stage: shows camera/screen-share tiles (avatar placeholder when
// no video). Kept small so the main area stays free for chat + future media.


function VoiceStage() {
  const allTracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const [watchingScreenShares, setWatchingScreenShares] = useState<Set<string>>(new Set());
  const { localParticipant } = useLocalParticipant();
  const { activeParticipants, speakingUserIds } = useVoiceSettings();

  const cameraTracks = allTracks.filter(t => t.source === Track.Source.Camera);
  const screenShareTracks = allTracks.filter(t => t.source === Track.Source.ScreenShare);

  const activeScreenShare = screenShareTracks.find(t => 
    t.participant.identity === localParticipant.identity || watchingScreenShares.has(t.participant.identity)
  );

  const bottomTracks = [
    ...cameraTracks,
    ...screenShareTracks.filter(t => t !== activeScreenShare)
  ];

  return (
    <div className="flex-1 min-h-0 p-2 flex flex-col gap-2 relative bg-transparent">
      {/* Active Screen Share Area */}
      {activeScreenShare && (
        <div className="flex-1 min-h-0 rounded-xl overflow-hidden relative bg-black shadow-lg border border-white/5 flex items-center justify-center">
          <VideoTrack trackRef={activeScreenShare as any} className="w-full h-full object-contain" />
          
          {activeScreenShare.participant.identity !== localParticipant.identity && (
             <div className="absolute top-4 left-4 z-20">
                <button 
                  onClick={() => {
                    setWatchingScreenShares(prev => {
                      const next = new Set(prev);
                      next.delete(activeScreenShare.participant.identity);
                      return next;
                    });
                  }}
                  className="px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white rounded-md text-sm font-medium flex items-center gap-2 border border-white/10 shadow-sm transition-all"
                >
                  <MonitorOff size={16} className="text-red-400" />
                  Dừng xem màn hình của {activeScreenShare.participant.name || 'người dùng'}
                </button>
              </div>
          )}
        </div>
      )}

      {/* Bottom Area: If watching screen share, show avatars. Otherwise show the standard grid. */}
      {activeScreenShare ? (
        <div className="h-20 md:h-24 shrink-0 flex items-center justify-center gap-4 bg-zinc-900/50 rounded-xl px-4 overflow-x-auto border border-white/5">
           {activeParticipants.map(p => {
             const isSpeaking = speakingUserIds.includes(p.user_id);
             const avatarUrl = p.avatar_key 
               ? `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${p.avatar_key}` 
               : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.display_name)}&background=random`;
             return (
               <div key={p.user_id} className="flex flex-col items-center gap-1.5 shrink-0">
                 <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden border-2 transition-colors ${isSpeaking ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'border-transparent'}`}>
                   <img src={avatarUrl} alt={p.display_name} className="w-full h-full object-cover" />
                 </div>
                 <span className="text-[10px] md:text-xs text-zinc-400 max-w-[60px] truncate text-center">{p.display_name}</span>
               </div>
             )
           })}
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          {bottomTracks.length > 0 ? (
            <GridLayout tracks={bottomTracks} className="h-full">
              <ParticipantTile>
                <ScreenShareOverlay setWatchingScreenShares={setWatchingScreenShares} />
              </ParticipantTile>
            </GridLayout>
          ) : (
             <div className="flex-1 w-full h-full flex flex-wrap items-center justify-center gap-6 md:gap-8 p-6 md:p-8 overflow-y-auto">
               {activeParticipants.map(p => {
                 const isSpeaking = speakingUserIds.includes(p.user_id);
                 const avatarUrl = p.avatar_key 
                   ? `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${p.avatar_key}` 
                   : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.display_name)}&background=random`;
                 return (
                   <div key={p.user_id} className="flex flex-col items-center gap-3 md:gap-4 shrink-0">
                     <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 transition-all duration-300 ${isSpeaking ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-105' : 'border-white/5'}`}>
                       <img src={avatarUrl} alt={p.display_name} className="w-full h-full object-cover" />
                     </div>
                     <span className="text-sm md:text-base font-semibold text-zinc-300 max-w-[150px] truncate text-center bg-black/40 px-4 py-1.5 rounded-full border border-white/5">{p.display_name}</span>
                   </div>
                 )
               })}
             </div>
          )}
        </div>
      )}
    </div>
  );
}

// Camera + screen-share controls. These need the LiveKit room context (so they
// live inside <LiveKitRoom>), but are portaled into the sidebar voice panel
// (#voice-extra-controls in UserPanel) so all voice controls sit together at
// the bottom-left. Mic/deafen/leave already live in UserPanel via VoiceSettings.
function VoiceExtraControls() {
  const { localParticipant } = useLocalParticipant();
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);

  // Wait for the portal target in the sidebar to exist.
  useEffect(() => {
    let raf = 0;
    const find = () => {
      const el = document.getElementById('voice-extra-controls');
      if (el) setSlot(el);
      else raf = requestAnimationFrame(find);
    };
    find();
    return () => cancelAnimationFrame(raf);
  }, []);

  const toggleCamera = async () => {
    try {
      const next = !cameraOn;
      await localParticipant.setCameraEnabled(next);
      setCameraOn(next);
    } catch (e) {
      console.warn('Camera toggle failed:', e);
    }
  };

  const toggleScreen = async () => {
    try {
      const next = !screenOn;
      await localParticipant.setScreenShareEnabled(next);
      setScreenOn(next);
    } catch (e) {
      console.warn('Screen share toggle failed:', e);
    }
  };

  if (!slot) return null;

  const btn = 'w-7 h-8 flex items-center justify-center rounded-md transition-colors cursor-pointer';
  const idle = 'text-white/70 hover:text-white hover:bg-white/5';
  const active = 'text-indigo-400 bg-indigo-500/15 hover:bg-indigo-500/25';

  return createPortal(
    <>
      <button onClick={toggleCamera} className={`${btn} ${cameraOn ? active : idle}`} title={cameraOn ? 'Tắt camera' : 'Bật camera'}>
        {cameraOn ? <VideoIcon size={15} /> : <VideoOff size={15} />}
      </button>
      <button onClick={toggleScreen} className={`${btn} ${screenOn ? active : idle}`} title={screenOn ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}>
        {screenOn ? <MonitorOff size={15} /> : <Monitor size={15} />}
      </button>
    </>,
    slot
  );
}

// Full control bar for mobile, where the sidebar (and its voice controls) is
// hidden. Visible only below the lg breakpoint.
function MobileVoiceControls() {
  const router = useRouter();
  const { localParticipant } = useLocalParticipant();
  const { isMuted, toggleMute, isDeafened, toggleDeafen, setActiveChannelId, setWorkspaceId } = useVoiceSettings();
  const [cameraOn, setCameraOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);

  const toggleCamera = async () => {
    try { const n = !cameraOn; await localParticipant.setCameraEnabled(n); setCameraOn(n); }
    catch (e) { console.warn('Camera toggle failed:', e); }
  };
  const toggleScreen = async () => {
    try { const n = !screenOn; await localParticipant.setScreenShareEnabled(n); setScreenOn(n); }
    catch (e) { console.warn('Screen share toggle failed:', e); }
  };
  const leave = () => {
    playVoiceTone('leave');
    setActiveChannelId(null);
    setWorkspaceId(null);
    const wsId = window.location.pathname.split('/workspace/')[1]?.split('/')[0];
    if (wsId) router.push(`/workspace/${wsId}`);
  };

  const btn = 'w-11 h-11 rounded-full flex items-center justify-center transition-colors cursor-pointer border';
  const idle = 'bg-zinc-800 border-white/10 text-zinc-200 active:bg-zinc-700';
  const active = 'bg-indigo-600 border-indigo-600 text-white';
  const danger = 'bg-red-600 border-red-600 text-white';

  return (
    <div className="md:hidden shrink-0 flex items-center justify-center gap-3 py-3 bg-zinc-900/80 border-t border-white/10 backdrop-blur-md select-none">
      <button onClick={toggleMute} className={`${btn} ${isMuted ? danger : idle}`} title={isMuted ? 'Bật mic' : 'Tắt mic'}>
        {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
      </button>
      <button onClick={toggleDeafen} className={`${btn} ${isDeafened ? danger : idle}`} title={isDeafened ? 'Bật nghe' : 'Tắt nghe'}>
        {isDeafened ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
      <button onClick={toggleCamera} className={`${btn} ${cameraOn ? active : idle}`} title={cameraOn ? 'Tắt camera' : 'Bật camera'}>
        {cameraOn ? <VideoIcon size={18} /> : <VideoOff size={18} />}
      </button>
      <button onClick={toggleScreen} className={`${btn} ${screenOn ? active : idle}`} title={screenOn ? 'Dừng chia sẻ' : 'Chia sẻ màn hình'}>
        {screenOn ? <MonitorOff size={18} /> : <Monitor size={18} />}
      </button>
      <button onClick={leave} className={`${btn} ${danger}`} title="Rời kênh thoại">
        <PhoneOff size={18} />
      </button>
    </div>
  );
}



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

  // iOS standalone PWAs get suspended in the background, which drops the
  // realtime/WebRTC connection. When the app returns to the foreground, auto
  // re-join (refetch token + reconnect) instead of leaving the user stranded
  // on the "you left the call" screen.
  useEffect(() => {
    const handleForeground = () => {
      if (document.visibilityState !== 'visible') return;
      if (disconnected) {
        setToken('');
        setUseP2P(false);
        setError('');
        setDisconnected(false);
      }
    };
    document.addEventListener('visibilitychange', handleForeground);
    window.addEventListener('pageshow', handleForeground);
    window.addEventListener('focus', handleForeground);
    return () => {
      document.removeEventListener('visibilitychange', handleForeground);
      window.removeEventListener('pageshow', handleForeground);
      window.removeEventListener('focus', handleForeground);
    };
  }, [disconnected]);

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
      
      if (localStream.getAudioTracks().length > 0) {
        localAnalyser = audioContext.createAnalyser();
        localAnalyser.fftSize = 512;
        localSource = audioContext.createMediaStreamSource(localStream);
        localSource.connect(localAnalyser);
      }

      if (remoteStream && remoteStream.getAudioTracks().length > 0) {
        remoteAnalyser = audioContext.createAnalyser();
        remoteAnalyser.fftSize = 512;
        remoteSource = audioContext.createMediaStreamSource(remoteStream);
        remoteSource.connect(remoteAnalyser);
      }

      const bufferLength = localAnalyser ? localAnalyser.frequencyBinCount : 0;
      const dataArray = bufferLength > 0 ? new Uint8Array(bufferLength) : null;

      intervalId = setInterval(() => {
        const speakingList: string[] = [];

        // Check local mic volume
        if (localAnalyser && dataArray && !isMuted && !isDeafened) {
          localAnalyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          if (average > 15) { // volume threshold
            speakingList.push(myUserId);
          }
        }

        // Check remote mic volume
        if (remoteAnalyser && dataArray && remoteStream && !isDeafened) {
          remoteAnalyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          if (average > 15) { // volume threshold
            if (matchedPartnerId) {
              speakingList.push(matchedPartnerId);
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
      <div className="flex-1 flex flex-col items-center justify-center bg-transparent text-zinc-300 p-6 select-none">
        <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 mb-6 shadow-lg border border-white/5">
          <PhoneOff size={32} />
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
        <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mb-3 border border-red-500/20 shrink-0">
          <AlertTriangle size={20} />
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
                  const displayName = p.custom_name || p.display_name || 'User';
                  const initial = (displayName.charAt(0) || 'U').toUpperCase();
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
                <label className="text-[10px] text-zinc-400 font-bold flex items-center gap-1.5"><Mic size={11} /> Đầu vào (Microphone)</label>
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
                <label className="text-[10px] text-zinc-400 font-bold flex items-center gap-1.5"><Volume2 size={11} /> Đầu ra (Loa / Tai nghe)</label>
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
      <div className="flex-1 flex items-center justify-center bg-transparent text-zinc-400 select-none">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <span className="text-xs font-medium text-zinc-400">Đang kết nối vào kênh thoại...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-transparent overflow-hidden flex flex-col" data-lk-theme="default">
      {/* Voice Room Nickname Control Bar (hidden on mobile to save space) */}
      <div className="bg-zinc-900/60 border-b border-white/5 px-6 py-3.5 hidden md:flex items-center justify-between gap-4 backdrop-blur-md shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/15 shadow-sm">
            <Volume2 size={16} />
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
        <VoiceStage />
        <VoiceExtraControls />
        <MobileVoiceControls />
        {!isDeafened && <RoomAudioRenderer />}
      </LiveKitRoom>
    </div>
  );
}
