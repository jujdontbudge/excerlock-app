import { createClient, processLock } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { secureSessionStorage } from './secureSessionStorage';
import { SupabaseAuthApi } from './supabaseAuthApi';

/**
 * Everything the auth module needs from the build. `app.config.ts` fills it from the environment or
 * `~/.excerlock/env`; a build with no Supabase keys reports `null` and the app stays local-only
 * rather than crashing, which is how the old app handled a keyless Clerk build.
 */
export type AuthConfig = {
  url: string;
  key: string;
  apiBaseUrl: string;
  googleWebClientId?: string;
  googleIosClientId?: string;
};

const DEFAULT_API_BASE_URL = 'https://api.excerlock.com';

type ConfiguredExtra = {
  supabaseUrl?: string;
  supabaseKey?: string;
  apiBaseUrl?: string;
  googleWebClientId?: string;
  googleIosClientId?: string;
};

export function authConfig(): AuthConfig | null {
  const extra = (Constants.expoConfig?.extra?.clientAuth ?? {}) as ConfiguredExtra;
  const url = extra.supabaseUrl?.trim();
  const key = extra.supabaseKey?.trim();
  if (!url || !key) return null;
  return {
    url,
    key,
    apiBaseUrl: (extra.apiBaseUrl?.trim() || DEFAULT_API_BASE_URL).replace(/\/$/, ''),
    googleWebClientId: extra.googleWebClientId?.trim() || undefined,
    googleIosClientId: extra.googleIosClientId?.trim() || undefined,
  };
}

/**
 * The one place supabase-js is constructed. The assignment to `SupabaseAuthApi` is the seam: if the
 * SDK's shape moves, this file fails to compile instead of the adapter failing on a device.
 */
export function createSupabaseAuthApi(config: AuthConfig): SupabaseAuthApi {
  const client = createClient(config.url, config.key, {
    auth: {
      storage: secureSessionStorage(),
      // The app refreshes on foreground and there is no browser to read a session out of a URL.
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // React Native has no Web Locks API; processLock keeps concurrent refreshes off each other.
      lock: processLock,
    },
  });
  return client.auth;
}
