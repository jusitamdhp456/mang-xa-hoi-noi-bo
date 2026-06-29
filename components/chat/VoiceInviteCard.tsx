'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone } from 'lucide-react';
import { useVoiceSettings } from '@/components/providers/VoiceSettingsProvider';
import { joinWorkspaceIfInvited } from '@/app/actions/workspace';

interface VoiceInviteCardProps {
  payload: string;
}

export function VoiceInviteCard({ payload }: VoiceInviteCardProps) {
  const router = useRouter();
  const { setActiveChannelId, setWorkspaceId } = useVoiceSettings();
  const [joining, setJoining] = useState(false);

  let data: { workspaceId: string; channelId: string; channelName: string } | null = null;
  try {
    data = JSON.parse(payload);
  } catch (e) {
    console.error('Failed to parse voice invite payload:', e);
  }

  if (!data) {
    return <div className="text-red-400 text-xs font-semibold">Lời mời đàm thoại không hợp lệ</div>;
  }

  const handleJoin = async () => {
    setJoining(true);
    try {
      // Register membership to the workspace
      const res = await joinWorkspaceIfInvited(data.workspaceId);
      if (res.error) {
        console.error(res.error);
      }

      setActiveChannelId(data.channelId);
      setWorkspaceId(data.workspaceId);
      router.push(`/workspace/${data.workspaceId}/channel/${data.channelId}`);
    } catch (err) {
      console.error(err);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="bg-[#1e1f22]/70 border border-white/10 p-4 rounded-xl flex flex-col gap-3.5 shadow-2xl select-none mt-1 max-w-[280px]">
      <div className="flex items-center gap-2 text-cyan-400">
        <Phone size={14} className="animate-pulse" />
        <span className="text-[10px] font-extrabold uppercase tracking-widest">Lời mời đàm thoại</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-cyan-950/50 border border-cyan-500/20 flex items-center justify-center text-lg shrink-0">
          🔊
        </div>
        <div className="min-w-0 flex flex-col">
          <span className="text-zinc-100 font-extrabold text-xs truncate leading-none">{data.channelName}</span>
          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-1.5 truncate">đang trực tiếp</span>
        </div>
      </div>

      <button
        onClick={handleJoin}
        disabled={joining}
        className="w-full py-2 bg-green-600 hover:bg-green-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-lg shadow-md hover:scale-[1.01] active:scale-95 transition-all cursor-pointer text-center"
      >
        {joining ? 'Đang vào...' : 'Tham gia'}
      </button>
    </div>
  );
}
