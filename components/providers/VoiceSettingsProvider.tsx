'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface Participant {
  user_id: string;
  display_name: string;
  avatar_key: string | null;
  voice_channel_id: string;
  custom_name: string | null;
}

interface VoiceSettingsContextType {
  isMuted: boolean;
  isDeafened: boolean;
  toggleMute: () => void;
  toggleDeafen: () => void;
  
  // Voice connection presence states
  activeChannelId: string | null;
  setActiveChannelId: (id: string | null) => void;
  workspaceId: string | null;
  setWorkspaceId: (id: string | null) => void;
  customName: string | null;
  setCustomName: (name: string | null) => void;
  activeParticipants: Participant[];
  changeUserNickname: (targetUserId: string, newName: string) => void;
  currentUser: any;
}

const VoiceSettingsContext = createContext<VoiceSettingsContextType | undefined>(undefined);

export function playVoiceTone(type: 'join' | 'leave') {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (type === 'join') {
      const freqs = [659.25, 783.99, 1046.50];
      freqs.forEach((f, idx) => {
        const start = now + idx * 0.08;
        const duration = 0.25;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, start);
        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration + 0.05);
      });
    } else {
      const freqs = [783.99, 659.25, 523.25];
      freqs.forEach((f, idx) => {
        const start = now + idx * 0.08;
        const duration = 0.25;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, start);
        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(0.1, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration + 0.05);
      });
    }
  } catch (e) {
    console.warn('AudioContext failed:', e);
  }
}

export function VoiceSettingsProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Presence and voice room tracking
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [customName, setCustomName] = useState<string | null>(null);
  const [activeParticipants, setActiveParticipants] = useState<Participant[]>([]);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const supabase = createSupabaseBrowserClient();

  const [isSubscribed, setIsSubscribed] = useState(false);
  const channelRef = useRef<any>(null);
  const activeChannelIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeChannelIdRef.current = activeChannelId;
  }, [activeChannelId]);

  // Load basic audio settings from localStorage
  useEffect(() => {
    const savedMuted = localStorage.getItem('voice_muted');
    const savedDeafened = localStorage.getItem('voice_deafened');
    
    if (savedMuted === 'true') setIsMuted(true);
    if (savedDeafened === 'true') setIsDeafened(true);
    setIsLoaded(true);
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('voice_muted', String(isMuted));
      localStorage.setItem('voice_deafened', String(isDeafened));
    }
  }, [isMuted, isDeafened, isLoaded]);

  // Load current user and profile details
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data) setProfile(data);
          });
      }
    });
  }, [supabase]);

  // Subscribe to Workspace Presence Channel (Only once per workspace/user/profile)
  useEffect(() => {
    if (!workspaceId || !user) {
      setActiveParticipants([]);
      setIsSubscribed(false);
      channelRef.current = null;
      return;
    }

    const channel = supabase.channel(`workspace_presence:${workspaceId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channelRef.current = channel;

    const onSync = () => {
      const state = channel.presenceState();
      const participantsList: Participant[] = [];
      
      Object.keys(state).forEach((key) => {
        const presenceList = state[key] as any[];
        presenceList.forEach((presence) => {
          if (presence.voice_channel_id) {
            participantsList.push({
              user_id: presence.user_id,
              display_name: presence.display_name,
              avatar_key: presence.avatar_key,
              voice_channel_id: presence.voice_channel_id,
              custom_name: presence.custom_name,
            });
          }
        });
      });
      setActiveParticipants(participantsList);
    };

    const onJoin = (payload: any) => {
      const currentActiveId = activeChannelIdRef.current;
      if (!currentActiveId) return;
      const { newPresences } = payload;
      if (!newPresences) return;

      const someoneElseJoined = Object.values(newPresences).some((presenceList: any) => 
        presenceList.some((p: any) => p.user_id !== user.id && p.voice_channel_id === currentActiveId)
      );

      if (someoneElseJoined) {
        playVoiceTone('join');
      }
    };

    const onLeave = (payload: any) => {
      const currentActiveId = activeChannelIdRef.current;
      if (!currentActiveId) return;
      const { leftPresences } = payload;
      if (!leftPresences) return;

      const someoneElseLeft = Object.values(leftPresences).some((presenceList: any) => 
        presenceList.some((p: any) => p.user_id !== user.id && p.voice_channel_id === currentActiveId)
      );

      if (someoneElseLeft) {
        playVoiceTone('leave');
      }
    };

    // Listen for broadcasted nickname updates from other users (e.g. workspace owner)
    const onNicknameChange = (payload: any) => {
      const { target_user_id, new_name } = payload.payload || {};
      if (target_user_id === user.id) {
        setCustomName(new_name || null);
      }
    };

    channel
      .on('presence', { event: 'sync' }, onSync)
      .on('presence', { event: 'join' }, onJoin)
      .on('presence', { event: 'leave' }, onLeave)
      .on('broadcast', { event: 'change_nickname' }, onNicknameChange)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
        } else {
          setIsSubscribed(false);
        }
      });

    return () => {
      setIsSubscribed(false);
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [workspaceId, user, profile, supabase]);

  // Dynamically track user presence state on channel when activeChannelId or profile details update
  useEffect(() => {
    const channel = channelRef.current;
    if (channel && isSubscribed && user) {
      channel.track({
        user_id: user.id,
        display_name: profile?.display_name || user.email?.split('@')[0] || 'User',
        avatar_key: profile?.avatar_key || null,
        voice_channel_id: activeChannelId,
        custom_name: customName || null,
      }).catch((err: any) => {
        console.error("Presence track error:", err);
      });
    }
  }, [activeChannelId, customName, user, profile, isSubscribed]);

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  const toggleDeafen = () => {
    setIsDeafened(prev => {
      const newDeafened = !prev;
      if (newDeafened) {
        setIsMuted(true);
      }
      return newDeafened;
    });
  };

  // Helper function to broadcast a nickname change to a target user
  const changeUserNickname = (targetUserId: string, newName: string) => {
    if (!workspaceId) return;
    
    // Send a broadcast event to the presence channel
    supabase.channel(`workspace_presence:${workspaceId}`).send({
      type: 'broadcast',
      event: 'change_nickname',
      payload: { target_user_id: targetUserId, new_name: newName }
    });
  };

  return (
    <VoiceSettingsContext.Provider 
      value={{ 
        isMuted, 
        isDeafened, 
        toggleMute, 
        toggleDeafen,
        activeChannelId,
        setActiveChannelId,
        workspaceId,
        setWorkspaceId,
        customName,
        setCustomName,
        activeParticipants,
        changeUserNickname,
        currentUser: user
      }}
    >
      {children}
    </VoiceSettingsContext.Provider>
  );
}

export function useVoiceSettings() {
  const context = useContext(VoiceSettingsContext);
  if (context === undefined) {
    throw new Error('useVoiceSettings must be used within a VoiceSettingsProvider');
  }
  return context;
}
