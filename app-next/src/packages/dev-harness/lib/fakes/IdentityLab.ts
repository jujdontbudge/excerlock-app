import { createAuthServices, type AuthServiceConfig, type AuthServices } from '../../../identity/createAuthServices';
import { AdaptySubscriptionAdapter } from '../../../subscription/AdaptySubscriptionAdapter';
import type { AdaptyFlow, AdaptyPaywallProduct, AdaptyProfile, AdaptyPurchaseResult, AdaptySdkPort } from '../../../subscription/adaptySdk';
import type { AuthIdentity, AuthPort } from '../../../ports/AuthPort';
import type { SubscriptionPort } from '../../../ports/SubscriptionPort';
import type { IdentityLabScript } from '../../../model/models';
import { FakeContext } from '../FakeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PurchaseRecoveryJournal } from '../../../subscription/PurchaseRecoveryJournal';

const SLOW_USER_SYNC_MS = 8000;
const LAB_URL = 'https://identity-lab.invalid';
const ANONYMOUS_DISTINCT_ID = 'lab-anonymous-distinct-id';

type LabUser = { id: string; is_anonymous: boolean; identities: { provider: string }[]; app_metadata: Record<string, string> };
type LabSession = { access_token: string; refresh_token: string; user: LabUser };
type LabSupabase = NonNullable<AuthServiceConfig['supabase']>;
type LabAppleDeps = NonNullable<AuthServiceConfig['appleDeps']>;
type LabGoogleDeps = NonNullable<AuthServiceConfig['googleDeps']>;

export type IdentityLab = {
  auth: AuthPort;
  subscription: SubscriptionPort;
  booted: Promise<void>;
  runDelayedCallbackIsolation(): Promise<{
    identity: string;
    entitlement: string;
    recovery: string;
    queued: number;
    delivered: number;
  }>;
  runDeletionCallbackIsolation(seedDeletedAccount: () => Promise<void>): Promise<{
    identity: string;
    deletedIdentity: string;
    entitlement: string;
    recovery: string;
    queued: number;
    delivered: number;
    tombstonePreserved: boolean;
  }>;
  runEstablishedTransfer(
    seedAccount: (account: 'A' | 'B') => Promise<void>,
    accountCheckpoint: () => string,
    verifyCurrent: () => Promise<string>,
  ): Promise<{
    source: string;
    beforeTransfer: string;
    afterFailure: string;
    afterTransfer: string;
    afterRepeat: string;
    sourceAfterTransfer: string;
    targetAfterReturn: string;
    sourceData: string;
    targetData: string;
    restores: number;
    transfers: number;
  }>;
  dispose(): Promise<void>;
};

export type IdentityLabAccountHooks = {
  beforeAccountSwitch(): Promise<void>;
  prepareAccount(identity: AuthIdentity): Promise<void>;
  afterDelete(): Promise<void>;
  seedAccount?(account: 'A' | 'B'): Promise<void>;
  accountCheckpoint?(): string;
};

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

function labProduct(vendorProductId: string, title: string, amount: number, unit: 'year' | 'month'): AdaptyPaywallProduct {
  return {
    variationId: 'identity-lab',
    vendorProductId,
    localizedTitle: title,
    localizedDescription: '',
    price: { amount, currencyCode: 'USD', localizedString: `$${amount.toFixed(2)}` },
    subscription: {
      subscriptionPeriod: { unit, numberOfUnits: 1 },
      localizedSubscriptionPeriod: unit,
      offer: { phases: [{ paymentMode: 'free_trial', numberOfPeriods: 1, subscriptionPeriod: { unit: 'week', numberOfUnits: 1 } }] },
    },
  } as unknown as AdaptyPaywallProduct;
}

export async function createIdentityLab(
  ctx: FakeContext,
  script: IdentityLabScript,
  accountHooks?: IdentityLabAccountHooks,
): Promise<IdentityLab> {
  const attempts = { anonymous: 0, userSync: 0, flow: 0, purchase: 0, restore: 0, link: 0, sessionRestore: 0 };
  const ownership = new Map<string, 'trial' | 'active'>();
  const tombstones = new Set<string>();
  const queuedProfiles: { operation: 'purchase' | 'restore'; owner: string; profile: AdaptyProfile }[] = [];
  let storeOwner: string | null = null;
  let transfers = 0;
  let deliveredProfiles = 0;
  let users = 0;
  let stored: LabSession | null = null;
  let distinctId = ANONYMOUS_DISTINCT_ID;
  let customerUserId: string | undefined;
  let profileListener: ((profile: AdaptyProfile) => void) | null = null;
  let services: AuthServices | undefined;
  const providerUsers = new Map<string, LabUser>();
  const usersById = new Map<string, LabUser>();

  const networkError = (text: string) => Object.assign(new Error(text), { status: 0 });
  const newUser = (provider?: string): LabUser => {
    const existing = provider ? providerUsers.get(provider) : undefined;
    if (existing) return existing;
    users += 1;
    const user: LabUser = {
      id: provider === 'apple' ? 'lab-user-a' : provider === 'google' ? 'lab-user-b' : `lab-checkout-${users}`,
      is_anonymous: !provider,
      identities: provider ? [{ provider }] : [],
      app_metadata: provider ? { provider } : {} as Record<string, string>,
    };
    if (provider) providerUsers.set(provider, user);
    usersById.set(user.id, user);
    return user;
  };
  const signedIn = (user: LabUser) => {
    stored = { access_token: `lab-token-${user.id}`, refresh_token: `lab-refresh-${user.id}`, user };
    return { data: { user, session: stored }, error: null };
  };
  const unscripted = async () => ({ data: { user: null, session: null }, error: networkError('Not scripted in the identity lab') });

  const supabase = {
    auth: {
      getSession: async () => ({ data: { session: stored }, error: null }),
      signInAnonymously: async () => {
        attempts.anonymous += 1;
        const ok = !(script.anonymousSignIn === 'failFirst' && attempts.anonymous === 1);
        ctx.log('lab_anonymous_sign_in', { attempt: attempts.anonymous, ok });
        return ok ? signedIn(newUser()) : { data: { user: null, session: null }, error: networkError('Network request failed') };
      },
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
      signOut: async () => {
        stored = null;
        return { error: null };
      },
      setSession: async ({ access_token }: { access_token: string }) => {
        const userId = access_token.replace(/^lab-token-/, '');
        const user = usersById.get(userId);
        if (!user) return { data: { user: null, session: null }, error: networkError('Saved session unavailable') };
        attempts.sessionRestore += 1;
        const result = signedIn(user);
        ctx.log('lab_session_restored', { user: user.id });
        updateSubscriptionLab();
        return result;
      },
      linkIdentity: async ({ provider }: { provider: string }) => {
        attempts.link += 1;
        const result = script.appleLink ?? 'ok';
        ctx.log('lab_link_identity', { provider, result });
        if (result === 'conflict' || !stored)
          return { data: { user: null, session: null }, error: Object.assign(new Error('Identity is already linked to another user'), { status: 422 }) };
        return signedIn({ ...stored.user, is_anonymous: false, identities: [{ provider }], app_metadata: { provider } });
      },
      signInWithIdToken: async ({ provider }: { provider: string }) => {
        const result = signedIn(newUser(provider));
        ctx.log('lab_recovered_account', { provider, user: result.data.user.id });
        return result;
      },
      signInWithOtp: unscripted,
      verifyOtp: unscripted,
      updateUser: unscripted,
    },
  } as unknown as LabSupabase;

  const fetchImpl = (async (_input: unknown, init?: { method?: string }) => {
    if (init?.method === 'DELETE') {
      if (stored?.user.id) tombstones.add(stored.user.id);
      ctx.log('lab_account_deleted', { user: stored?.user.id ?? 'none' });
      return { status: 204 };
    }
    if (init?.method !== 'PUT') return { status: 204 };
    attempts.userSync += 1;
    const attempt = attempts.userSync;
    if (stored?.user.id && tombstones.has(stored.user.id)) {
      ctx.log('lab_user_sync', { attempt, result: 410 });
      return { status: 410 };
    }
    if (script.userSync === 'failFirst' && attempt === 1) {
      ctx.log('lab_user_sync', { attempt, result: 'network_error' });
      throw new TypeError('Network request failed');
    }
    if (script.userSync === 'slow') await new Promise((resolve) => setTimeout(resolve, SLOW_USER_SYNC_MS));
    ctx.log('lab_user_sync', { attempt, result: 204 });
    return { status: 204 };
  }) as unknown as typeof fetch;

  const appleDeps: LabAppleDeps = {
    signInAsync: async () => ({ identityToken: 'lab-apple-identity-token', authorizationCode: null, user: 'lab-apple-user' }),
    digestSHA256Hex: async (value) => `lab-sha256-${value.length}`,
    randomNonce: () => 'lab-nonce',
  };
  const googleDeps: LabGoogleDeps = {
    clientId: 'identity-lab',
    redirectUri: 'identity-lab:/oauth',
    buildRequest: () => ({
      promptAsync: async () => script.googleSignIn === 'success'
        ? { type: 'success', params: { code: 'lab-google-code' } }
        : { type: 'cancel' },
      codeVerifier: 'lab-google-verifier',
    }),
    exchangeCode: async () => ({ idToken: 'lab-google-id-token', accessToken: 'lab-google-access-token' }),
  };

  const updateSubscriptionLab = () => ctx.update({
    subscriptionLab: {
      purchases: attempts.purchase,
      restores: attempts.restore,
      queued: queuedProfiles.length,
      delivered: deliveredProfiles,
      callbackIsolation: ctx.snapshot().subscriptionLab?.callbackIsolation,
      deletionIsolation: ctx.snapshot().subscriptionLab?.deletionIsolation,
      transferIsolation: ctx.snapshot().subscriptionLab?.transferIsolation,
      providerConflict: script.establishedProviderConflict
        ? `B preserved Apple owner lab-user-a links ${attempts.link} session restores ${attempts.sessionRestore} Entitlement ${adapter?.entitlement().status ?? 'none'} data ${accountHooks?.accountCheckpoint?.() ?? 'unavailable'}`
        : ctx.snapshot().subscriptionLab?.providerConflict,
    },
  });
  const profile = (owner = customerUserId): AdaptyProfile => {
    const status = owner ? ownership.get(owner) : undefined;
    const days = status === 'trial' ? 7 : 30;
    return {
      customerUserId: owner,
      accessLevels: status
        ? {
            premium: {
              isActive: true,
              activeIntroductoryOfferType: status === 'trial' ? 'free_trial' : undefined,
              expiresAt: new Date(Date.parse(ctx.clock.now()) + days * 86_400_000),
              willRenew: true,
            },
          }
        : {},
    } as unknown as AdaptyProfile;
  };
  const sdk: AdaptySdkPort = {
    activate: async () => undefined,
    setFallback: async () => undefined,
    addEventListener: (_event, callback) => {
      profileListener = callback;
      return { remove: () => { profileListener = null; } };
    },
    getProfile: async () => profile(),
    identify: async (userId) => {
      customerUserId = userId;
      ctx.log('lab_adapty_identify', { user: userId });
      setTimeout(() => profileListener?.(profile()), 0);
    },
    logout: async () => {
      customerUserId = undefined;
    },
    getFlow: async (placement) => {
      attempts.flow += 1;
      const ok = !(script.plans === 'failFirst' && attempts.flow === 1);
      ctx.log('lab_flow', { placement, attempt: attempts.flow, ok });
      if (!ok) throw networkError('Flow request failed');
      return { placementId: placement, variationId: `identity-lab-${placement}`, remoteConfigs: [] } as unknown as AdaptyFlow;
    },
    getPaywallProducts: async () =>
      script.plans === 'empty' ? [] : [labProduct('lab.annual', 'Lab annual', 49.99, 'year'), labProduct('lab.monthly', 'Lab monthly', 9.99, 'month')],
    logShowFlow: async () => undefined,
    makePurchase: async () => {
      attempts.purchase += 1;
      const result = script.purchase ?? ctx.snapshot().outcome;
      const owner = customerUserId;
      ctx.log('lab_purchase', { result, owner });
      if (result === 'error') throw networkError('Purchase failed');
      if (result === 'cancel') return { type: 'user_cancelled' } as AdaptyPurchaseResult;
      if (result === 'pending') return { type: 'pending' } as AdaptyPurchaseResult;
      if (!owner) throw new Error('Purchase owner unavailable');
      ownership.set(owner, 'trial');
      storeOwner = owner;
      const purchased = profile(owner);
      if (script.delayedCallbacks) {
        queuedProfiles.push({ operation: 'purchase', owner, profile: purchased });
        updateSubscriptionLab();
        return { type: 'pending' } as AdaptyPurchaseResult;
      }
      updateSubscriptionLab();
      return { type: 'success', profile: purchased } as unknown as AdaptyPurchaseResult;
    },
    restorePurchases: async () => {
      attempts.restore += 1;
      const result = script.restore ?? ctx.snapshot().restoreOutcome;
      const owner = customerUserId;
      ctx.log('lab_restore', { result, owner });
      if (script.establishedTransfer && attempts.restore === 1) throw networkError('Restore reconciliation unavailable');
      if (result === 'restored' && owner) {
        if (script.establishedTransfer && storeOwner && storeOwner !== owner) {
          ownership.delete(storeOwner);
          transfers += 1;
        }
        ownership.set(owner, 'active');
        storeOwner = owner;
      }
      const restored = profile(owner);
      if (script.delayedCallbacks && owner) queuedProfiles.push({ operation: 'restore', owner, profile: restored });
      updateSubscriptionLab();
      return restored;
    },
    setIntegrationIdentifier: async () => undefined,
  };

  const provisional: AuthIdentity = { kind: 'provisional', userId: null, isAnonymous: true, generation: 0, ready: false };
  const adapter = new AdaptySubscriptionAdapter({
    sdk,
    publicSdkKey: 'identity-lab',
    getIdentity: () => services?.auth.identity() ?? provisional,
    waitForIdentityReady: () => {
      if (!services) throw new Error('Identity lab not started');
      return services.waitForIdentityReady();
    },
    runIdentityOperation: (operation) => {
      if (!services) throw new Error('Identity lab not started');
      return services.runIdentityOperation(operation);
    },
    getPosthogDistinctId: () => distinctId,
    reportError: (error) => ctx.log('lab_adapter_error', { message: message(error) }),
    openSubscriptionManagement: async () => undefined,
    recoveryJournal: new PurchaseRecoveryJournal(AsyncStorage),
    now: () => ctx.clock.now(),
  });
  services = await createAuthServices({
    supabaseUrl: LAB_URL,
    supabaseAnonKey: 'identity-lab',
    apiBaseUrl: LAB_URL,
    googleIosClientId: 'identity-lab',
    googleRedirectUri: 'identity-lab:/oauth',
    supabase,
    fetchImpl,
    appleDeps,
    googleDeps,
    analyticsIdentify: async (id) => {
      distinctId = id;
    },
    analyticsReset: async () => {
      distinctId = ANONYMOUS_DISTINCT_ID;
    },
    subscriptionIdentify: (id) => adapter.identify(id),
    subscriptionReset: () => adapter.reset(),
    getPosthogDistinctId: () => distinctId,
    setIntegrationIdentifier: (key, value) => sdk.setIntegrationIdentifier(key, value),
    onBeforeDelete: async () => undefined,
    onAfterDelete: accountHooks?.afterDelete ?? (async () => undefined),
    beforeAccountSwitch: accountHooks?.beforeAccountSwitch,
    prepareAccount: accountHooks?.prepareAccount,
  });
  const auth = services.auth;
  const subscription: SubscriptionPort = {
    entitlement: () => adapter.entitlement(),
    presentPaywall: () => adapter.presentPaywall(),
    restore: () => adapter.restore(),
    identify: (id) => adapter.identify(id),
    reset: () => adapter.reset(),
    refresh: () => adapter.refresh(),
    loadPaywall: async (placement) => {
      try {
        const paywall = await adapter.loadPaywall(placement);
        ctx.log('lab_plans_loaded', { placement, plans: paywall.products.length });
        return paywall;
      } catch (error) {
        ctx.log('lab_plans_failed', { placement, message: message(error) });
        throw error;
      }
    },
    logPaywallShown: (generation) => adapter.logPaywallShown(generation),
    purchase: async (handle) => {
      const result = await adapter.purchase(handle);
      ctx.log('lab_purchase_recovery', { state: adapter.recovery().type });
      return result;
    },
    operation: () => adapter.operation(),
    recovery: () => adapter.recovery(),
    recoveryReady: () => adapter.recoveryReady(),
    clearRecovery: () => adapter.clearRecovery(),
    subscribeRecovery: (callback) => adapter.subscribeRecovery(callback),
    manageSubscription: () => adapter.manageSubscription(),
    subscribe: (callback) => adapter.subscribe(callback),
  };
  const booted = auth.boot().then(async () => {
    if (!script.establishedProviderConflict) return;
    await auth.recoverWithApple();
    await services?.waitForIdentityReady();
    await accountHooks?.seedAccount?.('A');
    await auth.recoverWithGoogle();
    await services?.waitForIdentityReady();
    await accountHooks?.seedAccount?.('B');
    updateSubscriptionLab();
  });
  return {
    auth,
    subscription,
    booted: booted.then(
      () => undefined,
      () => undefined,
    ),
    runDelayedCallbackIsolation: async () => {
      const paywall = await adapter.loadPaywall('onboarding');
      const purchase = await adapter.purchase(paywall.products[0]!.handle);
      if (purchase.type !== 'pending') throw new Error('Delayed purchase did not remain pending');
      await auth.recoverWithApple();
      await services?.waitForIdentityReady();
      ctx.update({ restoreOutcome: 'restored' });
      await adapter.restore();
      await auth.recoverWithGoogle();
      const selected = await services?.waitForIdentityReady();
      if (!selected?.userId) throw new Error('Target account did not become ready');
      const callbacks = queuedProfiles.splice(0);
      callbacks.forEach(({ operation, owner, profile: queued }) => {
        deliveredProfiles += 1;
        ctx.log('lab_delayed_profile', { operation, owner, selected: selected.userId });
        profileListener?.(queued);
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      updateSubscriptionLab();
      return {
        identity: selected.userId,
        entitlement: adapter.entitlement().status,
        recovery: adapter.recovery().type,
        queued: callbacks.length,
        delivered: deliveredProfiles,
      };
    },
    runDeletionCallbackIsolation: async (seedDeletedAccount) => {
      const paywall = await adapter.loadPaywall('onboarding');
      const purchase = await adapter.purchase(paywall.products[0]!.handle);
      if (purchase.type !== 'pending') throw new Error('Delayed purchase did not remain pending');
      await auth.recoverWithApple();
      const deleted = await services?.waitForIdentityReady();
      if (!deleted?.userId) throw new Error('Deleted account did not become ready');
      await seedDeletedAccount();
      ctx.update({ restoreOutcome: 'restored' });
      await adapter.restore();
      await auth.deleteAccount();
      await auth.recoverWithApple();
      await new Promise<void>((resolve, reject) => {
        const finish = (identity: AuthIdentity) => {
          if (identity.kind !== 'canonical' || !identity.ready || !identity.userId || identity.userId === deleted.userId) return;
          clearTimeout(timer);
          stop();
          resolve();
        };
        const timer = setTimeout(() => {
          stop();
          reject(new Error('Deleted account tombstone did not settle to a fresh identity'));
        }, 15_000);
        const stop = auth.subscribeIdentity(finish);
        finish(auth.identity());
      });
      const selected = auth.identity();
      if (selected.kind !== 'canonical' || !selected.userId) throw new Error('Fresh identity did not become ready');
      const callbacks = queuedProfiles.splice(0);
      callbacks.forEach(({ operation, owner, profile: queued }) => {
        deliveredProfiles += 1;
        ctx.log('lab_deleted_profile', { operation, owner, selected: selected.userId });
        profileListener?.(queued);
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      updateSubscriptionLab();
      return {
        identity: selected.userId,
        deletedIdentity: deleted.userId,
        entitlement: adapter.entitlement().status,
        recovery: adapter.recovery().type,
        queued: callbacks.length,
        delivered: deliveredProfiles,
        tombstonePreserved: tombstones.has(deleted.userId),
      };
    },
    runEstablishedTransfer: async (seedAccount, accountCheckpoint, verifyCurrent) => {
      await auth.recoverWithApple();
      const source = await services?.waitForIdentityReady();
      if (!source?.userId) throw new Error('Source account did not become ready');
      await seedAccount('A');
      ownership.set(source.userId, 'active');
      storeOwner = source.userId;
      const sourceProfile = profile(source.userId);
      profileListener?.(sourceProfile);
      await new Promise((resolve) => setTimeout(resolve, 0));

      await auth.recoverWithGoogle();
      const target = await services?.waitForIdentityReady();
      if (!target?.userId) throw new Error('Target account did not become ready');
      await seedAccount('B');
      profileListener?.(sourceProfile);
      await new Promise((resolve) => setTimeout(resolve, 0));
      const beforeTransfer = await verifyCurrent();

      ctx.update({ restoreOutcome: 'restored' });
      try {
        await adapter.restore();
      } catch (error) {
        ctx.log('lab_transfer_retry', { message: message(error), owner: target.userId });
      }
      const afterFailure = await verifyCurrent();
      await adapter.restore();
      const afterTransfer = await verifyCurrent();
      await adapter.restore();
      const afterRepeat = await verifyCurrent();

      await auth.recoverWithApple();
      await services?.waitForIdentityReady();
      await adapter.refresh();
      const sourceAfterTransfer = await verifyCurrent();
      const sourceData = accountCheckpoint();

      await auth.recoverWithGoogle();
      await services?.waitForIdentityReady();
      await adapter.refresh();
      const targetAfterReturn = await verifyCurrent();
      const targetData = accountCheckpoint();
      updateSubscriptionLab();
      return {
        source: source.userId,
        beforeTransfer,
        afterFailure,
        afterTransfer,
        afterRepeat,
        sourceAfterTransfer,
        targetAfterReturn,
        sourceData,
        targetData,
        restores: attempts.restore,
        transfers,
      };
    },
    dispose: async () => {
      adapter.dispose();
      await services?.dispose();
    },
  };
}
