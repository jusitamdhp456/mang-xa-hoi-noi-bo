'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { isChannelMuted } from '@/lib/mute';

type Toast = {
  id: string;
  name: string;
  content: string;
  context: string;
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

// Browser/OS notification when the tab is in the background.
function notifyOS(title: string, body: string, onClick: () => void) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (!document.hidden) return; // only when the user isn't looking at the tab
    const n = new Notification(title, { body, icon: '/logo.png' });
    n.onclick = () => {
      window.focus();
      onClick();
      n.close();
    };
  } catch {
    /* ignore */
  }
}

export function MessageToasts() {
  const pathname = usePathname();
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pathRef = useRef(pathname);
  useEffect(() => { pathRef.current = pathname; }, [pathname]);

  // Ask for browser notification permission (best-effort + on first interaction).
  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
      const onClick = () => {
        if (Notification.permission === 'default') Notification.requestPermission().catch(() => {});
        window.removeEventListener('pointerdown', onClick);
      };
      window.addEventListener('pointerdown', onClick, { once: true });
      return () => window.removeEventListener('pointerdown', onClick);
    }
  }, []);

  const notify = (t: Toast) => {
    playPing();
    setToasts((prev) => [...prev, t]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== t.id));
    }, 5000);
    notifyOS(`${t.name} • ${t.context}`, t.content, () => router.push(t.link));
  };

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let subs: ReturnType<typeof supabase.channel>[] = [];
    let cancelled = false;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      // 1. Workspace channels — listen on a DEDICATED notify topic per workspace
      // (not the channel's own topic, which ChatArea owns) to avoid duplicate
      // subscription conflicts.
      const { data: memberships } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id);
      const wsIds = (memberships || []).map((m) => m.workspace_id);

      wsIds.forEach((wsId) => {
        subs.push(
          supabase
            .channel(`workspace-notify:${wsId}`)
            .on('broadcast', { event: 'message_toast' }, (payload) => {
              const { channelId, channelName, message } = payload?.payload || {};
              if (!message || message.sender_id === user.id) return;
              if (pathRef.current?.includes(`/channel/${channelId}`)) return;
              if (isChannelMuted(channelId)) return; // muted: no toast, sound, or unread
              // Mark the channel unread in the sidebar.
              window.dispatchEvent(new CustomEvent('app:channel-activity', { detail: { channelId } }));
              const raw = message.content || ''
              const content = raw.startsWith('[VOICE_INVITE]:')
                ? 'Đã gửi lời mời đàm thoại'
                : raw.startsWith('[POLL]:')
                  ? 'Đã tạo một bình chọn'
                  : (raw || 'Đã gửi một tệp đính kèm');
              notify({
                id: `${channelId}-${Date.now()}`,
                name: message.profiles?.display_name || 'Thành viên',
                content,
                context: `#${channelName || 'kênh'}`,
                link: `/workspace/${wsId}/channel/${channelId}`,
              });
            })
            .subscribe()
        );
      });

      // 2. Direct messages — single dedicated per-user notify topic.
      subs.push(
        supabase
          .channel(`dm-notify:${user.id}`)
          .on('broadcast', { event: 'dm_toast' }, (payload) => {
            const { senderName, content } = payload?.payload || {};
            if (pathRef.current?.startsWith('/channels/me')) return; // friends page handles its own
            notify({
              id: `dm-${Date.now()}`,
              name: senderName || 'Bạn bè',
              content: content || 'Đã gửi một tệp đính kèm',
              context: 'Tin nhắn riêng',
              link: '/channels/me',
            });
          })
          .subscribe()
      );
    };

    setup();
    return () => {
      cancelled = true;
      subs.forEach((ch) => supabase.removeChannel(ch));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300">{t.context}</span>
          </div>
          <p className="text-sm font-bold text-white truncate">{t.name}</p>
          <p className="text-xs text-zinc-300 line-clamp-2 mt-0.5 break-words">{t.content}</p>
        </button>
      ))}
    </div>
  );
}
