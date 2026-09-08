import Constants from 'expo-constants';

export const DEFAULT_API_BASE_URL = 'https://api.excerlock.com';

type ConfiguredExtra = { clientAuth?: { apiBaseUrl?: unknown } };

/**
 * The VPS base URL. `app.config.ts` publishes `extra.clientAuth.apiBaseUrl` from
 * `EXPO_PUBLIC_API_URL` (EAS profiles set it), then the same public env var for a local run against
 * a dev server, then production. One name, because two would let a build talk to two servers.
 */
export function apiBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as ConfiguredExtra | undefined;
  const configured = extra?.clientAuth?.apiBaseUrl;
  if (typeof configured === 'string' && configured.trim()) return configured.trim().replace(/\/+$/, '');
  return (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
}
