/**
 * Input validation utilities
 * Validates user input before sending to API
 * Prevents injection attacks and malformed data
 */

export const validators = {
  /**
   * Validate AI prompt (prevent injection)
   */
  validatePrompt(prompt: string, maxLength = 500): string {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt must be a non-empty string');
    }

    const trimmed = prompt.trim();

    if (trimmed.length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    if (trimmed.length > maxLength) {
      throw new Error(`Prompt cannot exceed ${maxLength} characters (current: ${trimmed.length})`);
    }

    // Remove suspicious patterns (basic protection)
    const suspicious = /(<script|javascript:|on\w+|<iframe|sql|union|select|drop|insert|delete)/gi;
    if (suspicious.test(trimmed)) {
      throw new Error('Prompt contains invalid characters or patterns');
    }

    return trimmed;
  },

  /**
   * Validate search query
   */
  validateSearchQuery(query: string, maxLength = 100): string {
    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string');
    }

    const trimmed = query.trim();

    if (trimmed.length === 0) {
      throw new Error('Query cannot be empty');
    }

    if (trimmed.length > maxLength) {
      throw new Error(`Query cannot exceed ${maxLength} characters`);
    }

    // Allow letters, numbers, spaces, and basic punctuation
    const validChars = /^[a-zA-Z0-9\s\-',:.&!?()]*$/;
    if (!validChars.test(trimmed)) {
      throw new Error('Query contains invalid characters');
    }

    return trimmed;
  },

  /**
   * Validate song ID (UUID format)
   */
  validateSongId(id: string): string {
    if (!id || typeof id !== 'string') {
      throw new Error('Song ID must be a non-empty string');
    }

    const trimmed = id.trim();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(trimmed)) {
      throw new Error(`Invalid song ID format (expected UUID, got: ${trimmed})`);
    }

    return trimmed;
  },

  /**
   * Validate user ID (UUID format)
   */
  validateUserId(id: string): string {
    if (!id || typeof id !== 'string') {
      throw new Error('User ID must be a non-empty string');
    }

    const trimmed = id.trim();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(trimmed)) {
      throw new Error(`Invalid user ID format (expected UUID, got: ${trimmed})`);
    }

    return trimmed;
  },

  /**
   * Validate email address
   */
  validateEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      throw new Error('Email must be a non-empty string');
    }

    const trimmed = email.trim().toLowerCase();

    // RFC 5322 simplified regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmed)) {
      throw new Error(`Invalid email format: "${trimmed}"`);
    }

    return trimmed;
  },

  /**
   * Validate stream URL (music audio file)
   */
  validateStreamUrl(url: string): string {
    if (!url || typeof url !== 'string') {
      throw new Error('URL must be a non-empty string');
    }

    const trimmed = url.trim();

    try {
      new URL(trimmed);
    } catch {
      throw new Error(`Invalid URL format: "${trimmed}"`);
    }

    // Check for valid audio file extensions
    const audioExtensions = /\.(mp3|m4a|wav|flac|aac|ogg|wma)$/i;
    if (!audioExtensions.test(trimmed) && !trimmed.includes('stream')) {
      console.warn('[Validators] URL does not appear to be an audio file:', trimmed);
    }

    return trimmed;
  },

  /**
   * Validate username/handle
   */
  validateUsername(username: string, maxLength = 30): string {
    if (!username || typeof username !== 'string') {
      throw new Error('Username must be a non-empty string');
    }

    const trimmed = username.trim();

    if (trimmed.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }

    if (trimmed.length > maxLength) {
      throw new Error(`Username cannot exceed ${maxLength} characters`);
    }

    // Alphanumeric + underscore + hyphen
    const validUsername = /^[a-zA-Z0-9_\-]+$/;
    if (!validUsername.test(trimmed)) {
      throw new Error('Username can only contain letters, numbers, underscores, and hyphens');
    }

    return trimmed;
  },

  /**
   * Validate integer within range
   */
  validateInteger(value: any, minValue?: number, maxValue?: number): number {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      throw new Error(`Value must be an integer (got: ${value})`);
    }

    if (minValue !== undefined && value < minValue) {
      throw new Error(`Value must be >= ${minValue} (got: ${value})`);
    }

    if (maxValue !== undefined && value > maxValue) {
      throw new Error(`Value must be <= ${maxValue} (got: ${value})`);
    }

    return value;
  },

  /**
   * Validate number within range
   */
  validateNumber(value: any, minValue?: number, maxValue?: number): number {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(`Value must be a valid number (got: ${value})`);
    }

    if (minValue !== undefined && value < minValue) {
      throw new Error(`Value must be >= ${minValue} (got: ${value})`);
    }

    if (maxValue !== undefined && value > maxValue) {
      throw new Error(`Value must be <= ${maxValue} (got: ${value})`);
    }

    return value;
  },

  /**
   * Validate array of IDs
   */
  validateIdArray(ids: any[]): string[] {
    if (!Array.isArray(ids)) {
      throw new Error('IDs must be an array');
    }

    if (ids.length === 0) {
      throw new Error('ID array cannot be empty');
    }

    if (ids.length > 100) {
      throw new Error('ID array cannot exceed 100 items');
    }

    return ids.map((id) => this.validateSongId(id));
  },
};
