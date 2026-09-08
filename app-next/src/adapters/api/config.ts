import Constants from 'expo-constants';

export const DEFAULT_API_BASE_URL = 'https://api.excerlock.com';

/**
 * The VPS base URL. `app.json` `extra.apiBaseUrl` wins (EAS profiles set it), then the public env
 * var for local runs against a dev server, then production.
 */
export function apiBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as { apiBaseUrl?: unknown } | undefined;
  if (typeof extra?.apiBaseUrl === 'string' && extra.apiBaseUrl) return extra.apiBaseUrl;
  return process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
}
