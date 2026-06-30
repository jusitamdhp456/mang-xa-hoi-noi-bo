'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

type UnreadContextType = {
  isUnread: (channelId: string) => boolean;
  markRead: (channelId: string) => void;
  unreadVersion: number; // bumps so consumers re-render
};

const UnreadContext = createContext<UnreadContextType | undefined>(undefined);

const STORAGE_KEY = 'unread_channels';

// Tracks which channels have new activity since the user last viewed them.
// Fed by window events dispatched from MessageToasts (incoming messages) and
// ChatArea (channel opened). Kept in localStorage so it survives navigation.
export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const setRef = useRef<Set<string>>(new Set());
  const [version, setVersion] = useState(0);

  const persist = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...setRef.current])); } catch { /* ignore */ }
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setRef.current = new Set(JSON.parse(raw));
      setVersion((v) => v + 1);
    } catch { /* ignore */ }

    const onActivity = (e: Event) => {
      const id = (e as CustomEvent).detail?.channelId;
      if (!id || setRef.current.has(id)) return;
      setRef.current.add(id);
      persist();
    };
    const onRead = (e: Event) => {
      const id = (e as CustomEvent).detail?.channelId;
      if (!id || !setRef.current.has(id)) return;
      setRef.current.delete(id);
      persist();
    };

    window.addEventListener('app:channel-activity', onActivity);
    window.addEventListener('app:channel-read', onRead);
    return () => {
      window.removeEventListener('app:channel-activity', onActivity);
      window.removeEventListener('app:channel-read', onRead);
    };
  }, [persist]);

  const isUnread = useCallback((channelId: string) => setRef.current.has(channelId), []);
  const markRead = useCallback((channelId: string) => {
    if (!setRef.current.has(channelId)) return;
    setRef.current.delete(channelId);
    persist();
  }, [persist]);

  return (
    <UnreadContext.Provider value={{ isUnread, markRead, unreadVersion: version }}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnread() {
  const ctx = useContext(UnreadContext);
  // Tolerate being used outside the provider (returns inert no-ops).
  if (!ctx) return { isUnread: () => false, markRead: () => {}, unreadVersion: 0 };
  return ctx;
}
