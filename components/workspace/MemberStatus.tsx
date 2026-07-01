'use client';

import { useVoiceSettings } from '../providers/VoiceSettingsProvider';
import { parseStatus, STATUS_META } from '@/lib/status';

export default function MemberStatus({ userId, defaultStatus }: { userId: string, defaultStatus?: string | null }) {
  const { onlineUserIds } = useVoiceSettings();
  const isOnline = onlineUserIds.includes(userId);
  const { state, text } = parseStatus(defaultStatus);

  const offline = state === 'invisible' || !isOnline;
  const dot = offline ? 'bg-zinc-600' : STATUS_META[state].dot;
  const label = text
    ? text
    : offline
      ? 'Ngoại tuyến'
      : state === 'online'
        ? 'Đang hoạt động'
        : STATUS_META[state].label;
  const color = text ? 'text-zinc-400' : offline ? 'text-zinc-500' : STATUS_META[state].text;

  return (
    <p className={`flex items-center gap-1.5 text-[11px] truncate font-medium ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      <span className="truncate">{label}</span>
    </p>
  );
}
