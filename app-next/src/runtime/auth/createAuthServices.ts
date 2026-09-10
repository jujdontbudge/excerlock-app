import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseAuthAdapter, type AuthAdapterDeps } from './SupabaseAuthAdapter';
import { IdentityCoordinator, type IdentityCoordinatorDeps } from './identityCoordinator';
import type { AppleNativeDeps } from './providerApple';
import type { GoogleAuthDeps } from './providerGoogle';
import type { AuthIdentity } from '../../ports/AuthPort';

export type AuthServiceConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiBaseUrl: string;
  googleIosClientId: string;
  googleRedirectUri: string;
  supabase?: SupabaseClient;
  secureBackend?: import('./secureStorage').SecureStoreBackend;
  fetchImpl?: typeof fetch;
  appleDeps?: AppleNativeDeps;
  googleDeps?: GoogleAuthDeps;
  analyticsIdentify: (userId: string) => Promise<void>;
  analyticsReset: () => Promise<void>;
  subscriptionIdentify: (userId: string) => Promise<void>;
  subscriptionReset: () => Promise<void>;
  getPosthogDistinctId: () => string | null;
  setIntegrationIdentifier: (key: string, value: string) => Promise<void>;
  onBeforeDelete: () => Promise<void>;
  bootTimeoutMs?: number;
};

export type AuthServices = {
  auth: SupabaseAuthAdapter;
  coordinator: IdentityCoordinator;
  /** SAME gate T05 must await before every purchase/restore. */
  waitForIdentityReady: (options?: { timeoutMs?: number }) => Promise<AuthIdentity>;
  dispose: () => void;
};

function defaultAppleDeps(): AppleNativeDeps {
  return {
    signInAsync: async ({ nonce }) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Apple = require('expo-apple-authentication') as typeof import('expo-apple-authentication');
      const credential = await Apple.signInAsync({ nonce });
      return {
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode,
        user: credential.user,
      };
    },
    digestSHA256Hex: async (value) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Crypto = require('expo-crypto') as typeof import('expo-crypto');
      return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
    },
  };
}

function defaultGoogleDeps(clientId: string, redirectUri: string): GoogleAuthDeps {
  // Lazy to keep Jest without native modules working when injected mocks are used.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { buildRealGoogleRequest } = require('./providerGoogle') as typeof import('./providerGoogle');
  return buildRealGoogleRequest(clientId, redirectUri);
}

/**
 * Factory the root composition uses to create the real auth spine.
 * Injects SDK + HTTP dependencies for deterministic tests; the root provides
 * the real PostHog/Adapty/fetch/SecureStore/Google redirect implementations.
 * Does NOT integrate into createRuntime/FakeRuntime; see README root wiring.
 */
export function createAuthServices(config: AuthServiceConfig): AuthServices {
  const {
    supabaseUrl,
    supabaseAnonKey,
    apiBaseUrl,
    googleIosClientId,
    googleRedirectUri,
    fetchImpl,
    bootTimeoutMs,
  } = config;

  let supabase = config.supabase;
  if (!supabase) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createSupabaseClient } = require('./supabaseClient') as typeof import('./supabaseClient');
    supabase = createSupabaseClient({
      supabaseUrl,
      supabaseAnonKey,
      secureBackend: config.secureBackend,
      fetchImpl,
    });
  }

  const appleDeps = config.appleDeps ?? defaultAppleDeps();
  const googleDeps = config.googleDeps ?? defaultGoogleDeps(googleIosClientId, googleRedirectUri);

  const analyticsIdentify = config.analyticsIdentify;
  const analyticsReset = config.analyticsReset;
  const subscriptionIdentify = config.subscriptionIdentify;
  const subscriptionReset = config.subscriptionReset;
  const getPosthogDistinctId = config.getPosthogDistinctId;
  const setIntegrationIdentifier = config.setIntegrationIdentifier;

  const onAccountSwitchReset = async () => {
    await analyticsReset();
    await subscriptionReset();
  };

  const onBeforeDelete = config.onBeforeDelete;

  const adapterDeps: AuthAdapterDeps = {
    supabase,
    appleDeps,
    googleDeps,
    apiBaseUrl,
    fetchImpl,
    onBeforeDelete,
    onAccountSwitchReset,
    bootTimeoutMs,
  };
  const auth = new SupabaseAuthAdapter(adapterDeps);

  const putUser: IdentityCoordinatorDeps['putUser'] = async ({ accessToken, userId }) => {
    void userId;
    const impl = fetchImpl ?? fetch;
    const response = await impl(`${apiBaseUrl.replace(/\/$/, '')}/v1/user`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    return { status: response.status };
  };

  const attachIntegration = async (userId: string) => {
    void userId;
    const distinctId = getPosthogDistinctId();
    if (!distinctId) throw new Error('PostHog distinct ID unavailable; identity spine remains unready');
    await setIntegrationIdentifier('posthog_distinct_user_id', distinctId);
  };

  const coordinator = new IdentityCoordinator({
    getIdentity: () => auth.identity(),
    subscribeIdentity: (cb) => auth.subscribeIdentity(cb),
    getAccessToken: () => auth.getAccessToken(),
    putUser,
    analyticsIdentify,
    subscriptionIdentify,
    attachIntegration,
    onTombstone: async () => {
      await auth.handleTombstone();
    },
    onReady: (identity) => {
      auth.markReady(identity.userId as string, identity.generation);
    },
  });

  coordinator.start();

  return {
    auth,
    coordinator,
    waitForIdentityReady: (options) => coordinator.waitForIdentityReady(options),
    dispose: () => {
      coordinator.dispose();
      auth.dispose();
    },
  };
}

/** Root hook requirements (no second PostHog client here). See README. */
export type SignInRequiredSource = boolean | (() => boolean) | (() => Promise<boolean>);
export function resolveSignInRequired(source: SignInRequiredSource | undefined, fallback = false): boolean | Promise<boolean> {
  if (source === undefined) return fallback;
  if (typeof source === 'boolean') return source;
  return source();
}
