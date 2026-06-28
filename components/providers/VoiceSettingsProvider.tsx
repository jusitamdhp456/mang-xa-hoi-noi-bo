'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface VoiceSettingsContextType {
  isMuted: boolean;
  isDeafened: boolean;
  toggleMute: () => void;
  toggleDeafen: () => void;
}

const VoiceSettingsContext = createContext<VoiceSettingsContextType | undefined>(undefined);

export function VoiceSettingsProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedMuted = localStorage.getItem('voice_muted');
    const savedDeafened = localStorage.getItem('voice_deafened');
    
    if (savedMuted === 'true') setIsMuted(true);
    if (savedDeafened === 'true') setIsDeafened(true);
    setIsLoaded(true);
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('voice_muted', String(isMuted));
      localStorage.setItem('voice_deafened', String(isDeafened));
    }
  }, [isMuted, isDeafened, isLoaded]);

  const toggleMute = () => {
    setIsMuted(prev => {
      // If we are unmuting but we are deafened, we should probably undeafen too? 
      // Discord logic: Unmuting while deafened usually doesn't undeafen, but undeafening usually unmutes.
      // Let's keep it simple.
      return !prev;
    });
  };

  const toggleDeafen = () => {
    setIsDeafened(prev => {
      const newDeafened = !prev;
      // Discord logic: If you deafen, you are also muted. If you undeafen, you stay muted if you were muted before.
      if (newDeafened) {
        setIsMuted(true);
      }
      return newDeafened;
    });
  };

  return (
    <VoiceSettingsContext.Provider value={{ isMuted, isDeafened, toggleMute, toggleDeafen }}>
      {children}
    </VoiceSettingsContext.Provider>
  );
}

export function useVoiceSettings() {
  const context = useContext(VoiceSettingsContext);
  if (context === undefined) {
    throw new Error('useVoiceSettings must be used within a VoiceSettingsProvider');
  }
  return context;
}
