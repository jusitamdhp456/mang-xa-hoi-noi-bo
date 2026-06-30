'use client';

import { useVoiceSettings } from '../providers/VoiceSettingsProvider';

export default function MemberStatus({ userId, defaultStatus }: { userId: string, defaultStatus?: string | null }) {
  const { onlineUserIds } = useVoiceSettings();
  const isOnline = onlineUserIds.includes(userId);

  if (isOnline) {
    return <p className="text-[11px] font-bold text-emerald-400 truncate">Đang hoạt động</p>;
  }

  return (
    <p className="text-[11px] text-zinc-500 truncate font-medium">
      {defaultStatus && defaultStatus !== 'Không có trạng thái' ? defaultStatus : 'Ngoại tuyến'}
    </p>
  );
}
