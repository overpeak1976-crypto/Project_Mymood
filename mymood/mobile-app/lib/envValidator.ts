/**
 * Environment variable validation
 * Validates all required EXPO_PUBLIC_* variables on app startup
 * Fails fast if critical vars are missing
 */

const REQUIRED_ENV_VARS = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_BACKEND_URL',
];

const OPTIONAL_ENV_VARS = [
  'EXPO_PUBLIC_API_TIMEOUT_MS',
  'EXPO_PUBLIC_ENABLE_DEBUG_LOGS',
];

const ENV_VALIDATION_CACHE = new Map<string, boolean>();

export function validateEnvironment(): void {
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const varName of REQUIRED_ENV_VARS) {
    const value = process.env[varName];

    if (!value) {
      missing.push(varName);
      continue;
    }

    if (typeof value !== 'string' || value.trim() === '') {
      invalid.push(varName);
      continue;
    }

    // Validate specific formats
    if (varName === 'EXPO_PUBLIC_SUPABASE_URL') {
      try {
        new URL(value);
      } catch {
        invalid.push(`${varName} (invalid URL format)`);
      }
    }

    if (varName === 'EXPO_PUBLIC_BACKEND_URL') {
      try {
        new URL(value);
      } catch {
        invalid.push(`${varName} (invalid URL format)`);
      }
    }
  }

  // Report errors
  if (missing.length > 0) {
    const error = `
[EnvValidator] Missing required environment variables:
${missing.map((v) => `  - ${v}`).join('\n')}

Please check your .env or .env.local file and ensure all required variables are set.
See .env.example for the required format.
    `.trim();

    console.error(error);
    throw new Error(error);
  }

  if (invalid.length > 0) {
    const error = `
[EnvValidator] Invalid environment variables:
${invalid.map((v) => `  - ${v}`).join('\n')}

Please check your .env or .env.local file and ensure all values are correctly formatted.
    `.trim();

    console.error(error);
    throw new Error(error);
  }

  console.log('[EnvValidator] ✓ All required environment variables are valid');
}

/**
 * Get environment variable with validation
 * Throws error if variable is not set
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;

  if (!value) {
    throw new Error(
      `Environment variable ${key} is not set. Please check your .env or .env.local file.`
    );
  }

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `Environment variable ${key} has an empty value. Please check your .env or .env.local file.`
    );
  }

  return value;
}

/**
 * Safe get - returns null instead of throwing
 */
export function getEnvSafe(key: string, defaultValue?: string): string | null {
  try {
    return getEnv(key, defaultValue);
  } catch {
    return null;
  }
}

/**
 * Get numeric environment variable
 */
export function getEnvNumber(key: string, defaultValue?: number): number {
  const value = getEnv(key);
  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    throw new Error(
      `Environment variable ${key} must be a valid number. Current value: "${value}"`
    );
  }

  return parsed;
}

/**
 * Get boolean environment variable
 */
export function getEnvBoolean(key: string, defaultValue?: boolean): boolean {
  const value = getEnvSafe(key);

  if (!value) {
    return defaultValue ?? false;
  }

  return value.toLowerCase() === 'true' || value === '1' || value === 'yes';
}

/**
 * Check if variable is configured
 */
export function hasEnv(key: string): boolean {
  if (ENV_VALIDATION_CACHE.has(key)) {
    return ENV_VALIDATION_CACHE.get(key) ?? false;
  }

  const value = process.env[key];
  const exists = !!value && typeof value === 'string' && value.trim() !== '';

  ENV_VALIDATION_CACHE.set(key, exists);

  return exists;
}

/**
 * Clear validation cache (useful for testing)
 */
export function clearEnvCache(): void {
  ENV_VALIDATION_CACHE.clear();
  console.log('[EnvValidator] Cache cleared');
}
