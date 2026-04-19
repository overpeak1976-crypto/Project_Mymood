import { supabase } from '@/lib/supabase';
import { ERROR_CONFIG } from '@/config/audioConfig';

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

interface HTTPErrorData {
  message?: string;
  error?: string;
  originalError?: string;
  [key: string]: any;
}

/**
 * Custom HTTP error class for better error handling
 */
export class HTTPError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public data: HTTPErrorData = {}
  ) {
    super(message);
    this.name = 'HTTPError';
  }

  isNetworkError(): boolean {
    return this.statusCode === 0;
  }

  isServerError(): boolean {
    return this.statusCode >= 500;
  }

  isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  isForbidden(): boolean {
    return this.statusCode === 403;
  }

  isNotFound(): boolean {
    return this.statusCode === 404;
  }

  isTimeout(): boolean {
    return this.data.originalError?.includes('Timeout') || false;
  }

  isRateLimited(): boolean {
    return this.statusCode === 429;
  }
}

/**
 * Global HTTP Client with automatic auth, timeout, and error handling
 * Centralized fetch wrapper for all API calls
 */
class HTTPClient {
  private baseUrl: string;
  private defaultTimeout: number = ERROR_CONFIG.REQUEST_TIMEOUT_MS;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Universal request method with auth injection and error handling
   * Automatically adds Bearer token from Supabase session
   */
  async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const method = config.method || 'GET';

    try {
      // Get auth token from Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Build headers with auth
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...config.headers,
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutMs = config.timeout || this.defaultTimeout;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      console.log(`[HTTPClient] ${method} ${endpoint}`);

      const response = await fetch(url, {
        method,
        headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle different response codes
      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        const errorMessage = errorData.message || errorData.error || response.statusText;

        console.error(`[HTTPClient] Error ${response.status}: ${errorMessage}`);

        throw new HTTPError(response.status, errorMessage, errorData);
      }

      // Safely parse response with Content-Type validation
      const data: T = await this.parseResponse(response);

      console.log(`[HTTPClient] Success ${response.status}`);

      return data;
    } catch (error) {
      // Handle timeout errors
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new HTTPError(
          0,
          'Request timeout - check your network connection',
          { originalError: `Timeout after ${config.timeout || this.defaultTimeout}ms` }
        );
        console.error('[HTTPClient] Timeout error:', timeoutError);
        throw timeoutError;
      }

      // Re-throw HTTP errors
      if (error instanceof HTTPError) {
        throw error;
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const networkError = new HTTPError(
          0,
          'Network request failed - check your internet connection',
          { originalError: error.message }
        );
        console.error('[HTTPClient] Network error:', networkError);
        throw networkError;
      }

      // Unknown error
      console.error('[HTTPClient] Unknown error:', error);
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  /**
   * POST request with FormData (for multipart file uploads)
   * Does NOT set Content-Type header (browser sets it with multipart boundary)
   * Does NOT JSON.stringify the body — passes FormData directly
   */
  async postFormData<T>(endpoint: string, formData: FormData, config?: RequestConfig): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      // Get auth token from Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Build headers WITHOUT Content-Type (let browser set multipart boundary)
      const headers: Record<string, string> = {
        ...config?.headers,
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutMs = config?.timeout || this.defaultTimeout;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      console.log(`[HTTPClient] POST FormData ${endpoint}`);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        const errorMessage = errorData.message || errorData.error || response.statusText;
        console.error(`[HTTPClient] Error ${response.status}: ${errorMessage}`);
        throw new HTTPError(response.status, errorMessage, errorData);
      }

      const data: T = await this.parseResponse(response);
      console.log(`[HTTPClient] Success ${response.status}`);
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new HTTPError(
          0,
          'Request timeout - check your network connection',
          { originalError: `Timeout after ${config?.timeout || this.defaultTimeout}ms` }
        );
      }
      if (error instanceof HTTPError) throw error;
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new HTTPError(
          0,
          'Network request failed - check your internet connection',
          { originalError: error.message }
        );
      }
      throw error;
    }
  }

  /**
   * Parse response body safely based on Content-Type
   * Prevents JSON parse errors when backend returns HTML error pages
   */
  private async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');

    try {
      // Check if response is JSON
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      // If not JSON, try to parse as text first
      const text = await response.text();

      // If text looks like JSON, try to parse it
      if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
        try {
          return JSON.parse(text);
        } catch (parseError) {
          console.error('[HTTPClient] JSON parse failed for non-JSON content-type:', parseError);
          throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
        }
      }

      // Text response (likely HTML error page)
      return { message: text, isHtmlError: true };
    } catch (error) {
      console.error('[HTTPClient] Response parse error:', error);
      throw new Error('Failed to parse response body');
    }
  }

  /**
   * Parse error response from server
   */
  private async parseErrorResponse(response: Response): Promise<HTTPErrorData> {
    try {
      const contentType = response.headers.get('content-type');

      // Check if error response is JSON
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      // Non-JSON error response (likely HTML error page)
      const text = await response.text();

      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        // HTML error page detected
        const title = text.match(/<title[^>]*>([^<]+)<\/title>/)?.[1] || 'Unknown Error';
        return {
          message: `Server Error: ${title}`,
          error: `HTTP ${response.status} - Likely server error. Status: ${response.statusText}`,
          isHtmlError: true,
        };
      }

      // Plain text error response
      return { message: text || response.statusText };
    } catch (error) {
      console.error('[HTTPClient] Error parsing error response:', error);
      return { message: 'Failed to parse error response' };
    }
  }

  /**
   * Set custom timeout (default: 15000ms)
   */
  setDefaultTimeout(ms: number): void {
    this.defaultTimeout = ms;
    console.log(`[HTTPClient] Default timeout set to ${ms}ms`);
  }
}

// Initialize singleton
export const httpClient = new HTTPClient(
  (process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8080').replace(/\/+$/, '') // Remove trailing slash if present
);
