export const AUDIO_MODE_CONFIG = {
  allowsRecordingIOS: false,
  playsInSilentModeIOS: true,
  interruptionModeIOS: 2,
  interruptionModeAndroid: 2,
  shouldDuckAndroid: true,
  playThroughEarpieceAndroid: false,
  staysActiveInBackground: true,
};

export const PLAYBACK_DEFAULTS = {
  progressUpdateIntervalMillis: 1000,
  shouldPlay: true,
  isMuted: false,
  volume: 1.0,
  rate: 1.0,
};

export const QUEUE_CONFIG = {
  AI_RADIO_REFILL_THRESHOLD: 5,
  AI_RADIO_REFILL_COUNT: 10,
  MAX_QUEUE_SIZE: 500,
  HISTORY_MAX_ENTRIES: 100,
};

export const ERROR_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  REQUEST_TIMEOUT_MS: 15000,
  PLAYBACK_RETRY_DELAY_MS: 2000,
};

export const validateAudioUrl = async (url: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ERROR_CONFIG.REQUEST_TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error(`[AudioConfig] URL validation failed for ${url}:`, error);
    return false;
  }
};
