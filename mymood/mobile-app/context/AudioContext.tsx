import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { httpClient } from '@/services/httpClient';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useQueueManager } from '@/hooks/useQueueManager';
import { usePlayHistory } from '@/hooks/usePlayHistory';
import { audioEngine as audioEngineSingleton } from '@/services/AudioEngine';
import { Song } from '@/types/audio';

export type { Song };

/**
 * Stable context: values that change infrequently (song change, play/pause, queue change)
 * Consumers of this context do NOT re-render on position updates.
 */
interface AudioContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  volume: number;

  playSong: (song: Song, playlist?: Song[]) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (millis: number) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  setVolume: (v: number) => Promise<void>;

  queue: Song[];
  currentIndex: number;
  isShuffle: boolean;
  isRepeat: boolean;
  toggleShuffle: () => void;
  toggleRepeat: () => void;

  activeAiPrompt: string | null;
  isAiGenerating: boolean;
  startAiRadio: (prompt: string) => Promise<void>;
  stopAiRadio: () => void;
  stopAndReset: () => Promise<void>;
}

/**
 * Progress context: fast-changing position/duration values.
 * Only subscribed to by progress bar components (MiniPlayerProgress, PlayerProgressBar).
 */
interface AudioProgressContextType {
  currentTime: number;
  totalDuration: number;
  progressFraction: number;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);
const AudioProgressContext = createContext<AudioProgressContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {

  const audioEngine = useAudioEngine();
  const queueMgr = useQueueManager();
  const playHistory = usePlayHistory();
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [activeAiPrompt, setActiveAiPrompt] = useState<string | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isAiExhausted, setIsAiExhausted] = useState(false);
  const sessionTokenRef = useRef<string | null>(null);
  const isRefillingRef = useRef(false);
  const currentPlayingRef = useRef<{ songId: string; startTime: number } | null>(null);
  const isTransitioningRef = useRef(false);
  const lastHandledEndPositionRef = useRef<number>(0);
  const lastPositionCheckRef = useRef(0);
  const [volume, setVolumeState] = useState(0.9);
  const seekTo = useCallback(async (millis: number): Promise<void> => {
    try {
      await audioEngine.seek(millis);
    } catch (error) {
      console.error('[AudioContext] Seek failed:', error);
    }
  }, [audioEngine]);

  const setVolume = useCallback(async (v: number): Promise<void> => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    await audioEngine.setVolume(clamped);
  }, [audioEngine]);

  const refillAiRadio = useCallback(async (): Promise<void> => {
    if (
      isRefillingRef.current ||
      isAiExhausted ||
      !activeAiPrompt ||
      !sessionTokenRef.current
    ) {
      return;
    }

    try {
      isRefillingRef.current = true;

      // Exclude all songs in queue to prevent duplicates
      const allIds = queueMgr.state.songs.map((s) => s.id);

      const data = await httpClient.post<{ songs?: Song[] }>('/api/ai/generate-playlist', {
        prompt: activeAiPrompt,
        limit: 5,
        excludeIds: allIds,
      });

      if (data.songs && data.songs.length > 0) {
        // Filter out any duplicates that slipped through
        const existingIds = new Set(allIds);
        const uniqueSongs = data.songs.filter((s) => !existingIds.has(s.id));
        if (uniqueSongs.length > 0) {
          queueMgr.appendSongs(uniqueSongs);
          console.log(`[AudioContext] AI Radio refilled +${uniqueSongs.length} unique songs`);
        } else {
          console.log('[AudioContext] AI Radio: all returned songs were duplicates');
        }
      } else {
        console.log('[AudioContext] AI Radio: no new songs returned, will retry next track');
      }
    } catch (error) {
      console.error('[AudioContext] refillAiRadio failed:', error);
      // Don't set exhausted on error โ€” will retry on next track change
    } finally {
      isRefillingRef.current = false;
    }
  }, [activeAiPrompt, isAiExhausted, queueMgr]);

  const playSong = useCallback(
    async (song: Song, playlist: Song[] = []): Promise<void> => {
      console.log('[AudioContext] playSong ENTRY:', song.id, song.title);
      if (!song || !song.id || !song.audio_file_url) {
        console.error('[AudioContext] Invalid song data:', song);
        return;
      }
      if (isTransitioningRef.current) {
        console.log('[AudioContext] playSong blocked: transition in progress');
        return;
      }

      try {

        isTransitioningRef.current = true;

        if (playlist.length > 0) {
          queueMgr.setQueue(playlist);
          const index = playlist.findIndex((s) => s.id === song.id);
          if (index >= 0) {
            queueMgr.jumpToSong(index);
          }

          if (activeAiPrompt) {
            setActiveAiPrompt(null);
            setIsAiExhausted(false);
          }
        }
        console.log('[AudioContext] Playing song:', {
          id: song.id,
          title: song.title,
          artist: song.artist,
          coverUrl: song.cover_image_url,
          audioUrl: song.audio_file_url,
        });
        setCurrentSong(song);

        try {
          console.log('[AudioContext] Loading audio:', song.audio_file_url);
          await audioEngine.loadWithFallback(song.audio_file_url, song.fallback_uri);
        } catch (loadError) {
          console.error('[AudioContext] Failed to load audio:', loadError);
          throw loadError;
        }
        try {
          await audioEngine.setVolume(volume);
          await audioEngine.play();
        } catch (playError) {
          console.error('[AudioContext] Failed to start playback:', playError);
          throw playError;
        }

        currentPlayingRef.current = null;
        console.log('[AudioContext] playSong SUCCESS - will release lock in finally');

        // Update profile_song_id in database
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user?.id) {
            supabase.from('users').update({ profile_song_id: song.id }).eq('id', session.user.id).then(() => {});
          }
        });
      } catch (error) {
        console.error('[AudioContext] Failed to play song:', error);
      } finally {
        console.log('[AudioContext] playSong FINALLY: Setting transition lock to FALSE');
        isTransitioningRef.current = false;
        console.log('[AudioContext] playSong EXIT - lock released');
      }
    },
    [audioEngine, queueMgr, activeAiPrompt]
  );

  const playNext = useCallback(async (): Promise<void> => {
    const nextSong = queueMgr.nextSong();
    console.log('[AudioContext] playNext: Current song:', currentSong?.id, 'Next song:', nextSong?.id);

    if (!nextSong) {
      console.log('[AudioContext] No next song available');
      return;
    }
    if (activeAiPrompt && !isAiExhausted && queueMgr.shouldRefillQueue()) {
      console.log('[AudioContext] Refilling AI radio queue');
      refillAiRadio();
    }
    console.log('[AudioContext] Calling playSong with:', nextSong.id, nextSong.title);
    await playSong(nextSong, queueMgr.state.songs);
  }, [queueMgr, activeAiPrompt, isAiExhausted, refillAiRadio, playSong]);

  const playRandomNext = useCallback(async (): Promise<void> => {
    const randomSong = queueMgr.getRandomNextSong();
    console.log('[AudioContext] playRandomNext: Current song:', currentSong?.id, 'Random song:', randomSong?.id);

    if (!randomSong) {
      console.log('[AudioContext] No random song available (queue ended)');
      return;
    }

    if (activeAiPrompt && !isAiExhausted && queueMgr.shouldRefillQueue()) {
      console.log('[AudioContext] Refilling AI radio queue');
      refillAiRadio();
    }

    console.log('[AudioContext] Calling playSong with random song:', randomSong.id, randomSong.title);

    await playSong(randomSong, queueMgr.state.songs);
  }, [queueMgr, activeAiPrompt, isAiExhausted, refillAiRadio, playSong]);

  const playPrevious = useCallback(async (): Promise<void> => {
    if (audioEngine.state.position > 3000) {

      await seekTo(0);
    } else {

      const prevSong = queueMgr.previousSong();
      if (prevSong) {
        await playSong(prevSong, queueMgr.state.songs);
      }
    }
  }, [audioEngine.state.position, queueMgr, seekTo, playSong]);

  const togglePlayPause = useCallback(async (): Promise<void> => {
    try {
      if (audioEngine.state.isPlaying) {
        await audioEngine.pause();
      } else {
        await audioEngine.play();
      }
    } catch (error) {
      console.error('[AudioContext] togglePlayPause failed:', error);
    }
  }, [audioEngine]);

  const toggleShuffle = useCallback((): void => {
    const newShuffle = queueMgr.toggleShuffle();
    console.log('[AudioContext] Shuffle toggled:', newShuffle ? 'ON' : 'OFF');

    if (newShuffle && queueMgr.state.repeat) {
      console.log('[AudioContext] Disabling repeat because shuffle is enabled');
      queueMgr.toggleRepeat(); // Disable repeat when shuffle enabled
    }
  }, [queueMgr]);

  const toggleRepeat = useCallback((): void => {
    const newRepeat = queueMgr.toggleRepeat();
    console.log('[AudioContext] Repeat toggled:', newRepeat ? 'ON (repeat current song)' : 'OFF (play next song)');

    if (newRepeat && queueMgr.state.shuffle) {
      console.log('[AudioContext] Disabling shuffle because repeat is enabled');
      queueMgr.toggleShuffle(); // Disable shuffle when repeat enabled
    }
  }, [queueMgr]);

  const startAiRadio = useCallback(
    async (prompt: string): Promise<void> => {
      if (!prompt || !sessionTokenRef.current) {
        console.error('[AudioContext] Invalid prompt or no auth token');
        return;
      }

      try {
        setIsAiGenerating(true);
        setActiveAiPrompt(prompt);
        setIsAiExhausted(false);

        const data = await httpClient.post<{ songs?: Song[]; title?: string; description?: string }>('/api/ai/generate-playlist', {
          prompt,
          limit: 20,
          excludeIds: currentSong ? [currentSong.id] : [],
        });

        if (!data.songs || data.songs.length === 0) {
          setIsAiExhausted(true);
          setActiveAiPrompt(null);
          return;
        }
        queueMgr.setQueue(data.songs);
        await playSong(data.songs[0], data.songs);
      } catch (error) {
        console.error('[AudioContext] startAiRadio failed:', error);
        setIsAiExhausted(true);
        setActiveAiPrompt(null);
      } finally {
        setIsAiGenerating(false);
      }
    },
    [currentSong, playSong, queueMgr]
  );

  const stopAiRadio = useCallback((): void => {
    setActiveAiPrompt(null);
    setIsAiExhausted(false);
    setIsAiGenerating(false);
    isRefillingRef.current = false;
  }, []);

  const stopAndReset = useCallback(async (): Promise<void> => {
    try {
      await audioEngine.stop();
      setCurrentSong(null);
      queueMgr.setQueue([]);
      stopAiRadio();
      currentPlayingRef.current = null;
      lastHandledEndPositionRef.current = 0;
      // Clear current_song_id in database
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.id) {
          supabase.from('users').update({ current_song_id: null }).eq('id', session.user.id).then(() => {});
        }
      });
      console.log('[AudioContext] Audio stopped and reset');
    } catch (error) {
      console.error('[AudioContext] stopAndReset failed:', error);
    }
  }, [audioEngine, queueMgr, stopAiRadio]);

  useEffect(() => {
    const setupAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          sessionTokenRef.current = session.access_token;
          playHistory.setAuthToken(session.access_token);
        }
      } catch (error) {
        console.error('[AudioContext] Failed to setup auth:', error);
      }
    };

    setupAuth();

    const subscription = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        sessionTokenRef.current = session.access_token;
        playHistory.setAuthToken(session.access_token);
      }
    });

    return () => subscription?.data.subscription?.unsubscribe();
  }, [playHistory]);

  useEffect(() => {
    const song = queueMgr.getCurrentSong();
    setCurrentSong(song as Song | null);
    lastHandledEndPositionRef.current = 0;
  }, [queueMgr.state.currentIndex, queueMgr.state.songs, queueMgr.state.shuffle]);

  // Keep refs updated for the direct AudioEngine subscription below
  const currentSongRef = useRef(currentSong);
  const playNextRef = useRef(playNext);
  const playRandomNextRef = useRef(playRandomNext);
  const playHistoryRef = useRef(playHistory);
  const queueMgrRef = useRef(queueMgr);
  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
  useEffect(() => { playNextRef.current = playNext; }, [playNext]);
  useEffect(() => { playRandomNextRef.current = playRandomNext; }, [playRandomNext]);
  useEffect(() => { playHistoryRef.current = playHistory; }, [playHistory]);
  useEffect(() => { queueMgrRef.current = queueMgr; }, [queueMgr]);

  // Direct subscription to AudioEngine singleton for position-dependent logic.
  // This runs on every engine state change WITHOUT causing React re-renders.
  useEffect(() => {
    const unsub = audioEngineSingleton.subscribe((engineState) => {
      // โ”€โ”€ Song-end detection (NOT throttled โ€” must react immediately) โ”€โ”€
      if (!engineState.isLoading && engineState.duration > 0 && !isTransitioningRef.current && currentSongRef.current) {
        // Primary: use didJustFinish from expo-av (most reliable)
        // Fallback: position-based check for edge cases
        const finished = engineState.didJustFinish ||
          (engineState.position >= engineState.duration * 0.99 && !engineState.isPlaying);

        if (finished && engineState.position > lastHandledEndPositionRef.current) {
          lastHandledEndPositionRef.current = engineState.position;
          const qm = queueMgrRef.current;
          if (qm.state.repeat) {
            audioEngineSingleton.seek(0).then(() =>
              audioEngineSingleton.play().catch(() => playNextRef.current())
            );
          } else if (qm.state.shuffle) {
            playRandomNextRef.current();
          } else {
            playNextRef.current();
          }
        }
      }

      // โ”€โ”€ Play history recording (throttled) โ”€โ”€
      const now = Date.now();
      if (now - lastPositionCheckRef.current >= 800) {
        lastPositionCheckRef.current = now;
        const song = currentSongRef.current;
        if (song && engineState.duration > 0) {
          const playThreshold = Math.max(engineState.duration * 0.8, 30000);
          if (engineState.position >= playThreshold && currentPlayingRef.current === null) {
            currentPlayingRef.current = { songId: song.id, startTime: Date.now() };
            playHistoryRef.current.recordPlay(song.id, engineState.duration, engineState.position);
            queueMgrRef.current.recordPlay(song.id);
          }
        }
      }
    });
    return unsub;
  }, []); // Empty deps: uses refs for all mutable values
  useEffect(() => {
    if (activeAiPrompt && !isAiExhausted && queueMgr.shouldRefillQueue()) {
      refillAiRadio();
    }
  }, [queueMgr.state.currentIndex, activeAiPrompt, isAiExhausted, refillAiRadio]);

  // โ”€โ”€ Memoized stable context value (does NOT include position/progress) โ”€โ”€
  const stableValue = useMemo<AudioContextType>(() => ({
    currentSong,
    isPlaying: audioEngine.state.isPlaying,
    isLoading: audioEngine.state.isLoading,
    error: audioEngine.state.error,
    playSong,
    togglePlayPause,
    seekTo,
    playNext,
    playPrevious,
    queue: queueMgr.state.songs,
    currentIndex: queueMgr.state.currentIndex,
    isShuffle: queueMgr.state.shuffle,
    isRepeat: queueMgr.state.repeat,
    toggleShuffle,
    toggleRepeat,
    activeAiPrompt,
    isAiGenerating,
    startAiRadio,
    stopAiRadio,
    stopAndReset,
    volume,
    setVolume,
  }), [
    currentSong, audioEngine.state.isPlaying, audioEngine.state.isLoading, audioEngine.state.error,
    playSong, togglePlayPause, seekTo, playNext, playPrevious,
    queueMgr.state.songs, queueMgr.state.currentIndex, queueMgr.state.shuffle, queueMgr.state.repeat,
    toggleShuffle, toggleRepeat, activeAiPrompt, isAiGenerating, startAiRadio, stopAiRadio, stopAndReset, volume, setVolume,
  ]);

  // โ”€โ”€ Memoized progress context value (changes on position updates) โ”€โ”€
  const progressValue = useMemo<AudioProgressContextType>(() => ({
    currentTime: audioEngine.state.position,
    totalDuration: audioEngine.state.duration,
    progressFraction: audioEngine.state.duration > 0
      ? audioEngine.state.position / audioEngine.state.duration
      : 0,
  }), [audioEngine.state.position, audioEngine.state.duration]);

  return (
    <AudioContext.Provider value={stableValue}>
      <AudioProgressContext.Provider value={progressValue}>
        {children}
      </AudioProgressContext.Provider>
    </AudioContext.Provider>
  );
}

/**
 * useAudio: Hook for stable audio state (song, play/pause, queue, controls)
 * Does NOT cause re-renders on position updates.
 */
export const useAudio = (): AudioContextType => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

/**
 * useAudioProgress: Hook for fast-changing progress values (position, duration, fraction)
 * Only subscribe to this in components that display progress (progress bars, time displays).
 */
export const useAudioProgress = (): AudioProgressContextType => {
  const context = useContext(AudioProgressContext);
  if (!context) {
    throw new Error('useAudioProgress must be used within an AudioProvider');
  }
  return context;
};