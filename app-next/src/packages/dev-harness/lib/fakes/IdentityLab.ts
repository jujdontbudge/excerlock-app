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
const STORE_SUBSCRIPTION_ID = 'lab.store.annual';
const INDEPENDENT_SUBSCRIPTION_ID = 'lab.account.monthly';
const TARGET_INDEPENDENT_SUBSCRIPTION_ID = 'lab.account.b.monthly';

type LabUser = { id: string; is_anonymous: boolean; identities: { provider: string }[]; app_metadata: Record<string, string> };
type LabSession = { access_token: string; refresh_token: string; user: LabUser };
type LabSupabase = NonNullable<AuthServiceConfig['supabase']>;
type LabAppleDeps = NonNullable<AuthServiceConfig['appleDeps']>;
type LabGoogleDeps = NonNullable<AuthServiceConfig['googleDeps']>;
type DeletionIsolationResult = {
  identity: string;
  deletedIdentity: string;
  entitlement: string;
  recovery: string;
  queued: number;
  delivered: number;
  tombstonePreserved: boolean;
};

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
  prepareDeletionCallbackIsolation(
    seedDeletedAccount: () => Promise<void>,
    completed: (result: DeletionIsolationResult) => void | Promise<void>,
  ): Promise<void>;
  runDeletionCallbackIsolation(seedDeletedAccount: () => Promise<void>): Promise<DeletionIsolationResult>;
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
    grantLedger: string | null;
  }>;
  runConcurrentRestore(
    seedAccount: (account: 'A' | 'B') => Promise<void>,
    accountCheckpoint: () => string,
    verifyCurrent: () => Promise<string>,
  ): Promise<{
    winner: string;
    afterRace: string;
    afterStaleLoser: string;
    afterRepeat: string;
    sourceAfterRace: string;
    targetAfterReturn: string;
    sourceData: string;
    targetData: string;
    restores: number;
    transfers: number;
    grantLedger: string;
  }>;
  runProviderLinking(
    seedAccount: (account: 'A' | 'B') => Promise<void>,
    accountCheckpoint: () => string,
  ): Promise<{
    canonical: string;
    apple: string;
    google: string;
    accounts: number;
    grants: number;
    conflict: string;
    initialData: string;
    appleData: string;
    googleData: string;
    conflictData: string;
  }>;
  runLocalSignOut(
    seedAccount: (account: 'A' | 'B') => Promise<void>,
    accountCheckpoint: () => string,
    journeyCheckpoint: (action?: 'admit' | 'reset') => Promise<string>,
  ): Promise<{
    before: string;
    failedReset: string;
    after: string;
    peer: string;
    peerProofs: number;
    localScopes: string;
    localData: string;
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

function labProduct(
  vendorProductId: string,
  title: string,
  amount: number,
  unit: 'year' | 'month',
  trial: boolean,
): AdaptyPaywallProduct {
  return {
    variationId: 'identity-lab',
    vendorProductId,
    localizedTitle: title,
    localizedDescription: '',
    price: { amount, currencyCode: 'USD', localizedString: `$${amount.toFixed(2)}` },
    subscription: {
      subscriptionPeriod: { unit, numberOfUnits: 1 },
      localizedSubscriptionPeriod: unit,
      offer: trial
        ? { phases: [{ paymentMode: 'free_trial', numberOfPeriods: 1, subscriptionPeriod: { unit: 'week', numberOfUnits: 1 } }] }
        : undefined,
    },
  } as unknown as AdaptyPaywallProduct;
}

export async function createIdentityLab(
  ctx: FakeContext,
  script: IdentityLabScript,
  accountHooks?: IdentityLabAccountHooks,
): Promise<IdentityLab> {
  const attempts = {
    anonymous: 0,
    userSync: 0,
    flow: 0,
    purchase: 0,
    restore: 0,
    link: 0,
    sessionRestore: 0,
    peerProof: 0,
    appleCredential: 0,
    googleCredential: 0,
    emailSend: 0,
  };
  const grants = new Map<string, { owner: string; status: 'trial' | 'active' }>();
  if (script.purchase === 'alreadyOwned') grants.set(STORE_SUBSCRIPTION_ID, { owner: 'lab-user-a', status: 'active' });
  const tombstones = new Set<string>();
  const queuedProfiles: { operation: 'purchase' | 'restore'; owner: string; profile: AdaptyProfile }[] = [];
  let transfers = 0;
  let deliveredProfiles = 0;
  let users = 0;
  let stored: LabSession | null = null;
  let distinctId = ANONYMOUS_DISTINCT_ID;
  let customerUserId: string | undefined;
  let profileListener: ((profile: AdaptyProfile) => void) | null = null;
  let concurrentRestoreClaims: {
    owner: string;
    resolve(profile: AdaptyProfile): void;
  }[] = [];
  let rejectNextAccountReset = false;
  let rejectNextProviderLink = false;
  let enterPurchaseBarrier: (() => void) | undefined;
  let releasePurchaseBarrier: (() => void) | undefined;
  const purchaseBarrierEntered = new Promise<void>((resolve) => { enterPurchaseBarrier = resolve; });
  const purchaseBarrierReleased = new Promise<void>((resolve) => { releasePurchaseBarrier = resolve; });
  const activeSessionTokens = new Set<string>();
  const signOutScopes: string[] = [];
  let services: AuthServices | undefined;
  const providerUsers = new Map<string, LabUser>();
  const usersById = new Map<string, LabUser>();
  const emailChallengeOutcomes: string[] = [];

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
    activeSessionTokens.add(stored.access_token);
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
      signOut: async ({ scope }: { scope?: 'local' | 'global' | 'others' } = {}) => {
        const resolvedScope = scope ?? 'global';
        signOutScopes.push(resolvedScope);
        if (resolvedScope === 'global') activeSessionTokens.clear();
        else if (resolvedScope === 'local' && stored) activeSessionTokens.delete(stored.access_token);
        else if (stored) {
          for (const token of activeSessionTokens) {
            if (token !== stored.access_token) activeSessionTokens.delete(token);
          }
        }
        ctx.log('lab_sign_out', { scope: resolvedScope });
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
        const result = rejectNextProviderLink ? 'conflict' : script.appleLink ?? 'ok';
        rejectNextProviderLink = false;
        ctx.log('lab_link_identity', { provider, result });
        if (result === 'conflict' || !stored)
          return { data: { user: null, session: null }, error: Object.assign(new Error('Identity is already linked to another user'), { status: 422 }) };
        const linked: LabUser = {
          ...stored.user,
          is_anonymous: false,
          identities: [...stored.user.identities.filter((identity) => identity.provider !== provider), { provider }],
          app_metadata: { provider },
        };
        providerUsers.set(provider, linked);
        usersById.set(linked.id, linked);
        return signedIn(linked);
      },
      signInWithIdToken: async ({ provider }: { provider: string }) => {
        const result = signedIn(newUser(provider));
        ctx.log('lab_recovered_account', { provider, user: result.data.user.id });
        return result;
      },
      signInWithOtp: unscripted,
      verifyOtp: async ({ token }: { email: string; token: string; type: string }) => {
        if (!script.emailChallenges || !stored) return unscripted();
        const outcome = token === '111111'
          ? 'invalid'
          : token === '222222'
            ? 'expired'
            : token === '333333'
              ? 'superseded'
              : token === '444444' && attempts.emailSend === 2
                ? 'success'
                : 'invalid';
        const challenge = outcome === 'superseded' ? 1 : attempts.emailSend;
        emailChallengeOutcomes.push(outcome);
        ctx.log('lab_email_challenge', {
          challenge,
          result: outcome,
          account: stored.user.id,
          grants: grants.size,
        });
        updateSubscriptionLab();
        if (outcome !== 'success')
          return { data: { user: null, session: null }, error: Object.assign(new Error(`Email code ${outcome}`), { code: `otp_${outcome}` }) };
        const linked: LabUser = {
          ...stored.user,
          is_anonymous: false,
          identities: [...stored.user.identities.filter((identity) => identity.provider !== 'email'), { provider: 'email' }],
          app_metadata: { provider: 'email' },
        };
        providerUsers.set('email', linked);
        usersById.set(linked.id, linked);
        return signedIn(linked);
      },
      updateUser: async ({ email: _email }: { email: string }) => {
        if (!script.emailChallenges || !stored) return unscripted();
        attempts.emailSend += 1;
        ctx.log('lab_email_code_sent', { challenge: attempts.emailSend, account: stored.user.id });
        return { data: { user: stored.user }, error: null };
      },
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
    signInAsync: async () => {
      attempts.appleCredential += 1;
      const cancelled = Boolean(script.providerAttempts && attempts.appleCredential === 1);
      ctx.log('lab_provider_attempt', {
        provider: 'apple',
        attempt: attempts.appleCredential,
        result: cancelled ? 'cancelled' : 'success',
        account: stored?.user.id ?? 'none',
        grants: grants.size,
      });
      if (cancelled) throw Object.assign(new Error('Provider sheet canceled'), { code: 'ERR_REQUEST_CANCELED' });
      return { identityToken: 'lab-apple-identity-token', authorizationCode: null, user: 'lab-apple-user' };
    },
    digestSHA256Hex: async (value) => `lab-sha256-${value.length}`,
    randomNonce: () => 'lab-nonce',
  };
  const googleDeps: LabGoogleDeps = {
    clientId: 'identity-lab',
    redirectUri: 'identity-lab:/oauth',
    buildRequest: () => ({
      promptAsync: async () => {
        attempts.googleCredential += 1;
        const failed = Boolean(script.providerAttempts && attempts.googleCredential === 1);
        const result = failed ? 'failed' : script.googleSignIn === 'success' ? 'success' : 'cancelled';
        ctx.log('lab_provider_attempt', {
          provider: 'google',
          attempt: attempts.googleCredential,
          result,
          account: stored?.user.id ?? 'none',
          grants: grants.size,
        });
        if (script.providerAttempts && attempts.googleCredential >= 2) updateSubscriptionLab();
        if (failed) throw networkError('Provider temporarily unavailable');
        return script.googleSignIn === 'success'
          ? { type: 'success', params: { code: 'lab-google-code' } }
          : { type: 'cancel' };
      },
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
      concurrentRestoreIsolation: ctx.snapshot().subscriptionLab?.concurrentRestoreIsolation,
      providerLinking: ctx.snapshot().subscriptionLab?.providerLinking,
      providerAttempts: script.providerAttempts && attempts.googleCredential >= 2
        ? `Apple canceled · Google failed · Google success · account ${stored?.user.id ?? 'none'} · grants ${grants.size}`
        : ctx.snapshot().subscriptionLab?.providerAttempts,
      emailChallenges: script.emailChallenges && emailChallengeOutcomes.length >= 4
        ? `${emailChallengeOutcomes.join(' · ')} · account ${stored?.user.id ?? 'none'} · grants ${grants.size}`
        : ctx.snapshot().subscriptionLab?.emailChallenges,
      localSignOutIsolation: ctx.snapshot().subscriptionLab?.localSignOutIsolation,
      purchaseSerialization: ctx.snapshot().subscriptionLab?.purchaseSerialization,
      existingSubscription: script.purchase === 'alreadyOwned'
        ? `store ${STORE_SUBSCRIPTION_ID} owner ${grants.get(STORE_SUBSCRIPTION_ID)?.owner ?? 'none'} selected ${customerUserId ?? 'none'} charge starts 0`
        : ctx.snapshot().subscriptionLab?.existingSubscription,
      providerConflict: script.establishedProviderConflict
        ? `B preserved Apple owner lab-user-a links ${attempts.link} session restores ${attempts.sessionRestore} Entitlement ${adapter?.entitlement().status ?? 'none'} data ${accountHooks?.accountCheckpoint?.() ?? 'unavailable'}`
        : ctx.snapshot().subscriptionLab?.providerConflict,
    },
  });
  const profile = (owner = customerUserId): AdaptyProfile => {
    const statuses = owner
      ? [...grants.values()].filter((grant) => grant.owner === owner).map((grant) => grant.status)
      : [];
    const status = statuses.includes('active') ? 'active' : statuses.includes('trial') ? 'trial' : undefined;
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
  const applyStoreRestore = (owner: string) => {
    const storeGrant = grants.get(STORE_SUBSCRIPTION_ID);
    if (storeGrant && storeGrant.owner !== owner) transfers += 1;
    grants.set(STORE_SUBSCRIPTION_ID, { owner, status: 'active' });
  };
  const restoreForOwner = async (owner: string, source: 'adapter' | 'remote'): Promise<AdaptyProfile> => {
    attempts.restore += 1;
    ctx.log('lab_restore', { result: 'restored', owner, source });
    if (!script.concurrentRestore || attempts.restore > 2) {
      applyStoreRestore(owner);
      updateSubscriptionLab();
      return profile(owner);
    }
    return new Promise((resolve) => {
      concurrentRestoreClaims.push({ owner, resolve });
      ctx.log('lab_restore_barrier', { owner, waiting: concurrentRestoreClaims.length });
      if (concurrentRestoreClaims.length !== 2) return;
      const claims = concurrentRestoreClaims;
      concurrentRestoreClaims = [];
      const ordered = claims.sort((left, right) => left.owner.localeCompare(right.owner));
      const resolved = ordered.map((claim) => {
        applyStoreRestore(claim.owner);
        return { claim, restored: profile(claim.owner) };
      });
      ctx.log('lab_restore_barrier_released', { order: ordered.map((claim) => claim.owner).join(',') });
      updateSubscriptionLab();
      resolved.forEach(({ claim, restored }) => claim.resolve(restored));
    });
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
      script.plans === 'empty'
        ? []
        : [
            labProduct('lab.annual', 'Lab annual', 49.99, 'year', script.purchase !== 'alreadyOwned'),
            labProduct('lab.monthly', 'Lab monthly', 9.99, 'month', script.purchase !== 'alreadyOwned'),
          ],
    logShowFlow: async () => undefined,
    makePurchase: async () => {
      attempts.purchase += 1;
      const configured = script.purchase ?? ctx.snapshot().outcome;
      const result = configured === 'errorFirst' && attempts.purchase > 1
        ? 'success'
        : configured === 'errorFirst'
          ? 'error'
          : configured === 'busyBarrier'
            ? 'success'
            : configured;
      const owner = customerUserId;
      ctx.log('lab_purchase', { result: configured === 'busyBarrier' ? 'success' : result, owner });
      if (configured === 'busyBarrier') {
        enterPurchaseBarrier?.();
        await purchaseBarrierReleased;
      }
      if (result === 'error') throw networkError('Purchase failed');
      if (result === 'alreadyOwned') {
        updateSubscriptionLab();
        throw Object.assign(new Error('This subscription is already owned'), { adaptyCode: 107 });
      }
      if (result === 'cancel') return { type: 'user_cancelled' } as AdaptyPurchaseResult;
      if (result === 'pending') return { type: 'pending' } as AdaptyPurchaseResult;
      if (!owner) throw new Error('Purchase owner unavailable');
      if (result === 'successWithoutAccess') {
        const purchased = profile(owner);
        ctx.log('lab_purchase_profile', { owner, access: 'none', grants: grants.size });
        updateSubscriptionLab();
        return { type: 'success', profile: purchased } as unknown as AdaptyPurchaseResult;
      }
      grants.set(STORE_SUBSCRIPTION_ID, { owner, status: 'trial' });
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
      const result = script.restore ?? ctx.snapshot().restoreOutcome;
      const owner = customerUserId;
      if (!owner) throw new Error('Restore owner unavailable');
      if (script.establishedTransfer && attempts.restore === 0) {
        attempts.restore += 1;
        ctx.log('lab_restore', { result, owner, source: 'adapter' });
        throw networkError('Restore reconciliation unavailable');
      }
      const restored = result === 'restored'
        ? await restoreForOwner(owner, 'adapter')
        : (() => {
            attempts.restore += 1;
            ctx.log('lab_restore', { result, owner, source: 'adapter' });
            return profile(owner);
          })();
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
    beforeAccountSwitch: async () => {
      if (rejectNextAccountReset) {
        rejectNextAccountReset = false;
        ctx.log('lab_sign_out_reset', { result: 'failed' });
        throw networkError('Account reset failed');
      }
      await accountHooks?.beforeAccountSwitch();
    },
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
      if (script.purchase === 'busyBarrier') {
        const first = adapter.purchase(handle);
        await purchaseBarrierEntered;
        const before = adapter.recovery();
        const duplicate = adapter.purchase(handle).then(
          () => 'accepted',
          (error) => message(error),
        );
        const restore = adapter.restore().then(
          () => 'accepted',
          (error) => message(error),
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
        const during = adapter.recovery();
        releasePurchaseBarrier?.();
        try {
          const [result, duplicateResult, restoreResult] = await Promise.all([first, duplicate, restore]);
          const after = adapter.recovery();
          const stableOwner = before.type === 'pending' && during.type === 'pending' && after.type === 'accountConnection'
            && before.checkoutUserId === during.checkoutUserId && during.checkoutUserId === after.checkoutUserId;
          const stableOperation = before.type === 'pending' && during.type === 'pending' && after.type === 'accountConnection'
            && before.operationId === during.operationId && during.operationId === after.operationId;
          ctx.update({ subscriptionLab: {
            ...ctx.snapshot().subscriptionLab!,
            purchaseSerialization: `duplicate ${duplicateResult} restore ${restoreResult} owner ${stableOwner ? 'stable' : 'changed'} operation ${stableOperation ? 'stable' : 'changed'}`,
          } });
          return result;
        } catch (error) {
          releasePurchaseBarrier?.();
          throw error;
        }
      }
      try {
        const result = await adapter.purchase(handle);
        ctx.log('lab_purchase_recovery', { state: adapter.recovery().type });
        return result;
      } catch (error) {
        ctx.log('lab_purchase_failure', {
          attempt: attempts.purchase,
          owner: customerUserId ?? 'none',
          grants: grants.size,
          recovery: adapter.recovery().type,
        });
        updateSubscriptionLab();
        throw error;
      }
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
  const stageDeletionCallbackIsolation = async (seedDeletedAccount: () => Promise<void>) => {
    const paywall = await adapter.loadPaywall('onboarding');
    const purchase = await adapter.purchase(paywall.products[0]!.handle);
    if (purchase.type !== 'pending') throw new Error('Delayed purchase did not remain pending');
    await auth.recoverWithApple();
    const deleted = await services?.waitForIdentityReady();
    if (!deleted?.userId) throw new Error('Deleted account did not become ready');
    await seedDeletedAccount();
    ctx.update({ restoreOutcome: 'restored' });
    await adapter.restore();
    return deleted.userId;
  };
  const finishDeletionCallbackIsolation = async (deletedIdentity: string): Promise<DeletionIsolationResult> => {
    await auth.recoverWithApple();
    await new Promise<void>((resolve, reject) => {
      const finish = (identity: AuthIdentity) => {
        if (identity.kind !== 'canonical' || !identity.ready || !identity.userId || identity.userId === deletedIdentity) return;
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
      deletedIdentity,
      entitlement: adapter.entitlement().status,
      recovery: adapter.recovery().type,
      queued: callbacks.length,
      delivered: deliveredProfiles,
      tombstonePreserved: tombstones.has(deletedIdentity),
    };
  };
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
    prepareDeletionCallbackIsolation: async (seedDeletedAccount, completed) => {
      const deletedIdentity = await stageDeletionCallbackIsolation(seedDeletedAccount);
      let finishing = false;
      let stop: () => void = () => undefined;
      stop = auth.subscribeIdentity((identity) => {
        if (
          finishing ||
          !tombstones.has(deletedIdentity) ||
          identity.kind !== 'canonical' ||
          !identity.ready ||
          !identity.userId ||
          identity.userId === deletedIdentity
        ) return;
        finishing = true;
        stop();
        void finishDeletionCallbackIsolation(deletedIdentity).then(completed).catch((error) => {
          ctx.log('lab_deletion_callback_failed', { message: message(error) });
        });
      });
    },
    runDeletionCallbackIsolation: async (seedDeletedAccount) => {
      const deletedIdentity = await stageDeletionCallbackIsolation(seedDeletedAccount);
      await auth.deleteAccount();
      return finishDeletionCallbackIsolation(deletedIdentity);
    },
    runEstablishedTransfer: async (seedAccount, accountCheckpoint, verifyCurrent) => {
      await auth.recoverWithApple();
      const source = await services?.waitForIdentityReady();
      if (!source?.userId) throw new Error('Source account did not become ready');
      await seedAccount('A');
      grants.set(STORE_SUBSCRIPTION_ID, { owner: source.userId, status: 'active' });
      if (script.secondSubscription)
        grants.set(INDEPENDENT_SUBSCRIPTION_ID, { owner: source.userId, status: 'active' });
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
      const ownedBy = (userId: string) => [...grants.entries()]
        .filter(([, grant]) => grant.owner === userId)
        .map(([subscriptionId]) => subscriptionId)
        .sort()
        .join(',');
      const grantLedger = script.secondSubscription
        ? `transferred ${STORE_SUBSCRIPTION_ID} to ${target.userId} independent ${INDEPENDENT_SUBSCRIPTION_ID} stays ${source.userId} target only ${ownedBy(target.userId)} source only ${ownedBy(source.userId)}`
        : null;
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
        grantLedger,
      };
    },
    runConcurrentRestore: async (seedAccount, accountCheckpoint, verifyCurrent) => {
      await auth.recoverWithApple();
      const source = await services?.waitForIdentityReady();
      if (!source?.userId) throw new Error('Source account did not become ready');
      await seedAccount('A');
      grants.set(STORE_SUBSCRIPTION_ID, { owner: source.userId, status: 'trial' });
      const staleSourceProfile = profile(source.userId);
      grants.set(STORE_SUBSCRIPTION_ID, { owner: source.userId, status: 'active' });
      grants.set(INDEPENDENT_SUBSCRIPTION_ID, { owner: source.userId, status: 'active' });

      await auth.recoverWithGoogle();
      const target = await services?.waitForIdentityReady();
      if (!target?.userId) throw new Error('Target account did not become ready');
      await seedAccount('B');
      grants.set(TARGET_INDEPENDENT_SUBSCRIPTION_ID, { owner: target.userId, status: 'active' });
      ctx.update({ restoreOutcome: 'restored' });

      const targetRestore = adapter.restore();
      const sourceRestore = restoreForOwner(source.userId, 'remote');
      await Promise.all([sourceRestore, targetRestore]);
      const raceWinner = grants.get(STORE_SUBSCRIPTION_ID)?.owner ?? 'none';
      const afterRace = await verifyCurrent();

      profileListener?.(staleSourceProfile);
      await new Promise((resolve) => setTimeout(resolve, 0));
      const afterStaleLoser = `${await verifyCurrent()}/${adapter.entitlement().status}`;

      await adapter.restore();
      const afterRepeat = await verifyCurrent();

      await auth.recoverWithApple();
      await services?.waitForIdentityReady();
      await adapter.refresh();
      const sourceAfterRace = await verifyCurrent();
      const sourceData = accountCheckpoint();

      await auth.recoverWithGoogle();
      await services?.waitForIdentityReady();
      await adapter.refresh();
      const targetAfterReturn = await verifyCurrent();
      const targetData = accountCheckpoint();
      const entries = [...grants.entries()].sort(([left], [right]) => left.localeCompare(right));
      const grantLedger = `store ${STORE_SUBSCRIPTION_ID}=${grants.get(STORE_SUBSCRIPTION_ID)?.owner ?? 'none'} independent A ${INDEPENDENT_SUBSCRIPTION_ID}=${grants.get(INDEPENDENT_SUBSCRIPTION_ID)?.owner ?? 'none'} independent B ${TARGET_INDEPENDENT_SUBSCRIPTION_ID}=${grants.get(TARGET_INDEPENDENT_SUBSCRIPTION_ID)?.owner ?? 'none'} unique ${new Set(entries.map(([subscriptionId]) => subscriptionId)).size}/${entries.length}`;
      updateSubscriptionLab();
      return {
        winner: raceWinner,
        afterRace,
        afterStaleLoser,
        afterRepeat,
        sourceAfterRace,
        targetAfterReturn,
        sourceData,
        targetData,
        restores: attempts.restore,
        transfers,
        grantLedger,
      };
    },
    runProviderLinking: async (seedAccount, accountCheckpoint) => {
      if (!script.linkedProviders) throw new Error('Linked providers are not scripted');
      await auth.recoverWithApple();
      const canonical = await services?.waitForIdentityReady();
      if (!canonical?.userId) throw new Error('Canonical account did not become ready');
      await seedAccount('A');
      grants.set(STORE_SUBSCRIPTION_ID, { owner: canonical.userId, status: 'active' });
      profileListener?.(profile(canonical.userId));
      await new Promise((resolve) => setTimeout(resolve, 0));
      const initialData = accountCheckpoint();

      await auth.linkWithGoogle();
      await services?.waitForIdentityReady();

      await auth.recoverWithApple();
      const apple = await services?.waitForIdentityReady();
      if (!apple?.userId) throw new Error('Apple account did not become ready');
      const appleData = accountCheckpoint();

      await auth.recoverWithGoogle();
      const google = await services?.waitForIdentityReady();
      if (!google?.userId) throw new Error('Google account did not become ready');
      const googleData = accountCheckpoint();

      rejectNextProviderLink = true;
      let conflict = 'missing';
      try {
        await auth.linkWithApple();
      } catch (error) {
        if ((error as { code?: unknown })?.code !== 'AUTH_RECOVERY_REQUIRED') throw error;
        conflict = 'recovery required';
      }
      const afterConflict = auth.identity();
      if (afterConflict.userId !== canonical.userId) throw new Error('Provider conflict changed the canonical account');
      const conflictData = accountCheckpoint();
      updateSubscriptionLab();
      return {
        canonical: canonical.userId,
        apple: apple.userId,
        google: google.userId,
        accounts: new Set([...providerUsers.values()].map((user) => user.id)).size,
        grants: grants.size,
        conflict,
        initialData,
        appleData,
        googleData,
        conflictData,
      };
    },
    runLocalSignOut: async (seedAccount, accountCheckpoint, journeyCheckpoint) => {
      if (!script.localSignOut) throw new Error('Local sign-out is not scripted');
      await auth.recoverWithApple();
      const selected = await services?.waitForIdentityReady();
      if (!selected?.userId) throw new Error('Local sign-out account did not become ready');
      await seedAccount('A');
      grants.set(STORE_SUBSCRIPTION_ID, { owner: selected.userId, status: 'active' });
      profileListener?.(profile(selected.userId));
      await new Promise((resolve) => setTimeout(resolve, 0));
      const peerToken = `lab-peer-token-${selected.userId}`;
      activeSessionTokens.add(peerToken);
      const verifyPeer = () => {
        attempts.peerProof += 1;
        const active = activeSessionTokens.has(peerToken);
        const eligible = [...grants.values()].some((grant) => grant.owner === selected.userId && ['trial', 'active'].includes(grant.status));
        const result = active && eligible ? 'eligible' : 'unavailable';
        ctx.log('lab_peer_subscription_proof', { account: selected.userId, result });
        return result;
      };
      const before = await journeyCheckpoint('admit');
      rejectNextAccountReset = true;
      let failedReset = 'missing';
      try {
        await auth.signOut();
      } catch (error) {
        failedReset = message(error);
      }
      await services?.waitForIdentityReady();
      const failedJourney = await journeyCheckpoint();
      const failedData = accountCheckpoint();
      await auth.signOut();
      await services?.waitForIdentityReady();
      const after = await journeyCheckpoint('reset');
      const localData = accountCheckpoint();
      const peer = verifyPeer();
      updateSubscriptionLab();
      return {
        before,
        failedReset: `${failedReset} journey ${failedJourney} data ${failedData}`,
        after,
        peer,
        peerProofs: attempts.peerProof,
        localScopes: signOutScopes.join(','),
        localData,
      };
    },
    dispose: async () => {
      adapter.dispose();
      await services?.dispose();
    },
  };
}
