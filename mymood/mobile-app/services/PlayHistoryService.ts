import { ERROR_CONFIG } from '@/config/audioConfig';

interface PlayHistoryPayload {
  songId: string;
  timestamp: number;
  durationMs: number;
  positionMs: number;
}

/**
 * PlayHistoryService: Handles async recording of plays to backend
 * Retries failed requests, handles offline scenarios
 */
export class PlayHistoryService {
  private backendUrl: string;
  private token: string | null = null;
  private failedRequests: PlayHistoryPayload[] = [];
  private isProcessing = false;

  constructor(backendUrl: string) {
    this.backendUrl = backendUrl;
  }

  /**
   * Update auth token
   */
  setAuthToken(token: string): void {
    this.token = token;
    // Try to flush failed requests when token becomes available
    this.processPendingRequests();
  }

  /**
   * Record a play event with automatic retry
   */
  async recordPlay(payload: PlayHistoryPayload): Promise<void> {
    if (!this.token) {
      console.warn('[PlayHistoryService] No auth token, queuing play event');
      this.failedRequests.push(payload);
      return;
    }

    try {
      await this.recordPlayWithRetry(payload);
    } catch (error) {
      console.error('[PlayHistoryService] Failed to record play after retries:', error);
      this.failedRequests.push(payload);
      // Don't throw - let app continue playing
    }
  }

  /**
   * Record with exponential backoff retry
   */
  private async recordPlayWithRetry(payload: PlayHistoryPayload, attempt = 0): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ERROR_CONFIG.REQUEST_TIMEOUT_MS);

      const response = await fetch(`${this.backendUrl}/api/play/${payload.songId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          playedAt: new Date(payload.timestamp).toISOString(),
          durationMs: payload.durationMs,
          positionMs: payload.positionMs,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('[PlayHistoryService] Play recorded successfully:', payload.songId);
    } catch (error) {
      if (attempt < ERROR_CONFIG.MAX_RETRIES) {
        const delayMs = ERROR_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[PlayHistoryService] Retrying in ${delayMs}ms...`, error);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return this.recordPlayWithRetry(payload, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Process pending requests (called when token updates or app resumes)
   */
  async processPendingRequests(): Promise<void> {
    if (this.isProcessing || this.failedRequests.length === 0 || !this.token) {
      return;
    }

    this.isProcessing = true;
    const pending = [...this.failedRequests];
    this.failedRequests = [];

    for (const payload of pending) {
      try {
        await this.recordPlayWithRetry(payload);
      } catch (error) {
        console.error('[PlayHistoryService] Failed to sync pending play:', error);
        this.failedRequests.push(payload);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Get count of pending requests
   */
  getPendingCount(): number {
    return this.failedRequests.length;
  }
}

export const playHistoryService = new PlayHistoryService(
  process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8080'
);
