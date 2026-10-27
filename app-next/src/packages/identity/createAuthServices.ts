import type { SupabaseClient, Session as SupabaseSession } from '@supabase/supabase-js';
import { SupabaseAuthAdapter, type AccountSwitch, type AuthAdapterDeps } from './lib/SupabaseAuthAdapter';

import { startIdentitySync } from './lib/identitySync';
import type { AppleNativeDeps } from './lib/providerApple';
import type { GoogleAuthDeps } from './lib/providerGoogle';
import type { AuthIdentity } from '../ports/AuthPort';
import { createIdentityBarrier, type RunIdentityOperation } from './identityBarrier';
import { AuthSdkLifecycle } from './lib/authLifecycle';
import { RuntimeCleanupError } from '../platform/RuntimeSingleton';

export type { AccountSwitch };

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
  reportError?: (error: unknown) => void;
  onBeforeDelete: () => Promise<void>;
  onAfterDelete: () => Promise<void>;
  beforeAccountSwitch?: (options: AccountSwitch) => Promise<void>;
  prepareAccount?: (identity: AuthIdentity) => Promise<void>;
  bootTimeoutMs?: number;
};

export type AuthServices = {
  auth: SupabaseAuthAdapter;
  waitForIdentityReady: (options?: { timeoutMs?: number }) => Promise<AuthIdentity>;
  dispose: () => Promise<void>;
  runIdentityOperation: RunIdentityOperation;
};

function defaultAppleDeps(): AppleNativeDeps {
  return {
    signInAsync: async ({ nonce }) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
      const Apple = require('expo-apple-authentication') as typeof import('expo-apple-authentication');
      const credential = await Apple.signInAsync({ nonce, requestedScopes: [Apple.AppleAuthenticationScope.EMAIL] });
      return {
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode,
        user: credential.user,
      };
    },
    randomNonce: () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
      const Crypto = require('expo-crypto') as typeof import('expo-crypto');
      return Array.from(Crypto.getRandomBytes(32), (byte) => byte.toString(16).padStart(2, '0')).join('');
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

function storedSessionReader(backend: AuthServiceConfig['secureBackend']) {
  return async (): Promise<SupabaseSession | null> => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
    const { SecureSupabaseStorage, SUPABASE_STORAGE_KEY } = require('./lib/secureStorage') as typeof import('./lib/secureStorage');
    const raw = await new SecureSupabaseStorage(backend).getItem(SUPABASE_STORAGE_KEY);
    const session = raw ? (JSON.parse(raw) as SupabaseSession) : null;
    return session?.user?.id ? session : null;
  };
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

  const onAccountSwitchReset = async (options: AccountSwitch) => {
    await config.beforeAccountSwitch?.(options);
    await analyticsReset();
    await subscriptionReset();
  };

  const onBeforeDelete = config.onBeforeDelete;
  const onAfterDelete = config.onAfterDelete;

  let waitForIdentityReady!: AuthServices['waitForIdentityReady'];
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
    readStoredSession: ownsSupabase ? storedSessionReader(config.secureBackend) : undefined,
    waitForReady: (options) => waitForIdentityReady(options),
  };
  let auth!: SupabaseAuthAdapter;
  let sync: ReturnType<typeof startIdentitySync> | undefined;
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

  const reportError = (error: unknown) => config.reportError?.(error);
  const putUser = async (accessToken: string) => {
    const impl = fetchImpl ?? fetch;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await impl(`${apiBaseUrl.replace(/\/$/, '')}/v1/user`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: controller.signal,
      });
      return response.status;
    } finally {
      clearTimeout(timeout);
    }
  };

  const attachIntegration = async () => {
    const distinctId = getPosthogDistinctId();
    if (!distinctId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        setIntegrationIdentifier('posthog_distinct_user_id', distinctId),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Adapty attribution timed out')), 3000); }),
      ]);
    } catch (error) {
      reportError(error);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  sync = startIdentitySync({
    getIdentity: () => auth.identity(),
    subscribeIdentity: (cb) => auth.subscribeIdentity(cb),
    prepareAccount: config.prepareAccount,
    subscriptionIdentify,
    markReady: (identity) => auth.markReady(identity.userId!, identity.generation),
    afterReady: async (identity) => {
      await analyticsIdentify(identity.userId!).catch(reportError);
      await attachIntegration();
      const context = await auth.getAuthContext();
      if (!context || context.userId !== identity.userId) return;
      const status = await putUser(context.accessToken);
      if (status === 410) await auth.handleTombstone();
      else if (status < 200 || status >= 300) reportError(new Error(`PUT /v1/user answered ${status}`));
    },
    runIdentityOperation,
    reportError,
  });

  waitForIdentityReady = async (options) => {
    if (auth.identity().kind === 'provisional') await auth.retryBoot().catch(reportError);
    return sync!.waitForReady(options?.timeoutMs);
  };

  let disposal: Promise<void> | null = null;
  const dispose = (): Promise<void> => {
    if (disposal) return disposal;
    sdkLifecycle.closeCalls();
    disposal = (async () => {
      const failures: unknown[] = [];
      try { sync!.dispose(); } catch (error) { failures.push(error); }
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
    waitForIdentityReady,
    runIdentityOperation,
    dispose,
  };
  } catch (error) {
    sdkLifecycle.closeCalls();
    const failures: unknown[] = [];
    try { sync?.dispose(); } catch (cleanupError) { failures.push(cleanupError); }
    try { auth?.beginDispose(); } catch (cleanupError) { failures.push(cleanupError); }
    try { await disposeSdk(); } catch (cleanupError) {
      if (cleanupError instanceof RuntimeCleanupError) failures.push(...cleanupError.failures);
      else failures.push(cleanupError);
    }
    if (failures.length) throw new RuntimeCleanupError([error, ...failures]);
    throw error;
  }
}

