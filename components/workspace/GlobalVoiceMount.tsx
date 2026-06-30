'use client';

import { VoiceRoom } from './VoiceRoom';
import { useVoiceSettings } from '@/components/providers/VoiceSettingsProvider';

// Mounted once in the app layout so the LiveKit connection survives navigation
// (Discord-style): it follows activeChannelId and portals the stage into the
// voice channel page's #voice-stage-slot. Only active for workspace voice.
export function GlobalVoiceMount({ username }: { username: string }) {
  const { activeChannelId, workspaceId } = useVoiceSettings();

  if (!activeChannelId || !workspaceId) return null;

  return (
    <VoiceRoom
      key={activeChannelId}
      channelId={activeChannelId}
      workspaceId={workspaceId}
      username={username}
      global
      stageSlotId="voice-stage-slot"
      manageActiveChannel={false}
    />
  );
}
