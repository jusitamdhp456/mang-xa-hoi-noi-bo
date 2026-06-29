'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useVoiceSettings } from '@/components/providers/VoiceSettingsProvider';

export default function WorkspaceResponsiveWrapper({
  workspaceId,
  sidebar,
  children
}: {
  workspaceId: string;
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isChannelView = pathname.includes('/channel/');
  const { setWorkspaceId } = useVoiceSettings();

  useEffect(() => {
    if (workspaceId) {
      setWorkspaceId(workspaceId);
    }
    return () => {
      setWorkspaceId(null);
    };
  }, [workspaceId, setWorkspaceId]);

  // Sync document root class for server sidebar hiding on mobile
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isChannelView) {
        document.documentElement.classList.add('chat-active');
      } else {
        document.documentElement.classList.remove('chat-active');
      }
    }
    return () => {
      if (typeof window !== 'undefined') {
        document.documentElement.classList.remove('chat-active');
      }
    };
  }, [isChannelView]);

  return (
    <div className="flex w-full h-full">
      {/* Sidebar container - hidden on mobile if inside a channel */}
      <div className={`w-full md:w-60 flex-shrink-0 flex-col h-full ${isChannelView ? 'hidden md:flex' : 'flex'}`}>
        {sidebar}
      </div>
      
      {/* Main panel container - hidden on mobile if no active channel */}
      <div className={`flex-1 flex flex-col h-full overflow-hidden ${!isChannelView ? 'hidden md:flex' : 'flex'}`}>
        {children}
      </div>
    </div>
  );
}
