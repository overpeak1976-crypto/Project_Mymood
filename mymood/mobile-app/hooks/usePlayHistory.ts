import { useEffect, useRef, useCallback } from 'react';
import { playHistoryService } from '@/services/PlayHistoryService';

/**
 * usePlayHistory: React hook wrapping PlayHistoryService singleton
 * Handles async play recording with retry logic
 * Safe for component unmounting
 */
export function usePlayHistory() {
  const isMountedRef = useRef(true);
  const pendingRecordsRef = useRef<Set<string>>(new Set());

  // Mark component as unmounted for cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Memoized record play function
   * Prevents duplicate records for the same song within short time window
   */
  const recordPlay = useCallback(
    async (songId: string, durationMs: number, positionMs: number): Promise<void> => {
      // Validate inputs
      if (typeof songId !== 'string' || songId.trim() === '') {
        console.error('[usePlayHistory] recordPlay: invalid songId');
        return;
      }

      if (typeof durationMs !== 'number' || durationMs <= 0) {
        console.error('[usePlayHistory] recordPlay: invalid durationMs');
        return;
      }

      if (typeof positionMs !== 'number' || positionMs < 0) {
        console.error('[usePlayHistory] recordPlay: invalid positionMs');
        return;
      }

      // Check if already processing this record (prevent duplicates)
      const recordKey = `${songId}-${Math.floor(positionMs / 1000)}`;
      if (pendingRecordsRef.current.has(recordKey)) {
        console.warn('[usePlayHistory] Duplicate record attempt, skipping:', songId);
        return;
      }

      // Mark as processing
      pendingRecordsRef.current.add(recordKey);

      try {
        // Only record if component is still mounted
        if (!isMountedRef.current) {
          return;
        }

        await playHistoryService.recordPlay({
          songId,
          timestamp: Date.now(),
          durationMs,
          positionMs,
        });

        // Remove from processing set on success
        pendingRecordsRef.current.delete(recordKey);
      } catch (error) {
        // Remove from processing set on error
        pendingRecordsRef.current.delete(recordKey);
        console.error('[usePlayHistory] recordPlay error:', error);
        // Don't throw - let app continue
      }
    },
    []
  );

  /**
   * Memoized set auth token function
   * Called when user logs in or token refreshes
   */
  const setAuthToken = useCallback((token: string): void => {
    // Validate token
    if (typeof token !== 'string' || token.trim() === '') {
      console.error('[usePlayHistory] setAuthToken: invalid token');
      return;
    }

    if (!isMountedRef.current) {
      return;
    }

    playHistoryService.setAuthToken(token);
  }, []);

  /**
   * Memoized get pending count function
   * Returns number of plays waiting to be synced
   */
  const getPendingCount = useCallback((): number => {
    return playHistoryService.getPendingCount();
  }, []);

  /**
   * Memoized process pending requests function
   * Manually trigger sync of offline records
   */
  const processPending = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) {
      return;
    }

    try {
      await playHistoryService.processPendingRequests();
    } catch (error) {
      console.error('[usePlayHistory] processPending error:', error);
    }
  }, []);

  return {
    recordPlay,
    setAuthToken,
    getPendingCount,
    processPending,
  };
}
