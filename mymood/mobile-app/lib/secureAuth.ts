import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token_secure';
const REFRESH_TOKEN_KEY = 'refresh_token_secure';
const TOKEN_EXPIRY_KEY = 'token_expiry';

/**
 * Secure token storage and management
 * Uses expo-secure-store for encrypted storage (never AsyncStorage!)
 * Handles token expiration and refresh logic
 */
export const secureAuth = {
  /**
   * Store auth tokens securely in encrypted storage
   * NEVER store tokens in AsyncStorage - that's unencrypted!
   */
  async storeTokens(
    accessToken: string,
    refreshToken?: string,
    expiresIn?: number
  ): Promise<void> {
    try {
      if (!accessToken || typeof accessToken !== 'string') {
        throw new Error('Invalid access token');
      }

      await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
      console.log('[SecureAuth] Access token stored securely');

      if (refreshToken && typeof refreshToken === 'string') {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
        console.log('[SecureAuth] Refresh token stored securely');
      }

      if (expiresIn && typeof expiresIn === 'number') {
        const expiry = Date.now() + expiresIn * 1000;
        await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, expiry.toString());
        console.log(`[SecureAuth] Token expiry set to ${new Date(expiry).toISOString()}`);
      }
    } catch (error) {
      console.error('[SecureAuth] Failed to store tokens:', error);
      throw error;
    }
  },

  /**
   * Get stored access token
   * Returns null if expired or not found
   */
  async getAccessToken(): Promise<string | null> {
    try {
      // Check expiry first
      const expiryStr = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
      if (expiryStr) {
        const expiry = parseInt(expiryStr, 10);
        if (isNaN(expiry)) {
          console.warn('[SecureAuth] Invalid expiry timestamp, clearing tokens');
          await this.clearTokens();
          return null;
        }

        if (Date.now() > expiry) {
          console.warn('[SecureAuth] Token expired, clearing');
          await this.clearTokens();
          return null;
        }
      }

      const token = await SecureStore.getItemAsync(TOKEN_KEY);

      if (token) {
        console.log('[SecureAuth] Access token retrieved from secure storage');
        return token;
      }

      return null;
    } catch (error) {
      console.error('[SecureAuth] Failed to retrieve access token:', error);
      return null;
    }
  },

  /**
   * Get stored refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (token) {
        console.log('[SecureAuth] Refresh token retrieved from secure storage');
      }
      return token;
    } catch (error) {
      console.error('[SecureAuth] Failed to retrieve refresh token:', error);
      return null;
    }
  },

  /**
   * Clear all stored tokens
   */
  async clearTokens(): Promise<void> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
        SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY),
      ]);
      console.log('[SecureAuth] All tokens cleared from secure storage');
    } catch (error) {
      console.error('[SecureAuth] Failed to clear tokens:', error);
    }
  },

  /**
   * Check if token exists and is not expired
   */
  async isTokenValid(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      return token !== null;
    } catch (error) {
      console.error('[SecureAuth] Failed to check token validity:', error);
      return false;
    }
  },

  /**
   * Get remaining token lifetime in seconds
   */
  async getTokenTTL(): Promise<number | null> {
    try {
      const expiryStr = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
      if (!expiryStr) {
        return null;
      }

      const expiry = parseInt(expiryStr, 10);
      if (isNaN(expiry)) {
        return null;
      }

      const remainingMs = expiry - Date.now();
      if (remainingMs < 0) {
        return null; // Expired
      }

      return Math.floor(remainingMs / 1000);
    } catch (error) {
      console.error('[SecureAuth] Failed to get token TTL:', error);
      return null;
    }
  },
};
