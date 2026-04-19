/**
 * Shared audio types - avoids circular dependencies
 */

export interface Song {
  id: string;
  title: string;
  artist: string;
  cover_image_url: string;
  audio_file_url: string;
  fallback_uri?: string;
}
