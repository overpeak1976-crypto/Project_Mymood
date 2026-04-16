/**
 * Data sanitization utilities
 * Sanitizes API responses before displaying in UI
 * Prevents XSS attacks and data corruption
 */

/**
 * HTML entities map for escaping
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
  '/': '&#x2F;',
};

export const sanitizer = {
  /**
   * Escape HTML special characters
   * Prevents XSS by converting dangerous chars to entities
   */
  escapeHtml(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text.replace(/[&<>"'\/]/g, (char) => HTML_ENTITIES[char] || char);
  },

  /**
   * Sanitize user-generated text
   * Removes/escapes potentially dangerous content
   */
  sanitizeText(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    // Escape HTML entities
    let sanitized = this.escapeHtml(text);

    // Remove null characters
    sanitized = sanitized.replace(/\0/g, '');

    // Remove other control characters
    sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

    return sanitized;
  },

  /**
   * Sanitize HTML (basic - removes dangerous tags)
   * WARNING: Not suitable for rich text. Use a proper HTML sanitizer library for that.
   */
  sanitizeHtml(html: string): string {
    if (!html || typeof html !== 'string') {
      return '';
    }

    let sanitized = html;

    // Remove <script> tags and contents
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove event handlers (onclick, onload, etc.)
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');

    // Remove javascript: protocol
    sanitized = sanitized.replace(/javascript:/gi, '');

    // Remove data: protocol (can be used for XSS)
    sanitized = sanitized.replace(/data:text\/html/gi, '');

    // Remove <iframe> tags
    sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

    // Remove <object> tags
    sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');

    // Remove <embed> tags
    sanitized = sanitized.replace(/<embed\b[^<]*(\/?)>/gi, '');

    return sanitized;
  },

  /**
   * Sanitize URL (prevents javascript: and data: protocols)
   */
  sanitizeUrl(url: string): string {
    if (!url || typeof url !== 'string') {
      return '';
    }

    const trimmed = url.trim();

    // Block dangerous protocols
    if (/^(javascript|data|vbscript):/i.test(trimmed)) {
      console.warn('[Sanitizer] Blocked dangerous URL protocol:', trimmed);
      return '';
    }

    return trimmed;
  },

  /**
   * Sanitize API response object recursively
   * Escapes all string values to prevent XSS
   */
  sanitizeObject<T extends Record<string, any>>(obj: T): T {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item)) as unknown as T;
    }

    const sanitized: Record<string, any> = {};

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];

        if (typeof value === 'string') {
          // Sanitize string values
          sanitized[key] = this.sanitizeText(value);
        } else if (Array.isArray(value)) {
          // Recursively sanitize arrays
          sanitized[key] = value.map((item: any) => this.sanitizeObject(item));
        } else if (value !== null && typeof value === 'object') {
          // Recursively sanitize nested objects
          sanitized[key] = this.sanitizeObject(value);
        } else {
          // Keep other types as-is (numbers, booleans, null)
          sanitized[key] = value;
        }
      }
    }

    return sanitized as T;
  },

  /**
   * Sanitize user profile data
   */
  sanitizeProfile(profile: any): any {
    if (!profile || typeof profile !== 'object') {
      return profile;
    }

    return {
      id: profile.id,
      username: this.sanitizeText(profile.username || ''),
      email: this.sanitizeText(profile.email || ''),
      profile_image_url: this.sanitizeUrl(profile.profile_image_url || ''),
      bio: this.sanitizeText(profile.bio || ''),
      handle: this.sanitizeText(profile.handle || ''),
      is_online: profile.is_online,
      last_active: profile.last_active,
      created_at: profile.created_at,
    };
  },

  /**
   * Sanitize song data
   */
  sanitizeSong(song: any): any {
    if (!song || typeof song !== 'object') {
      return song;
    }

    return {
      id: song.id,
      title: this.sanitizeText(song.title || ''),
      artist: this.sanitizeText(song.artist || ''),
      album: this.sanitizeText(song.album || ''),
      genre: this.sanitizeText(song.genre || ''),
      cover_image_url: this.sanitizeUrl(song.cover_image_url || ''),
      audio_file_url: this.sanitizeUrl(song.audio_file_url || ''),
      duration_ms: song.duration_ms,
      play_count: song.play_count || 0,
      created_at: song.created_at,
      updated_at: song.updated_at,
    };
  },

  /**
   * Sanitize playlist data
   */
  sanitizePlaylist(playlist: any): any {
    if (!playlist || typeof playlist !== 'object') {
      return playlist;
    }

    return {
      id: playlist.id,
      name: this.sanitizeText(playlist.name || ''),
      description: this.sanitizeText(playlist.description || ''),
      cover_image_url: this.sanitizeUrl(playlist.cover_image_url || ''),
      is_public: playlist.is_public,
      is_ai_generated: playlist.is_ai_generated,
      ai_prompt: playlist.ai_prompt ? this.sanitizeText(playlist.ai_prompt) : null,
      track_count: playlist.track_count || 0,
      created_at: playlist.created_at,
      updated_at: playlist.updated_at,
    };
  },

  /**
   * Trim and limit string length
   */
  truncate(text: string, maxLength: number): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    if (text.length <= maxLength) {
      return text;
    }

    return text.substring(0, maxLength).trim() + '...';
  },

  /**
   * Normalize whitespace (remove extra spaces)
   */
  normalizeWhitespace(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim(); // Trim leading/trailing whitespace
  },
};
