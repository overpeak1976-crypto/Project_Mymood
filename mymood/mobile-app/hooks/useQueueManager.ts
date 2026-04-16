import { useEffect, useRef, useState, useCallback } from 'react';
import { queueManager, QueueState, Song } from '@/services/QueueManager';

/**
 * useQueueManager: React hook wrapping QueueManager singleton
 * Handles subscription lifecycle for queue state
 * Safe for component unmounting
 */
export function useQueueManager() {
  const [state, setState] = useState<QueueState>(queueManager.getState());
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);

  // Subscribe to queue manager state changes on mount
  useEffect(() => {
    // Ensure component is mounted before updating state
    const handleStateChange = (newState: QueueState) => {
      if (isMountedRef.current) {
        setState(newState);
      }
    };

    unsubscribeRef.current = queueManager.subscribe(handleStateChange);

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
   * Memoized set queue function
   */
  const setQueue = useCallback((songs: Song[]): void => {
    if (!Array.isArray(songs)) {
      console.error('[useQueueManager] setQueue: songs must be an array');
      return;
    }
    queueManager.setQueue(songs);
  }, []);

  /**
   * Memoized append songs function (for AI radio)
   */
  const appendSongs = useCallback((songs: Song[]): void => {
    if (!Array.isArray(songs)) {
      console.error('[useQueueManager] appendSongs: songs must be an array');
      return;
    }
    queueManager.appendSongs(songs);
  }, []);

  /**
   * Memoized next song function
   */
  const nextSong = useCallback((): Song | null => {
    return queueManager.nextSong();
  }, []);

  /**
   * Memoized previous song function
   */
  const previousSong = useCallback((): Song | null => {
    return queueManager.previousSong();
  }, []);

  /**
   * Memoized jump to song function
   */
  const jumpToSong = useCallback((index: number): Song | null => {
    if (typeof index !== 'number' || index < 0) {
      console.error('[useQueueManager] jumpToSong: invalid index');
      return null;
    }
    return queueManager.jumpToSong(index);
  }, []);

  /**
   * Memoized toggle shuffle function
   */
  const toggleShuffle = useCallback((): boolean => {
    return queueManager.toggleShuffle();
  }, []);

  /**
   * Memoized toggle repeat function
   */
  const toggleRepeat = useCallback((): boolean => {
    return queueManager.toggleRepeat();
  }, []);

  /**
   * Memoized record play function
   */
  const recordPlay = useCallback((songId: string): void => {
    if (typeof songId !== 'string' || songId.trim() === '') {
      console.error('[useQueueManager] recordPlay: invalid songId');
      return;
    }
    queueManager.recordPlay(songId);
  }, []);

  /**
   * Memoized get current song function
   */
  const getCurrentSong = useCallback((): Song | null => {
    return queueManager.getCurrentSong();
  }, []);

  /**
   * Memoized get queue size function
   */
  const getQueueSize = useCallback((): number => {
    return queueManager.getQueueSize();
  }, []);

  /**
   * Memoized should refill queue check
   */
  const shouldRefillQueue = useCallback((): boolean => {
    return queueManager.shouldRefillQueue();
  }, []);

  /**
   * Memoized get play history function
   */
  const getPlayHistory = useCallback(() => {
    return queueManager.getPlayHistory();
  }, []);

  /**
   * Memoized get random next song function (for shuffle mode)
   */
  const getRandomNextSong = useCallback((): Song | null => {
    return queueManager.getRandomNextSong();
  }, []);

  return {
    // State
    state,
    songs: state.songs,
    currentIndex: state.currentIndex,
    shuffle: state.shuffle,
    repeat: state.repeat,
    error: state.error,

    // Queue Management
    setQueue,
    appendSongs,
    getCurrentSong,
    getQueueSize,
    getPlayHistory,
    getRandomNextSong,

    // Navigation
    nextSong,
    previousSong,
    jumpToSong,

    // Playback Modes
    toggleShuffle,
    toggleRepeat,

    // Analytics
    recordPlay,
    shouldRefillQueue,
  };
}
