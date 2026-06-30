'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface Participant {
  user_id: string;
  display_name: string;
  avatar_key: string | null;
  voice_channel_id: string;
  custom_name: string | null;
  is_muted?: boolean;
  is_deafened?: boolean;
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
  onlineUserIds: string[];

  // Speaking status
  speakingUserIds: string[];
  setSpeakingUserIds: (ids: string[]) => void;
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
  const [botParticipants, setBotParticipants] = useState<Participant[]>([]);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [speakingUserIds, setSpeakingUserIds] = useState<string[]>([]);

  // Derived state: combine real users (with self) and bots
  const activeParticipantsWithSelf = useMemo(() => {
    let result = activeParticipants;
    if (activeChannelId && user) {
      const hasSelf = activeParticipants.some(p => p.user_id === user.id);
      if (!hasSelf) {
        result = [
          {
            user_id: user.id,
            display_name: profile?.display_name || user.email?.split('@')[0] || 'User',
            avatar_key: profile?.avatar_key || null,
            voice_channel_id: activeChannelId,
            custom_name: customName || null,
            is_muted: isMuted,
            is_deafened: isDeafened,
          },
          ...activeParticipants
        ];
      }
    }
    return [...result, ...botParticipants];
  }, [activeParticipants, botParticipants, activeChannelId, user, profile, customName, isMuted, isDeafened]);

  const supabase = createSupabaseBrowserClient();

  // Refs let the long-lived realtime handlers read the latest values
  // without forcing the presence channel to re-subscribe.
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
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

  // Single presence channel per workspace (spec: workspace:{id}:presence).
  // ALL presence/broadcast handlers must be registered BEFORE subscribe();
  // calling .on('presence', ...) on an already-subscribed channel throws.
  useEffect(() => {
    if (!workspaceId || !user) {
      setActiveParticipants([]);
      setBotParticipants([]);
      setOnlineUserIds([]);
      presenceChannelRef.current = null;
      return;
    }

    const channel = supabase.channel(`workspace_presence:${workspaceId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });
    presenceChannelRef.current = channel;

    const onSync = () => {
      const state = channel.presenceState();
      const participantsList: Participant[] = [];
      const seenUserIds = new Set<string>(); // Deduplicate users!
      const onlineIds = new Set<string>();

      Object.keys(state).forEach((key) => {
        const presenceList = state[key] as any[];
        presenceList.forEach((presence) => {
          if (presence && presence.user_id) {
            onlineIds.add(presence.user_id);
            if (presence.voice_channel_id && !seenUserIds.has(presence.user_id)) {
              seenUserIds.add(presence.user_id);
              participantsList.push({
                user_id: presence.user_id,
                display_name: presence.display_name || 'User',
                avatar_key: presence.avatar_key,
                voice_channel_id: presence.voice_channel_id,
                custom_name: presence.custom_name,
                is_muted: presence.is_muted,
                is_deafened: presence.is_deafened,
              });
            }
          }
        });
      });
      setActiveParticipants(participantsList);
      setOnlineUserIds(Array.from(onlineIds));
    };

    // Audio chimes when someone else joins/leaves the voice channel we are in.
    // Read the live channel id from a ref so this handler never goes stale.
    // supabase-js v2 delivers newPresences/leftPresences as a flat array of
    // presence objects (not an object keyed by user).
    const onJoin = (payload: any) => {
      const newPresences = payload?.newPresences;
      if (!Array.isArray(newPresences)) return;
      const someoneElseJoined = newPresences.some(
        (p: any) => p && p.user_id && p.user_id !== user.id && p.voice_channel_id === activeChannelIdRef.current
      );
      if (someoneElseJoined) playVoiceTone('join');
    };

    const onLeave = (payload: any) => {
      const leftPresences = payload?.leftPresences;
      if (!Array.isArray(leftPresences)) return;
      const someoneElseLeft = leftPresences.some(
        (p: any) => p && p.user_id && p.user_id !== user.id && p.voice_channel_id === activeChannelIdRef.current
      );
      if (someoneElseLeft) playVoiceTone('leave');
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
          await channel.track({
            user_id: user.id,
            display_name: profile?.display_name || user.email?.split('@')[0] || 'User',
            avatar_key: profile?.avatar_key || null,
            voice_channel_id: activeChannelIdRef.current || null,
            custom_name: customName || null,
            is_muted: isMuted,
            is_deafened: isDeafened,
          }).catch((err: any) => {
            console.error('Voice track error:', err);
          });
        }
      });

    // --- Add Bot Presence Channel ---
    const botChannel = supabase.channel(`workspace_presence:${workspaceId}_bots`, {
      config: { presence: { key: user.id } },
    });

    const onBotSync = () => {
      const state = botChannel.presenceState();
      const botsList: Participant[] = [];
      Object.keys(state).forEach((key) => {
        const presenceList = state[key] as any[];
        presenceList.forEach((presence) => {
          if (presence && presence.user_id) {
            botsList.push({
              user_id: presence.user_id,
              display_name: presence.display_name || 'Bot',
              avatar_key: presence.avatar_key,
              voice_channel_id: presence.voice_channel_id,
              custom_name: presence.custom_name,
              is_muted: presence.is_muted,
              is_deafened: presence.is_deafened,
            });
          }
        });
      });
      setBotParticipants(botsList);
    };

    botChannel.on('presence', { event: 'sync' }, onBotSync);
    botChannel.subscribe();

    return () => {
      presenceChannelRef.current = null;
      supabase.removeChannel(channel);
      supabase.removeChannel(botChannel);
    };
  }, [workspaceId, user, profile, supabase]);

  // Update our own presence payload whenever voice state changes.
  // track()/untrack() are valid AFTER subscribe(), so reuse the existing channel.
  useEffect(() => {
    const channel = presenceChannelRef.current;
    if (!channel || !user) return;

    channel.track({
      user_id: user.id,
      display_name: profile?.display_name || user.email?.split('@')[0] || 'User',
      avatar_key: profile?.avatar_key || null,
      voice_channel_id: activeChannelId || null,
      custom_name: customName || null,
      is_muted: isMuted,
      is_deafened: isDeafened,
    }).catch((err: any) => {
      console.error('Presence track update error:', err);
    });
  }, [activeChannelId, customName, isMuted, isDeafened, profile, user]);

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
        activeParticipants: mergedParticipants,
        changeUserNickname,
        currentUser: user,
        onlineUserIds,
        speakingUserIds,
        setSpeakingUserIds
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
