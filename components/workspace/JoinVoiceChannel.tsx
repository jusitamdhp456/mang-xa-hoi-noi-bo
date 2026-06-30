'use client';

import { useEffect } from 'react';
import { useVoiceSettings } from '@/components/providers/VoiceSettingsProvider';

// Visiting a voice channel page = joining it. Sets the global active voice
// channel so GlobalVoiceMount connects. Does nothing if already in this channel.
export function JoinVoiceChannel({ channelId, workspaceId }: { channelId: string; workspaceId: string }) {
  const { setActiveChannelId, setWorkspaceId } = useVoiceSettings();

  // Join when the page mounts or the channel changes — but NOT in reaction to
  // activeChannelId, otherwise pressing "leave" while on this page immediately
  // re-joins (the old double-press bug).
  useEffect(() => {
    setActiveChannelId(channelId);
    setWorkspaceId(workspaceId);
  }, [channelId, workspaceId, setActiveChannelId, setWorkspaceId]);

  return null;
}
