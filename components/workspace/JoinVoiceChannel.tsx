'use client';

import { useEffect } from 'react';
import { useVoiceSettings } from '@/components/providers/VoiceSettingsProvider';

// Visiting a voice channel page = joining it. Sets the global active voice
// channel so GlobalVoiceMount connects. Does nothing if already in this channel.
export function JoinVoiceChannel({ channelId, workspaceId }: { channelId: string; workspaceId: string }) {
  const { activeChannelId, setActiveChannelId, setWorkspaceId } = useVoiceSettings();

  useEffect(() => {
    if (activeChannelId !== channelId) {
      setActiveChannelId(channelId);
      setWorkspaceId(workspaceId);
    }
  }, [channelId, workspaceId, activeChannelId, setActiveChannelId, setWorkspaceId]);

  return null;
}
