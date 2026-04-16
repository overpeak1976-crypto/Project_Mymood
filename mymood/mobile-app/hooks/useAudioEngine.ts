import { useEffect, useRef, useState, useCallback } from 'react';
import { audioEngine, AudioEngineState } from '@/services/AudioEngine';
import { AVPlaybackStatusSuccess, AVPlaybackStatusError } from 'expo-av';

/**
 * useAudioEngine: React hook wrapping AudioEngine singleton
 * Handles subscription lifecycle and memoized callback exports
 * Safe for component unmounting
 */
export function useAudioEngine() {
  const [state, setState] = useState<AudioEngineState>(audioEngine.getState());
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);

  // Subscribe to audio engine state changes on mount
  useEffect(() => {
    // Ensure component is mounted before updating state
    const handleStateChange = (newState: AudioEngineState) => {
      if (isMountedRef.current) {
        setState(newState);
      }
    };

    unsubscribeRef.current = audioEngine.subscribe(handleStateChange);

    return () => {
      // Cleanup on unmount
      unsubscribeRef.current?.();
    };
  }, []);

  // Mark component as unmounted for cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Memoized load audio function
   */
  const loadAudio = useCallback(
    async (uri: string, onStatusUpdate?: (status: AVPlaybackStatusSuccess | AVPlaybackStatusError) => void): Promise<void> => {
      try {
        await audioEngine.loadAudio(uri, onStatusUpdate);
      } catch (error) {
        console.error('[useAudioEngine] Load failed:', error);
        throw error;
      }
    },
    []
  );

  /**
   * Memoized load with fallback function
   */
  const loadWithFallback = useCallback(
    async (primaryUrl: string, fallbackUrl?: string, onStatusUpdate?: (status: AVPlaybackStatusSuccess | AVPlaybackStatusError) => void): Promise<void> => {
      try {
        await audioEngine.loadAudioWithFallback(primaryUrl, fallbackUrl, onStatusUpdate);
      } catch (error) {
        console.error('[useAudioEngine] Load with fallback failed:', error);
        throw error;
      }
    },
    []
  );

  /**
   * Memoized play function
   */
  const play = useCallback(async (): Promise<void> => {
    try {
      await audioEngine.play();
    } catch (error) {
      console.error('[useAudioEngine] Play failed:', error);
    }
  }, []);

  /**
   * Memoized pause function
   */
  const pause = useCallback(async (): Promise<void> => {
    try {
      await audioEngine.pause();
    } catch (error) {
      console.error('[useAudioEngine] Pause failed:', error);
    }
  }, []);

  /**
   * Memoized seek function
   */
  const seek = useCallback(async (millis: number): Promise<void> => {
    try {
      await audioEngine.seek(millis);
    } catch (error) {
      console.error('[useAudioEngine] Seek failed:', error);
    }
  }, []);

  /**
   * Memoized set rate function
   */
  const setRate = useCallback(async (rate: number): Promise<void> => {
    try {
      await audioEngine.setRate(rate);
    } catch (error) {
      console.error('[useAudioEngine] Set rate failed:', error);
    }
  }, []);

  /**
   * Memoized set volume function
   */
  const setVolume = useCallback(async (volume: number): Promise<void> => {
    try {
      await audioEngine.setVolume(volume);
    } catch (error) {
      console.error('[useAudioEngine] Set volume failed:', error);
    }
  }, []);

  /**
   * Memoized stop function
   */
  const stop = useCallback(async (): Promise<void> => {
    try {
      await audioEngine.stop();
    } catch (error) {
      console.error('[useAudioEngine] Stop failed:', error);
    }
  }, []);

  return {
    // State
    state,
    isLoading: state.isLoading,
    isPlaying: state.isPlaying,
    currentPosition: state.position,
    duration: state.duration,
    error: state.error,
    volume: state.volume,
    rate: state.rate,

    // Controls
    loadAudio,
    loadWithFallback,
    play,
    pause,
    seek,
    setRate,
    setVolume,
    stop,

    // Utils
    isReady: audioEngine.isReady(),
  };
}
