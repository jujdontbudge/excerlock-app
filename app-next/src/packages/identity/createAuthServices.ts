import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseAuthAdapter, type AuthAdapterDeps } from './lib/SupabaseAuthAdapter';
import { IdentityCoordinator, type IdentityCoordinatorDeps } from './lib/identityCoordinator';
import type { AppleNativeDeps } from './lib/providerApple';
import type { GoogleAuthDeps } from './lib/providerGoogle';
import type { AuthIdentity } from '../ports/AuthPort';
import { createIdentityBarrier, type RunIdentityOperation } from './identityBarrier';
import { AuthSdkLifecycle } from './lib/authLifecycle';
import { RuntimeCleanupError } from '../platform/RuntimeSingleton';

export type AuthServiceConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiBaseUrl: string;
  googleIosClientId: string;
  googleRedirectUri: string;
  supabase?: SupabaseClient;
  secureBackend?: import('./lib/secureStorage').SecureStoreBackend;
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
  onAfterDelete: () => Promise<void>;
  beforeAccountSwitch?: () => Promise<void>;
  prepareAccount?: (identity: AuthIdentity) => Promise<void>;
  bootTimeoutMs?: number;
};

export type AuthServices = {
  auth: SupabaseAuthAdapter;
  coordinator: IdentityCoordinator;
  waitForIdentityReady: (options?: { timeoutMs?: number }) => Promise<AuthIdentity>;
  dispose: () => Promise<void>;
  runIdentityOperation: RunIdentityOperation;
};

function defaultAppleDeps(): AppleNativeDeps {
  return {
    signInAsync: async ({ nonce }) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
      const Apple = require('expo-apple-authentication') as typeof import('expo-apple-authentication');
      const credential = await Apple.signInAsync({ nonce });
      return {
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode,
        user: credential.user,
      };
    },
    digestSHA256Hex: async (value) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
      const Crypto = require('expo-crypto') as typeof import('expo-crypto');
      return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
    },
  };
}

function defaultGoogleDeps(clientId: string, redirectUri: string): GoogleAuthDeps {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
  const { buildRealGoogleRequest } = require('./lib/providerGoogle') as typeof import('./lib/providerGoogle');
  return buildRealGoogleRequest(clientId, redirectUri);
}

export async function createAuthServices(config: AuthServiceConfig): Promise<AuthServices> {
  const runIdentityOperation = createIdentityBarrier();
  const sdkLifecycle = new AuthSdkLifecycle();
  const {
    supabaseUrl,
    supabaseAnonKey,
    apiBaseUrl,
    googleIosClientId,
    googleRedirectUri,
    fetchImpl,
    bootTimeoutMs,
  } = config;

  const appleDeps = config.appleDeps ?? defaultAppleDeps();
  const googleDeps = config.googleDeps ?? defaultGoogleDeps(googleIosClientId, googleRedirectUri);
  const ownsSupabase = !config.supabase;
  let supabase = config.supabase;
  if (!supabase) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
    const { createSupabaseClient } = require('./lib/supabaseClient') as typeof import('./lib/supabaseClient');
    supabase = createSupabaseClient({
      supabaseUrl,
      supabaseAnonKey,
      secureBackend: config.secureBackend,
      fetchImpl,
      lock: sdkLifecycle.lock,
    });
  }

  const analyticsIdentify = config.analyticsIdentify;
  const analyticsReset = config.analyticsReset;
  const subscriptionIdentify = config.subscriptionIdentify;
  const subscriptionReset = config.subscriptionReset;
  const getPosthogDistinctId = config.getPosthogDistinctId;
  const setIntegrationIdentifier = config.setIntegrationIdentifier;

  const onAccountSwitchReset = async () => {
    await config.beforeAccountSwitch?.();
    await analyticsReset();
    await subscriptionReset();
  };

  const onBeforeDelete = config.onBeforeDelete;
  const onAfterDelete = config.onAfterDelete;

  const adapterDeps: AuthAdapterDeps = {
    supabase,
    appleDeps,
    googleDeps,
    apiBaseUrl,
    fetchImpl,
    onBeforeDelete,
    onAfterDelete,
    onAccountSwitchReset,
    bootTimeoutMs,
    runIdentityOperation,
    runSdk: (operation) => sdkLifecycle.run(operation),
  };
  let auth!: SupabaseAuthAdapter;
  let coordinator: IdentityCoordinator | undefined;
  const disposeSdk = async (): Promise<void> => {
    const failures: unknown[] = [];
    if (!ownsSupabase) {
      await sdkLifecycle.drainCalls();
      return;
    }
    const sdkAuth = supabase.auth as typeof supabase.auth & {
      initialize?: () => Promise<unknown>; stopAutoRefresh?: () => Promise<unknown>; dispose?: () => Promise<unknown>;
    };
    const attempt = async (operation: (() => Promise<unknown>) | undefined) => {
      if (!operation) { if (ownsSupabase) failures.push(new Error('Owned Supabase auth client is missing a required lifecycle method')); return; }
      try { await operation(); } catch (error) { failures.push(error); }
    };
    await attempt(sdkAuth.initialize?.bind(sdkAuth));
    await attempt(sdkAuth.stopAutoRefresh?.bind(sdkAuth));
    await attempt(() => sdkLifecycle.drainCalls());
    sdkLifecycle.closeLocks();
    await attempt(() => sdkLifecycle.drainLocks());
    await attempt(sdkAuth.dispose?.bind(sdkAuth));
    if (failures.length) throw new RuntimeCleanupError(failures);
  };
  try {
    auth = new SupabaseAuthAdapter(adapterDeps);

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

  coordinator = new IdentityCoordinator({
    getIdentity: () => auth.identity(),
    subscribeIdentity: (cb) => auth.subscribeIdentity(cb),
    getAuthContext: () => auth.getAuthContext(),
    putUser,
    analyticsIdentify,
    subscriptionIdentify,
    attachIntegration,
    prepareAccount: config.prepareAccount,
    onTombstone: async () => {
      await auth.handleTombstone();
    },
    onReady: (identity) => {
      auth.markReady(identity.userId as string, identity.generation);
    },
    runIdentityOperation,
  });

  coordinator.start();

  const recoverIdentity = async (): Promise<void> => {
    if (auth.identity().kind === 'provisional') await auth.retryBoot();
    for (let attempt = 0; attempt < 2 && auth.identity().kind === 'canonical' && !coordinator!.isReady(); attempt += 1)
      await coordinator!.retry();
  };
  const waitForIdentityReady: AuthServices['waitForIdentityReady'] = (options) => {
    const ready = coordinator!.waitForIdentityReady(options);
    void recoverIdentity().catch(() => undefined);
    return ready;
  };

  let disposal: Promise<void> | null = null;
  const dispose = (): Promise<void> => {
    if (disposal) return disposal;
    sdkLifecycle.closeCalls();
    disposal = (async () => {
      const failures: unknown[] = [];
      try { coordinator!.dispose(); } catch (error) { failures.push(error); }
      try { auth.beginDispose(); } catch (error) { failures.push(error); }
      try { await disposeSdk(); } catch (error) {
        if (error instanceof RuntimeCleanupError) failures.push(...error.failures);
        else failures.push(error);
      }
      if (failures.length) throw new RuntimeCleanupError(failures);
    })();
    return disposal;
  };

  return {
    auth,
    coordinator: coordinator!,
    waitForIdentityReady,
    runIdentityOperation,
    dispose,
  };
  } catch (error) {
    sdkLifecycle.closeCalls();
    const failures: unknown[] = [];
    try { coordinator?.dispose(); } catch (cleanupError) { failures.push(cleanupError); }
    try { auth?.beginDispose(); } catch (cleanupError) { failures.push(cleanupError); }
    try { await disposeSdk(); } catch (cleanupError) {
      if (cleanupError instanceof RuntimeCleanupError) failures.push(...cleanupError.failures);
      else failures.push(cleanupError);
    }
    if (failures.length) throw new RuntimeCleanupError([error, ...failures]);
    throw error;
  }
}

export { resolveSignInRequired, type SignInRequiredSource } from './lib/signInRequired';
