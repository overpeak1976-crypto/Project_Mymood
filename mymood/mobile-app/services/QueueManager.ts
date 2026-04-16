import { QUEUE_CONFIG } from '@/config/audioConfig';
import { Song } from '@/types/audio';

export type { Song };

export interface QueueState {
  songs: Song[];
  currentIndex: number;
  shuffle: boolean;
  repeat: boolean; // true = repeat all, false = no repeat (for simplicity)
  error: string | null;
}

export interface QueueHistoryItem {
  songId: string;
  playedAt: number;
}

/**
 * QueueManager: Manages playback queue, shuffle, repeat, and history
 * Does NOT handle: Audio playback (AudioEngine's job)
 */
export class QueueManager {
  private state: QueueState = {
    songs: [],
    currentIndex: 0,
    shuffle: false,
    repeat: false,
    error: null,
  };

  private listeners: Set<(state: QueueState) => void> = new Set();
  private shuffleIndices: number[] = [];
  private playHistory: QueueHistoryItem[] = [];

  constructor() {}

  /**
   * Set queue with initial songs
   */
  setQueue(songs: Song[]): void {
    if (songs.length === 0) {
      this.setState({ error: 'Cannot set empty queue' });
      return;
    }

    if (songs.length > QUEUE_CONFIG.MAX_QUEUE_SIZE) {
      console.warn(`[QueueManager] Queue size exceeds limit, truncating to ${QUEUE_CONFIG.MAX_QUEUE_SIZE}`);
      songs = songs.slice(0, QUEUE_CONFIG.MAX_QUEUE_SIZE);
    }

    this.state = {
      ...this.state,
      songs,
      currentIndex: 0,
      error: null,
    };

    this.regenerateShuffleIndices();
    this.notifyListeners();
  }

  /**
   * Append songs to queue (used for AI radio infinite queue)
   */
  appendSongs(songs: Song[]): void {
    const newQueue = [...this.state.songs, ...songs];

    if (newQueue.length > QUEUE_CONFIG.MAX_QUEUE_SIZE) {
      console.warn('[QueueManager] Queue size exceeded, truncating oldest songs');
      newQueue.splice(0, newQueue.length - QUEUE_CONFIG.MAX_QUEUE_SIZE);
    }

    this.state.songs = newQueue;
    this.regenerateShuffleIndices();
    this.notifyListeners();
  }

  /**
   * Get current song
   */
  getCurrentSong(): Song | null {
    const index = this.state.shuffle ? this.shuffleIndices[this.state.currentIndex] : this.state.currentIndex;
    return this.state.songs[index] || null;
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.state.songs.length;
  }

  /**
   * Need to refill? (for AI radio)
   */
  shouldRefillQueue(): boolean {
    return this.getQueueSize() - this.state.currentIndex <= QUEUE_CONFIG.AI_RADIO_REFILL_THRESHOLD;
  }

  /**
   * Next song (handles shuffle and repeat)
   * If repeat is enabled and at end of queue, loops back to beginning
   * Updates shuffle indices if shuffle mode is active
   */
  nextSong(): Song | null {
    const queueSize = this.state.songs.length;
    if (queueSize === 0) return null;

    const isAtEnd = this.state.currentIndex >= queueSize - 1;

    if (isAtEnd && this.state.repeat) {
      // Loop back to beginning
      this.state.currentIndex = 0;
      if (this.state.shuffle) {
        this.regenerateShuffleIndices();
      }
    } else if (isAtEnd) {
      // Reached end, don't auto-advance
      return null;
    } else {
      this.state.currentIndex++;
      // Regenerate shuffle indices so remaining songs stay randomized
      if (this.state.shuffle) {
        this.regenerateShuffleIndices();
      }
    }

    this.notifyListeners();
    return this.getCurrentSong();
  }

  /**
   * Previous song
   * Updates shuffle indices if shuffle mode is active
   */
  previousSong(): Song | null {
    if (this.state.currentIndex === 0) return null;
    this.state.currentIndex--;
    
    // Regenerate shuffle indices so remaining songs stay randomized
    if (this.state.shuffle) {
      this.regenerateShuffleIndices();
    }
    
    this.notifyListeners();
    return this.getCurrentSong();
  }

  /**
   * Jump to specific song
   * Updates shuffle indices if shuffle mode is active
   */
  jumpToSong(index: number): Song | null {
    if (index < 0 || index >= this.state.songs.length) {
      this.setState({ error: 'Invalid song index' });
      return null;
    }

    this.state.currentIndex = index;
    
    // Regenerate shuffle indices so remaining songs stay randomized
    if (this.state.shuffle) {
      this.regenerateShuffleIndices();
    }
    
    this.notifyListeners();
    return this.getCurrentSong();
  }

  /**
   * Toggle shuffle (Apple Music style)
   * When enabled: Shuffles remaining songs in current queue/tag only
   * When disabled: Restores natural queue order
   */
  toggleShuffle(): boolean {
    this.state.shuffle = !this.state.shuffle;
    if (this.state.shuffle) {
      console.log('[QueueManager] Shuffle enabled - shuffling remaining songs in current tag/playlist');
      this.regenerateShuffleIndices();
    } else {
      console.log('[QueueManager] Shuffle disabled - restoring natural queue order');
    }
    this.notifyListeners();
    return this.state.shuffle;
  }

  /**
   * Toggle repeat on/off
   * Simple boolean toggle for queue looping
   */
  toggleRepeat(): boolean {
    this.state.repeat = !this.state.repeat;
    this.notifyListeners();
    return this.state.repeat;
  }

  /**
   * Record play history for analytics
   */
  recordPlay(songId: string): void {
    this.playHistory.push({
      songId,
      playedAt: Date.now(),
    });

    // Keep only recent history
    if (this.playHistory.length > QUEUE_CONFIG.HISTORY_MAX_ENTRIES) {
      this.playHistory.shift();
    }
  }

  /**
   * Get play history
   */
  getPlayHistory(): QueueHistoryItem[] {
    return [...this.playHistory];
  }

  /**
   * Get random next song from current queue (shuffle mode)
   * Picks truly random song from remaining queue, excluding current song
   * When reaching end of queue, loops back to first song
   * Returns the song if available, null if only one song in queue
   */
  getRandomNextSong(): Song | null {
    const queueSize = this.state.songs.length;
    if (queueSize <= 1) return null; // Not enough songs to randomize

    const currentSongIndex = this.state.shuffle 
      ? this.shuffleIndices[this.state.currentIndex] 
      : this.state.currentIndex;

    // Get remaining songs after current position (for Apple Music style shuffle)
    // remainingSongs are at indices: currentIndex+1, currentIndex+2, ..., queueSize-1
    const remainingSongsCount = queueSize - this.state.currentIndex - 1;

    if (remainingSongsCount <= 0) {
      // At end of queue - loop back to first song
      this.state.currentIndex = 0;
      if (this.state.shuffle) {
        this.regenerateShuffleIndices();
      }
      console.log('[QueueManager] Reached end of queue, looping back to first song');
      this.notifyListeners();
      return this.getCurrentSong();
    }

    // Pick a truly random remaining song
    // We pick a random number from 0 to remainingSongsCount-1
    // Then add 1 to currentIndex to get the actual song position
    const randomIndex = this.state.currentIndex + 1 + Math.floor(Math.random() * remainingSongsCount);
    
    console.log('[QueueManager] Random next song selected:', {
      previousIndex: this.state.currentIndex,
      newIndex: randomIndex,
      currentSong: currentSongIndex,
      remainingSongs: remainingSongsCount,
    });

    // Set currentIndex to the random song (don't regenerate shuffle indices)
    // This preserves the current shuffle state for future navigation
    this.state.currentIndex = randomIndex;
    this.notifyListeners();
    return this.getCurrentSong();
  }

  /**
   * Private: Regenerate shuffle indices (Apple Music style)
   * 
   * Shuffles ONLY remaining songs in current queue/tag
   * - Keeps currently playing song in place (index 0)
   * - Randomizes only songs after current position
   * - Respects playlist/tag boundaries (queue already contains only those songs)
   * 
   * Example: Queue [A, B, C, D] with current index 1 (B playing)
   * - B stays at position 1
   * - A stays at position 0
   * - C and D are shuffled in positions 2 and 3
   */
  private regenerateShuffleIndices(): void {
    // Initialize with natural order
    this.shuffleIndices = Array.from({ length: this.state.songs.length }, (_, i) => i);

    // Keep songs up to and including current index in place
    // Only shuffle remaining songs (from currentIndex + 1 onwards)
    const remainingStart = this.state.currentIndex + 1;
    
    if (remainingStart < this.state.songs.length) {
      // Fisher-Yates shuffle on remaining songs only
      for (let i = this.state.songs.length - 1; i > this.state.currentIndex; i--) {
        // Random index between currentIndex + 1 and i (inclusive)
        const j = this.state.currentIndex + 1 + Math.floor(Math.random() * (i - this.state.currentIndex));
        [this.shuffleIndices[i], this.shuffleIndices[j]] = [this.shuffleIndices[j], this.shuffleIndices[i]];
      }
    }

    console.log('[QueueManager] Shuffle indices regenerated (Apple Music style):', {
      currentIndex: this.state.currentIndex,
      remainingShuffled: this.state.songs.length - remainingStart,
      indices: this.shuffleIndices,
    });
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: QueueState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Update state and notify
   */
  private setState(updates: Partial<QueueState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener({ ...this.state }));
  }

  /**
   * Get current state
   */
  getState(): QueueState {
    return { ...this.state };
  }
}

// Singleton
export const queueManager = new QueueManager();
