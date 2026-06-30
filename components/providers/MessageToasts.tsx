'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Toast = {
  id: string;
  name: string;
  content: string;
  channelName: string;
  link: string;
};

// Short, pleasant "ding" so we don't need an audio asset.
function playPing() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    [880, 1174.66].forEach((f, i) => {
      const t = now + i * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  } catch {
    /* ignore */
  }
}

export function MessageToasts() {
  const pathname = usePathname();
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Keep the latest pathname available inside long-lived realtime handlers.
  const pathRef = useRef(pathname);
  useEffect(() => { pathRef.current = pathname; }, [pathname]);

  const pushToast = (t: Toast) => {
    setToasts((prev) => [...prev, t]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== t.id));
    }, 5000);
  };

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let channels: ReturnType<typeof supabase.channel>[] = [];
    let cancelled = false;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: memberships } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id);
      const wsIds = (memberships || []).map((m) => m.workspace_id);
      if (wsIds.length === 0) return;

      const { data: chans } = await supabase
        .from('channels')
        .select('id, name, workspace_id')
        .in('workspace_id', wsIds);
      if (!chans || cancelled) return;

      channels = chans.map((c) =>
        supabase
          .channel(`realtime:channel:${c.id}`)
          .on('broadcast', { event: 'new_message' }, (payload) => {
            const msg = payload?.payload?.message;
            if (!msg || msg.sender_id === user.id) return;
            // Suppress if already viewing this channel.
            if (pathRef.current?.includes(`/channel/${c.id}`)) return;

            const name = msg.profiles?.display_name || 'Thành viên';
            const content = (msg.content || '').startsWith('[VOICE_INVITE]:')
              ? 'Đã gửi lời mời đàm thoại'
              : (msg.content || 'Đã gửi một tệp đính kèm');

            playPing();
            pushToast({
              id: `${c.id}-${Date.now()}`,
              name,
              content,
              channelName: c.name,
              link: `/workspace/${c.workspace_id}/channel/${c.id}`,
            });
          })
          .subscribe()
      );
    };

    setup();
    return () => {
      cancelled = true;
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9998] flex flex-col gap-2 w-[320px] max-w-[calc(100vw-2rem)] pointer-events-none">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => {
            setToasts((prev) => prev.filter((x) => x.id !== t.id));
            router.push(t.link);
          }}
          className="pointer-events-auto text-left bg-[#1e1b4b]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-3.5 animate-fade-in-up hover:border-indigo-500/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300">#{t.channelName}</span>
          </div>
          <p className="text-sm font-bold text-white truncate">{t.name}</p>
          <p className="text-xs text-zinc-300 line-clamp-2 mt-0.5 break-words">{t.content}</p>
        </button>
      ))}
    </div>
  );
}
