/**
 * UI State Context - Manages global UI states like bottom sheets/modals
 * This context handles states that need to be shared across multiple components
 * for proper layering and positioning (e.g., MiniPlayer avoidance)
 */
import React, { createContext, useContext, useState, useCallback } from 'react';

interface UIStateContextType {
  isPlaylistSheetOpen: boolean;
  playlistSheetHeight: number;
  setPlaylistSheetOpen: (isOpen: boolean) => void;
  setPlaylistSheetHeight: (height: number) => void;
}

const UIStateContext = createContext<UIStateContextType | undefined>(undefined);

export function UIStateProvider({ children }: { children: React.ReactNode }) {
  const [isPlaylistSheetOpen, setIsPlaylistSheetOpenState] = useState(false);
  const [playlistSheetHeight, setPlaylistSheetHeightState] = useState(0);

  const setPlaylistSheetOpen = useCallback((isOpen: boolean) => {
    setIsPlaylistSheetOpenState(isOpen);
  }, []);

  const setPlaylistSheetHeight = useCallback((height: number) => {
    setPlaylistSheetHeightState(height);
  }, []);

  return (
    <UIStateContext.Provider
      value={{
        isPlaylistSheetOpen,
        playlistSheetHeight,
        setPlaylistSheetOpen,
        setPlaylistSheetHeight,
      }}
    >
      {children}
    </UIStateContext.Provider>
  );
}

export function useUIState() {
  const context = useContext(UIStateContext);
  if (!context) {
    throw new Error('useUIState must be used within a UIStateProvider');
  }
  return context;
}
