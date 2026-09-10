import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SecureSupabaseStorage, SUPABASE_STORAGE_KEY } from './secureStorage';
import type { SecureStoreBackend } from './secureStorage';

export type SupabaseClientConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  storageKey?: string;
  secureBackend?: SecureStoreBackend;
  fetchImpl?: typeof fetch;
};

/**
 * Real Supabase client for the ExcerLock app.
 *
 * - Tokens persist ONLY in SecureStore via SecureSupabaseStorage (chunked for
 *   large serialized sessions). Never AsyncStorage, never Zustand.
 * - autoRefreshToken is on; the root must register AppState foreground refresh
 *   (see README root wiring). detectSessionInUrl is off (native, no URL).
 * - flowType pkce for email OTP + updateUser email_change.
 */
export function createSupabaseClient(config: SupabaseClientConfig): SupabaseClient {
  const { supabaseUrl, supabaseAnonKey, storageKey = SUPABASE_STORAGE_KEY, secureBackend, fetchImpl } = config;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase client requires supabaseUrl and supabaseAnonKey (clientAuth contract)');
  }
  const storage = new SecureSupabaseStorage(secureBackend);
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage,
      storageKey,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
    global: fetchImpl ? { fetch: fetchImpl as typeof fetch } : undefined,
  });
}

export type { SupabaseClient };
