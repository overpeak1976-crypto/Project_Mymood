import { Audio, AVPlaybackSource, AVPlaybackStatusSuccess, AVPlaybackStatusError } from 'expo-av';
import { AUDIO_MODE_CONFIG, PLAYBACK_DEFAULTS, ERROR_CONFIG, validateAudioUrl } from '@/config/audioConfig';

export interface AudioEngineState {
  isLoading: boolean;
  isPlaying: boolean;
  didJustFinish: boolean;
  duration: number;
  position: number;
  rate: number;
  volume: number;
  error: string | null;
}

export interface PlaybackStatusChangedPayload {
  status: AVPlaybackStatusSuccess | AVPlaybackStatusError;
}

/**
 * AudioEngine: Low-level Expo AV wrapper
 * Responsibilities: Load/play/pause/seek audio, handle native playback events
 * Does NOT manage: Queue, shuffle, repeat, or API calls
 */
export class AudioEngine {
  private sound: Audio.Sound | null = null;
  private state: AudioEngineState = {
    isLoading: false,
    isPlaying: false,
    didJustFinish: false,
    duration: 0,
    position: 0,
    rate: 1.0,
    volume: 1.0,
    error: null,
  };

  private listeners: Set<(state: AudioEngineState) => void> = new Set();
  private onPlaybackStatusUpdateCallback: ((status: AVPlaybackStatusSuccess | AVPlaybackStatusError) => void) | null = null;
  private lastNotifyTime: number = 0;
  private pendingNotifyTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.initializeAudioMode();
  }

  /**
   * Initialize audio mode for background playback
   */
  async initializeAudioMode(): Promise<void> {
    try {
      await Audio.setAudioModeAsync(AUDIO_MODE_CONFIG);
      console.log('[AudioEngine] Audio mode initialized successfully');
    } catch (error) {
      console.error('[AudioEngine] Failed to initialize audio mode:', error);
      this.setState({ error: 'Failed to initialize audio' });
    }
  }

  /**
   * Safely unload current sound completely
   * Ensures full cleanup before any new audio is loaded
   * Bulletproof: All errors are caught and logged
   */
  private async safeUnload(): Promise<void> {
    if (!this.sound) {
      return;
    }

    try {
      // Stop playback first
      try {
        await this.sound.stopAsync();
      } catch (e) {
        // Ignore stop errors
      }

      // Unload the sound
      try {
        await this.sound.unloadAsync();
      } catch (e) {
        // Ignore unload errors
      }

      // Clear the reference
      this.sound = null;
      console.log('[AudioEngine] Audio unloaded successfully');
    } catch (error) {
      console.error('[AudioEngine] Error during safe unload:', error);
      // Force clear reference even if unload fails
      this.sound = null;
    }
  }

  /**
   * Load and prepare audio file
   * Bulletproof sequence:
   * 1. Mark as loading
   * 2. Validate URL
   * 3. Completely unload existing sound
   * 4. Create and load new sound
   * 5. Set status update handler
   */
  async loadAudio(uri: string, onStatusUpdate?: (status: AVPlaybackStatusSuccess | AVPlaybackStatusError) => void): Promise<void> {
    try {
      this.setState({ isLoading: true, error: null });

      // Validate URL before attempting load
      const isValid = await validateAudioUrl(uri);
      if (!isValid) {
        throw new Error(`Audio URL is unreachable: ${uri}`);
      }

      // Completely unload existing sound before loading new one
      // This prevents audio playback overlaps and race conditions
      await this.safeUnload();

      // Create and load new sound
      const source: AVPlaybackSource = { uri };
      this.sound = new Audio.Sound();
      this.onPlaybackStatusUpdateCallback = onStatusUpdate || null;

      await this.sound.loadAsync(source, PLAYBACK_DEFAULTS, true);
      await this.sound.setOnPlaybackStatusUpdate(this.handlePlaybackStatusUpdate.bind(this));

      this.setState({ isLoading: false });
      console.log('[AudioEngine] Audio loaded successfully:', uri);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error loading audio';
      console.error('[AudioEngine] Failed to load audio:', error);
      this.setState({ isLoading: false, error: errorMessage });
      throw error;
    }
  }

  /**
   * Graceful fallback: If primary URL fails, try alternative URL
   */
  async loadAudioWithFallback(primaryUrl: string, fallbackUrl?: string, onStatusUpdate?: (status: AVPlaybackStatusSuccess | AVPlaybackStatusError) => void): Promise<void> {
    try {
      await this.loadAudio(primaryUrl, onStatusUpdate);
    } catch (primaryError) {
      if (fallbackUrl) {
        console.warn('[AudioEngine] Primary URL failed, trying fallback:', fallbackUrl);
        try {
          await this.loadAudio(fallbackUrl, onStatusUpdate);
          return;
        } catch (fallbackError) {
          console.error('[AudioEngine] Both URLs failed');
          throw fallbackError;
        }
      }
      throw primaryError;
    }
  }

  /**
   * Play audio
   */
  async play(): Promise<void> {
    try {
      if (!this.sound) {
        throw new Error('Audio not loaded');
      }
      await this.sound.playAsync();
      this.setState({ isPlaying: true, error: null });
    } catch (error) {
      console.error('[AudioEngine] Play failed:', error);
      this.setState({ error: error instanceof Error ? error.message : 'Play failed' });
      throw error;
    }
  }

  /**
   * Pause audio
   */
  async pause(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.pauseAsync();
        this.setState({ isPlaying: false });
      }
    } catch (error) {
      console.error('[AudioEngine] Pause failed:', error);
      throw error;
    }
  }

  /**
   * Seek to position
   */
  async seek(millis: number): Promise<void> {
    try {
      if (!this.sound) {
        throw new Error('Audio not loaded');
      }
      await this.sound.setPositionAsync(millis);
      this.setState({ position: millis });
    } catch (error) {
      console.error('[AudioEngine] Seek failed:', error);
      throw error;
    }
  }

  /**
   * Set playback rate
   */
  async setRate(rate: number): Promise<void> {
    try {
      if (!this.sound) {
        throw new Error('Audio not loaded');
      }
      await this.sound.setRateAsync(rate, true);
      this.setState({ rate });
    } catch (error) {
      console.error('[AudioEngine] Set rate failed:', error);
      throw error;
    }
  }

  /**
   * Set volume
   */
  async setVolume(volume: number): Promise<void> {
    try {
      if (!this.sound) {
        throw new Error('Audio not loaded');
      }
      await this.sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
      this.setState({ volume });
    } catch (error) {
      console.error('[AudioEngine] Set volume failed:', error);
      throw error;
    }
  }

  /**
   * Stop and unload audio
   */
  async stop(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      }
      this.setState({ isPlaying: false, position: 0, duration: 0 });
    } catch (error) {
      console.error('[AudioEngine] Stop failed:', error);
      throw error;
    }
  }

  /**
   * Internal: Handle playback status updates from Expo AV
   * Position-only changes are throttled to reduce React re-renders.
   * Important state changes (play/pause/duration/error) notify immediately.
   */
  private handlePlaybackStatusUpdate(status: AVPlaybackStatusSuccess | AVPlaybackStatusError): void {
    if ('isLoaded' in status && status.isLoaded) {
      const newPosition = status.positionMillis || 0;
      const newDuration = status.durationMillis || 0;
      const newIsPlaying = status.isPlaying;
      const justFinished = !!(status as any).didJustFinish;

      const positionChanged = Math.abs(newPosition - this.state.position) > 200;
      const durationChanged = newDuration !== this.state.duration;
      const playingChanged = newIsPlaying !== this.state.isPlaying;

      // didJustFinish is the most reliable song-end signal from expo-av
      if (justFinished) {
        this.state = { ...this.state, duration: newDuration, position: newPosition, isPlaying: false, didJustFinish: true };
        this.flushNotify();
      } else if (positionChanged || durationChanged || playingChanged) {
        this.state = { ...this.state, duration: newDuration, position: newPosition, isPlaying: newIsPlaying, didJustFinish: false };

        if (durationChanged || playingChanged) {
          this.flushNotify();
        } else {
          this.scheduleNotify();
        }
      }
    } else if (status.error) {
      this.state = { ...this.state, error: status.error };
      this.flushNotify();
    }
    this.onPlaybackStatusUpdateCallback?.(status);
  }

  /**
   * Immediately notify all listeners and cancel any pending throttled notification
   */
  private flushNotify(): void {
    if (this.pendingNotifyTimer) {
      clearTimeout(this.pendingNotifyTimer);
      this.pendingNotifyTimer = null;
    }
    this.lastNotifyTime = Date.now();
    const snapshot = { ...this.state };
    this.listeners.forEach(listener => listener(snapshot));
  }

  /**
   * Schedule a throttled notification (for position-only changes)
   */
  private scheduleNotify(): void {
    if (this.pendingNotifyTimer) return;
    const elapsed = Date.now() - this.lastNotifyTime;
    const THROTTLE_MS = 900;
    const delay = Math.max(0, THROTTLE_MS - elapsed);
    if (delay === 0) {
      this.flushNotify();
    } else {
      this.pendingNotifyTimer = setTimeout(() => {
        this.pendingNotifyTimer = null;
        this.flushNotify();
      }, delay);
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: AudioEngineState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Update internal state and notify listeners
   */
  private setState(updates: Partial<AudioEngineState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach((listener) => listener(this.state));
  }

  /**
   * Get current state
   */
  getState(): AudioEngineState {
    return { ...this.state };
  }

  /**
   * Is audio currently ready to play?
   */
  isReady(): boolean {
    return this.sound !== null && !this.state.isLoading && !this.state.error;
  }
}

// Singleton instance
export const audioEngine = new AudioEngine();
