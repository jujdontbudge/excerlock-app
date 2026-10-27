import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Runtime } from '../../ports/Runtime';
import type { AuthIdentity } from '../../ports/AuthPort';
import type { Session } from '../../model/types';
import type { AdaptySdkPort, AdaptyProfile, AdaptyFlow } from '../../subscription/adaptySdk';
import { createIdentityServices } from './createIdentityServices';
import { entitlementStore } from '../../subscription/entitlementStore';

export function attachLocalAccessHarness(runtime: Runtime) {
  if (!__DEV__ || process.env.EXPO_PUBLIC_EXCER_LOCAL_ACCESS !== '1') return;
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
  for (const value of [supabaseUrl, apiBaseUrl]) {
    if (!['127.0.0.1', 'localhost'].includes(new URL(value).hostname)) throw new Error('Local access harness requires loopback servers');
  }
  let owner: string | undefined;
  let onProfile: ((profile: AdaptyProfile) => void) | null = null;
  const callbacks: ReturnType<typeof setTimeout>[] = [];
  const profile = () => ({ customerUserId: owner, accessLevels: {} }) as AdaptyProfile;
  const sdk: AdaptySdkPort = {
    activate: async () => undefined,
    setFallback: async () => undefined,
    addEventListener: (_event, callback) => { onProfile = callback; return { remove: () => { onProfile = null; callbacks.forEach(clearTimeout); } }; },
    getProfile: async () => profile(),
    identify: async (id) => { owner = id; callbacks.push(setTimeout(() => onProfile?.(profile()), 2000)); },
    logout: async () => { owner = undefined; },
    getFlow: async () => ({ variationId: 'local-access' }) as AdaptyFlow,
    getPaywallProducts: async () => [],
    logShowFlow: async () => undefined,
    makePurchase: async () => { throw new Error('Local access harness cannot purchase'); },
    restorePurchases: async () => profile(),
    setIntegrationIdentifier: async () => undefined,
    updateProfile: async () => undefined,
  };
  let services: Awaited<ReturnType<typeof createIdentityServices>> | null = null;
  const identityListeners = new Set<(identity: AuthIdentity) => void>();
  const sessionListeners = new Set<(session: Session) => void>();
  const oldStatus = runtime.status;
  let initialized = false;
  let status = { ...oldStatus.snapshot(), loading: true };
  const statusListeners = new Set<() => void>();
  const publishStatus = () => {
    status = { ...oldStatus.snapshot(), loading: !initialized || oldStatus.snapshot().loading };
    statusListeners.forEach((listener) => listener());
  };
  const stopStatus = oldStatus.subscribe(publishStatus);
  const oldAuth = runtime.auth;
  const oldSubscription = runtime.subscription;
  const oldDispose = runtime.dispose;
  let stopIdentity: () => void = () => undefined;
  let stopSession: () => void = () => undefined;
  const ready = oldStatus.ready().then(async () => {
    services = await createIdentityServices({
      config: {
        supabaseUrl,
        supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
        apiBaseUrl,
        googleIosClientId: 'local-access',
        googleRedirectUri: 'excerlock:/oauth',
      },
      adaptyPublicKey: 'local-access',
      reportError: () => undefined,
      beforeDelete: async () => undefined,
      afterDelete: async () => undefined,
      analyticsFactory: () => ({
        track: () => undefined,
        identify: async () => undefined,
        reset: async () => undefined,
        getDistinctId: () => owner ?? 'local-access',
        replayPendingScreens: () => undefined,
        dispose: () => undefined,
      }),
      sdk,
      secureBackend: {
        getItemAsync: (key) => AsyncStorage.getItem(`local-access:${key}`),
        setItemAsync: (key, value) => AsyncStorage.setItem(`local-access:${key}`, value),
        deleteItemAsync: (key) => AsyncStorage.removeItem(`local-access:${key}`),
      },
    });
    stopIdentity = services.auth.subscribeIdentity((identity) => identityListeners.forEach((listener) => listener(identity)));
    stopSession = services.auth.subscribe((session) => sessionListeners.forEach((listener) => listener(session)));
    await services.boot();
    initialized = true;
    publishStatus();
    identityListeners.forEach((listener) => listener(services!.auth.identity()));
    sessionListeners.forEach((listener) => listener(services!.auth.session()));
  });
  runtime.auth = new Proxy(oldAuth, {
    get(_target, key) {
      if (key === 'identity') return () => services?.auth.identity() ?? { kind: 'provisional', userId: null, isAnonymous: true, generation: 0, ready: false };
      if (key === 'session') return () => services?.auth.session() ?? { kind: 'anonymous' };
      if (key === 'subscribeIdentity') return (listener: (identity: AuthIdentity) => void) => { identityListeners.add(listener); return () => identityListeners.delete(listener); };
      if (key === 'subscribe') return (listener: (session: Session) => void) => { sessionListeners.add(listener); return () => sessionListeners.delete(listener); };
      return async (...args: unknown[]) => { await ready; return Reflect.apply(Reflect.get(services!.auth, key), services!.auth, args); };
    },
  });
  runtime.subscription = new Proxy(oldSubscription, {
    get(_target, key) {
      if (key === 'subscribe') return (listener: (entitlement: ReturnType<Runtime['subscription']['entitlement']>) => void) => entitlementStore.subscribe(() => listener(runtime.subscription.entitlement()));
      const target = services?.subscription ?? oldSubscription;
      return (...args: unknown[]) => Reflect.apply(Reflect.get(target, key), target, args);
    },
  });
  runtime.status = {
    ...oldStatus,
    ready: () => ready,
    snapshot: () => status,
    subscribe: (listener) => { statusListeners.add(listener); return () => statusListeners.delete(listener); },
  };
  runtime.dispose = () => { stopStatus(); stopIdentity(); stopSession(); void services?.dispose(); oldDispose(); };
}
