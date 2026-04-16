import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useQueueManager } from '@/hooks/useQueueManager';
import { usePlayHistory } from '@/hooks/usePlayHistory';
import { Song } from '@/types/audio';

export type { Song };
interface AudioContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  totalDuration: number;
  progressFraction: number;
  error: string | null;

  playSong: (song: Song, playlist?: Song[]) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (millis: number) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;

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
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

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
  const playSongTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const seekTo = useCallback(async (millis: number): Promise<void> => {
    try {
      await audioEngine.seek(millis);
    } catch (error) {
      console.error('[AudioContext] Seek failed:', error);
    }
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

      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
      const currentIds = queueMgr.state.songs.map((s) => s.id);

      const response = await fetch(`${backendUrl}/api/ai/generate-playlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionTokenRef.current}`,
        },
        body: JSON.stringify({
          prompt: activeAiPrompt,
          limit: 10,
          excludeIds: currentIds,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.songs && data.songs.length > 0) {
        queueMgr.appendSongs(data.songs);
      } else {
        setIsAiExhausted(true);
        console.log('[AudioContext] AI Radio exhausted - no more unique songs');
      }
    } catch (error) {
      console.error('[AudioContext] refillAiRadio failed:', error);
      setIsAiExhausted(true);
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
        console.log('[AudioContext] playSong: Setting transition lock to TRUE');
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
          console.log('[AudioContext] Audio loaded successfully, now playing');
        } catch (loadError) {
          console.error('[AudioContext] Failed to load audio:', loadError);
          throw loadError;
        }
        try {
          await audioEngine.play();
          console.log('[AudioContext] Playback started for:', song.title);
        } catch (playError) {
          console.error('[AudioContext] Failed to start playback:', playError);
          throw playError;
        }

        currentPlayingRef.current = null;
        console.log('[AudioContext] playSong SUCCESS - will release lock in finally');
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

        const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
        const response = await fetch(`${backendUrl}/api/ai/generate-playlist`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionTokenRef.current}`,
          },
          body: JSON.stringify({
            prompt,
            limit: 20,
            excludeIds: currentSong ? [currentSong.id] : [],
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

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

  useEffect(() => {
    if (!audioEngine.state.isLoading && audioEngine.state.duration > 0 && !isTransitioningRef.current) {
      const isFinished = audioEngine.state.position >= audioEngine.state.duration * 0.99;
      if (isFinished && audioEngine.state.isPlaying === false && currentSong) {
        if (audioEngine.state.position > lastHandledEndPositionRef.current) {
          lastHandledEndPositionRef.current = audioEngine.state.position;
          if (queueMgr.state.repeat) {
            console.log('[AudioContext] Song finished - REPEAT ON: Replaying current song', currentSong.title);
            audioEngine.seek(0).then(() => {
              audioEngine.play().catch((err) => {
                console.error('[AudioContext] Failed to replay song:', err);
                playNext();
              });
            });
          } else if (queueMgr.state.shuffle) {
            console.log('[AudioContext] Song finished - SHUFFLE ON: Picking random song from queue');
            playRandomNext();
          } else {
            console.log('[AudioContext] Song finished - Normal mode: Moving to next song');
            playNext();
          }
        }
      }
    }
  }, [audioEngine.state.position, audioEngine.state.duration, audioEngine.state.isPlaying, currentSong, playNext, playRandomNext, queueMgr.state.repeat, queueMgr.state.shuffle, audioEngine, queueMgr]);
  useEffect(() => {
    if (activeAiPrompt && !isAiExhausted && queueMgr.shouldRefillQueue()) {
      refillAiRadio();
    }
  }, [queueMgr.state.currentIndex, activeAiPrompt, isAiExhausted, refillAiRadio]);

  useEffect(() => {
    if (!currentSong || !audioEngine.state.duration) return;

    const playThreshold = Math.max(audioEngine.state.duration * 0.8, 30000);

    if (
      audioEngine.state.position >= playThreshold &&
      currentPlayingRef.current === null
    ) {
      currentPlayingRef.current = {
        songId: currentSong.id,
        startTime: Date.now(),
      };

      playHistory.recordPlay(
        currentSong.id,
        audioEngine.state.duration,
        audioEngine.state.position
      );

      queueMgr.recordPlay(currentSong.id);
    }
  }, [audioEngine.state.position, audioEngine.state.duration, currentSong, playHistory]);

  return (
    <AudioContext.Provider
      value={{
        // Current state
        currentSong,
        isPlaying: audioEngine.state.isPlaying,
        isLoading: audioEngine.state.isLoading,
        // NOTE: All timestamps in milliseconds to match AudioEngine units
        currentTime: audioEngine.state.position,
        totalDuration: audioEngine.state.duration,
        progressFraction: audioEngine.state.duration > 0
          ? audioEngine.state.position / audioEngine.state.duration
          : 0,
        error: audioEngine.state.error,

        // Playback controls
        playSong,
        togglePlayPause,
        seekTo,
        playNext,
        playPrevious,

        // Queue state
        queue: queueMgr.state.songs,
        currentIndex: queueMgr.state.currentIndex,
        isShuffle: queueMgr.state.shuffle,
        isRepeat: queueMgr.state.repeat,

        // Queue controls
        toggleShuffle,
        toggleRepeat,

        // AI Radio state
        activeAiPrompt,
        isAiGenerating,

        // AI Radio controls
        startAiRadio,
        stopAiRadio,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

/**
 * useAudio: Hook to consume AudioContext
 * Throws error if used outside AudioProvider
 */
export const useAudio = (): AudioContextType => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};