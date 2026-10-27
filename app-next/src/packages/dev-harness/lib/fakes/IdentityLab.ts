import { createAuthServices, type AccountSwitch, type AuthServiceConfig, type AuthServices } from '../../../identity/createAuthServices';
import { AdaptySubscriptionAdapter } from '../../../subscription/AdaptySubscriptionAdapter';
import type { AdAttributionPort } from '../../../ports/AdAttributionPort';
import type { AdaptyFlow, AdaptyPaywallProduct, AdaptyProfile, AdaptyPurchaseResult, AdaptySdkPort } from '../../../subscription/adaptySdk';
import type { AuthIdentity, AuthPort } from '../../../ports/AuthPort';
import type { SubscriptionPort } from '../../../ports/SubscriptionPort';
import type { IdentityLabScript } from '../../../model/models';
import { FakeContext } from '../FakeContext';
import { paymentAnalyticsLab } from './PaymentAnalyticsLab';
import { AnalyticsFake } from './AnalyticsFake';
import type { AnalyticsPort } from '../../../ports/AnalyticsPort';

const SLOW_USER_SYNC_MS = 8000;
const LAB_URL = 'https://identity-lab.invalid';
const ANONYMOUS_DISTINCT_ID = 'lab-anonymous-distinct-id';
const STORE_SUBSCRIPTION_ID = 'lab.store.annual';
const TARGET_INDEPENDENT_SUBSCRIPTION_ID = 'lab.account.b.monthly';
const EXISTING_USER_ID = 'lab-existing';

type LabUser = { email?: string; id: string; is_anonymous: boolean; identities: { provider: string }[]; app_metadata: Record<string, string> };
type LabSession = { access_token: string; refresh_token: string; user: LabUser };
type LabSupabase = NonNullable<AuthServiceConfig['supabase']>;
type LabAppleDeps = NonNullable<AuthServiceConfig['appleDeps']>;
type LabGoogleDeps = NonNullable<AuthServiceConfig['googleDeps']>;

export type IdentityLab = {
  auth: AuthPort;
  analytics: AnalyticsPort;
  subscription: SubscriptionPort;
  booted: Promise<void>;
  dispose(): Promise<void>;
};

export type IdentityLabAccountHooks = {
  beforeAccountSwitch(options: AccountSwitch): Promise<void>;
  prepareAccount(identity: AuthIdentity): Promise<void>;
  afterDelete(): Promise<void>;
  seedAccount?(account: 'A' | 'B'): Promise<void>;
  accountCheckpoint?(): string;
  adAttribution?: Pick<AdAttributionPort, 'trialStarted' | 'subscriptionStarted'>;
};

const base64Url = (value: string) => btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function labStoreTransaction(product: AdaptyPaywallProduct, trial: boolean, script: IdentityLabScript): string {
  const payload = {
    originalTransactionId: script.storeTransaction?.originalTransactionId ?? 'lab-original-1',
    productId: product.vendorProductId,
    transactionReason: 'PURCHASE',
    environment: script.storeTransaction?.environment ?? 'Sandbox',
    price: trial ? 0 : Math.round((product.price?.amount ?? 0) * 1000),
    currency: product.price?.currencyCode ?? 'USD',
    ...(trial ? { offerType: 1, offerDiscountType: 'FREE_TRIAL' } : {}),
  };
  return `${base64Url('{"alg":"none"}')}.${base64Url(JSON.stringify(payload))}.lab`;
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

function labProduct(
  vendorProductId: string,
  title: string,
  amount: number,
  unit: 'year' | 'month',
  trial: boolean,
  trialDays = 3,
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
        ? { phases: [{ paymentMode: 'free_trial', numberOfPeriods: trialDays === 6 ? 2 : 1, subscriptionPeriod: { unit: trialDays === 7 ? 'week' : 'day', numberOfUnits: trialDays === 7 ? 1 : trialDays === 6 ? 3 : trialDays } }] }
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
    activation: 0,
    adaptyIdentify: 0,
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
  let checkoutProductId = 'lab.annual';
  if (script.purchase === 'alreadyOwned') grants.set(STORE_SUBSCRIPTION_ID, { owner: 'lab-user-a', status: 'active' });
  if (script.wrongStoreAccount) grants.set(STORE_SUBSCRIPTION_ID, { owner: 'lab-user-a', status: 'active' });
  if (script.storeGrant) grants.set(STORE_SUBSCRIPTION_ID, script.storeGrant);
  const tombstones = new Set<string>();
  const queuedProfiles: { operation: 'purchase' | 'restore'; owner: string; profile: AdaptyProfile }[] = [];
  let transfers = 0;
  let deliveredProfiles = 0;
  let users = 0;
  let stored: LabSession | null = null;
  let pendingEmail: string | null = null;
  let distinctId = ANONYMOUS_DISTINCT_ID;
  let customerUserId: string | undefined;
  let profileListener: ((profile: AdaptyProfile) => void) | null = null;
  let concurrentRestoreClaims: {
    owner: string;
    resolve(profile: AdaptyProfile): void;
  }[] = [];
  let rejectNextAccountReset = false;
  let enterPurchaseBarrier: (() => void) | undefined;
  let releasePurchaseBarrier: (() => void) | undefined;
  const purchaseBarrierEntered = new Promise<void>((resolve) => { enterPurchaseBarrier = resolve; });
  const purchaseBarrierReleased = new Promise<void>((resolve) => { releasePurchaseBarrier = resolve; });
  let services: AuthServices | undefined;
  const providerUsers = new Map<string, LabUser>();
  const usersById = new Map<string, LabUser>();

  const networkError = (text: string) => Object.assign(new Error(text), { status: 0 });
  const authError = (code: string, text: string, status = 422) => Object.assign(new Error(text), { code, status });
  const rateLimited = () => authError('over_email_send_rate_limit', 'For security purposes, you can only request this after 60 seconds.', 429);
  const newUser = (provider?: string): LabUser => {
    const existing = provider ? providerUsers.get(provider) : undefined;
    if (existing) return existing;
    users += 1;
    const user: LabUser = {
      id: provider === 'apple' ? 'lab-user-a' : provider === 'google' ? 'lab-user-b' : provider === 'email' ? 'lab-email-account' : `lab-checkout-${users}`,
      is_anonymous: !provider,
      identities: provider ? [{ provider }] : [],
      app_metadata: provider ? { provider } : {} as Record<string, string>,
    };
    if (provider) providerUsers.set(provider, user);
    usersById.set(user.id, user);
    return user;
  };
  if (script.existing) {
    const { provider, paid } = script.existing;
    const user: LabUser = {
      id: EXISTING_USER_ID,
      email: provider === 'email' ? 'e@b.co' : undefined,
      is_anonymous: false,
      identities: [{ provider }],
      app_metadata: { provider },
    };
    providerUsers.set(provider, user);
    usersById.set(user.id, user);
    if (paid) grants.set(TARGET_INDEPENDENT_SUBSCRIPTION_ID, { owner: user.id, status: 'active' });
  }
  const signedIn = (user: LabUser) => {
    stored = { access_token: `lab-token-${user.id}`, refresh_token: `lab-refresh-${user.id}`, user };
    return { data: { user, session: stored }, error: null };
  };
  const linkTo = (provider: string, email?: string) => {
    const linked: LabUser = {
      ...stored!.user,
      ...(email ? { email } : {}),
      is_anonymous: false,
      identities: [...stored!.user.identities.filter((identity) => identity.provider !== provider), { provider }],
      app_metadata: { provider },
    };
    providerUsers.set(provider, linked);
    usersById.set(linked.id, linked);
    return linked;
  };
  const ownerOf = (provider: string) => {
    const owner = providerUsers.get(provider);
    return owner && owner.id !== stored?.user.id ? owner : null;
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
        ctx.log('lab_sign_out', { scope: scope ?? 'global' });
        stored = null;
        return { error: null };
      },
      setSession: async ({ access_token }: { access_token: string }) => {
        const user = usersById.get(access_token.replace(/^lab-token-/, ''));
        if (!user) return { data: { user: null, session: null }, error: networkError('Saved session unavailable') };
        ctx.log('lab_session_restored', { user: user.id });
        return signedIn(user);
      },
      refreshSession: async () => {
        if (!stored) return { data: { user: null, session: null }, error: networkError('No session') };
        return signedIn(usersById.get(stored.user.id) ?? stored.user);
      },
      linkIdentity: async ({ provider }: { provider: string }) => {
        if (!stored) return unscripted();
        const owner = ownerOf(provider);
        ctx.log('lab_link_identity', { provider, result: owner ? 'conflict' : 'ok', user: stored.user.id });
        if (owner) return { data: { user: null, session: null }, error: authError('identity_already_exists', 'Identity is already linked to another user') };
        return signedIn(linkTo(provider));
      },
      signInWithIdToken: async ({ provider }: { provider: string }) => {
        const result = signedIn(newUser(provider));
        ctx.log('lab_signed_in', { provider, user: result.data.user.id });
        return result;
      },
      updateUser: async ({ email }: { email: string }) => {
        if (!stored) return unscripted();
        if (ownerOf('email')) {
          ctx.log('lab_email_exists', { account: stored.user.id });
          return { data: { user: null }, error: authError('email_exists', 'A user with this email address has already been registered') };
        }
        attempts.emailSend += 1;
        pendingEmail = email;
        ctx.log('lab_email_code_sent', { kind: 'save', challenge: attempts.emailSend, account: stored.user.id });
        return { data: { user: stored.user }, error: script.emailRateLimited ? rateLimited() : null };
      },
      signInWithOtp: async () => {
        if (!stored) return unscripted();
        if (!providerUsers.get('email')) return { data: { user: null, session: null }, error: authError('otp_disabled', 'Signups not allowed for otp') };
        attempts.emailSend += 1;
        ctx.log('lab_email_code_sent', { kind: 'signIn', challenge: attempts.emailSend, account: stored.user.id });
        return { data: { user: null, session: null }, error: script.emailRateLimited ? rateLimited() : null };
      },
      verifyOtp: async ({ token, type }: { email: string; token: string; type: string }) => {
        if (!stored) return unscripted();
        const ok = token === '123456';
        ctx.log('lab_email_verified', { type, challenge: attempts.emailSend, ok });
        if (!ok) return { data: { user: null, session: null }, error: authError('otp_expired', 'Token has expired or is invalid', 403) };
        if (type === 'email_change') {
          const linked = linkTo('email', pendingEmail ?? undefined);
          stored = { ...stored, user: linked };
          return { data: { user: linked, session: null }, error: null };
        }
        return signedIn(newUser('email'));
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
      const unknown = Boolean(script.appleUnknown && attempts.appleCredential === 1);
      const cancelled = Boolean(script.providerAttempts && attempts.appleCredential === (script.appleUnknown ? 2 : 1));
      ctx.log('lab_provider_attempt', {
        provider: 'apple',
        attempt: attempts.appleCredential,
        result: unknown ? 'unknown' : cancelled ? 'cancelled' : 'success',
        account: stored?.user.id ?? 'none',
        grants: grants.size,
      });
      if (unknown) throw Object.assign(new Error('Native authorization failed for an unknown reason'), { code: 'ERR_REQUEST_UNKNOWN' });
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
      providerAttempts: script.providerAttempts && attempts.googleCredential >= 2
        ? `Apple canceled · Google failed · Google success · account ${stored?.user.id ?? 'none'} · grants ${grants.size}`
        : ctx.snapshot().subscriptionLab?.providerAttempts,
      purchaseSerialization: ctx.snapshot().subscriptionLab?.purchaseSerialization,
      existingSubscription: script.purchase === 'alreadyOwned'
        ? `store ${STORE_SUBSCRIPTION_ID} owner ${grants.get(STORE_SUBSCRIPTION_ID)?.owner ?? 'none'} selected ${customerUserId ?? 'none'} charge starts 0`
        : ctx.snapshot().subscriptionLab?.existingSubscription,
      restoreIsolation: script.wrongStoreAccount
        ? `wrong Store owner ${grants.get(STORE_SUBSCRIPTION_ID)?.owner ?? 'none'} selected ${customerUserId ?? 'none'} transfers ${transfers}`
        : ctx.snapshot().subscriptionLab?.restoreIsolation,
    },
  });
  const profile = (owner = customerUserId): AdaptyProfile => {
    const statuses = owner
      ? [...grants.values()].filter((grant) => grant.owner === owner).map((grant) => grant.status)
      : [];
    const status = statuses.includes('active') ? 'active' : statuses.includes('trial') ? 'trial' : undefined;
    const days = status === 'trial' ? ctx.scenario.onboardingOffer?.trialDays ?? 3 : 30;
    return {
      customerUserId: owner,
      subscriptions: Object.fromEntries([...grants].filter(([, grant]) => grant.owner === owner).map(([id]) => [id, {
        isActive: true,
        store: 'app_store',
        vendorProductId: id === STORE_SUBSCRIPTION_ID ? checkoutProductId : id,
        vendorOriginalTransactionId: id === STORE_SUBSCRIPTION_ID ? script.storeTransaction?.originalTransactionId ?? 'lab-original-1' : id,
        isSandbox: id !== STORE_SUBSCRIPTION_ID || script.storeTransaction?.environment !== 'Production',
      }])),
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
    grants.set(STORE_SUBSCRIPTION_ID, { owner, status: storeGrant?.status ?? 'active' });
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
  let finishLateProducts: (() => void) | null = null;
  const sdk: AdaptySdkPort = {
    activate: async () => {
      attempts.activation += 1;
      ctx.log('lab_activation', { attempt: attempts.activation });
      if (script.activation === 'failFirst' && attempts.activation === 1)
        throw Object.assign(new Error('Activation network failure'), { adaptyCode: 2005 });
    },
    setFallback: async () => undefined,
    addEventListener: (_event, callback) => {
      profileListener = callback;
      return { remove: () => { profileListener = null; } };
    },
    getProfile: async () => profile(),
    identify: async (userId) => {
      attempts.adaptyIdentify += 1;
      if (script.adaptyIdentify === 'failFirst' && attempts.adaptyIdentify === 1) {
        ctx.log('lab_identify_retry', { attempt: attempts.adaptyIdentify });
        throw Object.assign(new Error('Identify server failure'), { adaptyCode: 2004 });
      }
      customerUserId = userId;
      ctx.log('lab_adapty_identify', { user: userId });
      setTimeout(() => profileListener?.(profile()), 0);
    },
    logout: async () => {
      customerUserId = undefined;
    },
    updateProfile: async (params) => {
      ctx.log('lab_offer_audience', { version: params.customAttributes.onboarding_offer_version });
      if (script.audienceUpdate === 'fail') throw Object.assign(new Error('Audience update network failure'), { adaptyCode: 2005 });
    },
    getFlow: async (placement) => {
      attempts.flow += 1;
      const offer = ctx.scenario.onboardingOffer;
      const fallback = placement === 'onboarding_trial_fallback';
      if (fallback && finishLateProducts) {
        const finish = finishLateProducts;
        setTimeout(() => { ctx.log('lab_late_offer_returned', { arm: 'b' }); finish(); }, 500);
      }
      const ok = !(script.plans === 'failFirst' && attempts.flow === 1)
        && !(offer?.arm === 'error' && !fallback)
        && !(offer?.fallbackError && fallback);
      ctx.log('lab_flow', { placement, attempt: attempts.flow, ok });
      if (!ok) throw Object.assign(new Error('Flow request failed'), { adaptyCode: 2005 });
      const trial = fallback ? true : offer?.arm === 'unknown' || (placement === 'onboarding_no_trial' && offer?.arm === 'b') ? undefined : offer?.arm === 'a';
      return {
        placementId: placement,
        variationId: offer ? `offer-${fallback ? 'fallback' : offer.arm}` : `identity-lab-${placement}`,
        remoteConfigs: offer ? [{ lang: 'en', data: { trial, recommendedProductId: 'com.johansardar.excerlock.premium.a.annual' } }] : [],
      } as unknown as AdaptyFlow;
    },
    getPaywallProducts: async (flow) => {
      const offer = ctx.scenario.onboardingOffer;
      if (offer) {
        const fallback = flow.variationId === 'offer-fallback';
        const noTrial = !fallback && ['b', 'unknown', 'late'].includes(offer.arm);
        if (offer.arm === 'late' && !fallback) await new Promise<void>((resolve) => { finishLateProducts = resolve; });
        const eligible = fallback || offer.introEligible !== false;
        const plans = [
          labProduct('com.johansardar.excerlock.premium.a.annual', 'Annual', 39.99, 'year', eligible, offer.trialDays),
          labProduct('com.johansardar.excerlock.premium.a.monthly', 'Monthly', 9.99, 'month', eligible, offer.trialDays),
          labProduct('com.johansardar.excerlock.premium.a.annual.notrial', 'Annual', 39.99, 'year', false),
          labProduct('com.johansardar.excerlock.premium.a.monthly.notrial', 'Monthly', 9.99, 'month', false),
        ];
        return noTrial ? plans.slice(2) : plans;
      }
      return script.plans === 'empty' ? [] : [
            labProduct('lab.annual', 'Lab annual', 39.99, 'year', script.purchase !== 'alreadyOwned'),
            labProduct('lab.monthly', 'Lab monthly', 9.99, 'month', script.purchase !== 'alreadyOwned'),
          ];
    },
    logShowFlow: async (flow) => { ctx.log('lab_paywall_shown', { variation: flow.variationId }); },
    makePurchase: async (product) => {
      attempts.purchase += 1;
      updateSubscriptionLab();
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
      if (result === 'error') throw Object.assign(new Error('Product request failed before StoreKit'), { adaptyCode: 1002 });
      if (result === 'alreadyOwned') {
        updateSubscriptionLab();
        throw Object.assign(new Error('This subscription is already owned'), { adaptyCode: 107 });
      }
      await new Promise((resolve) => setTimeout(resolve, 40));
      if (result === 'cancel') return { type: 'user_cancelled' } as AdaptyPurchaseResult;
      if (result === 'pending') return { type: 'pending' } as AdaptyPurchaseResult;
      if (!owner) throw new Error('Purchase owner unavailable');
      if (result === 'successWithoutAccess') {
        const purchased = profile(owner);
        ctx.log('lab_purchase_profile', { owner, access: 'none', grants: grants.size });
        updateSubscriptionLab();
        return { type: 'success', profile: purchased } as unknown as AdaptyPurchaseResult;
      }
      const trial = product.subscription?.offer?.phases.some((phase) => phase.paymentMode === 'free_trial') ?? false;
      checkoutProductId = product.vendorProductId;
      if (ctx.scenario.onboardingOffer) ctx.log('lab_offer_purchase', { plan: product.vendorProductId, trial });
      grants.set(STORE_SUBSCRIPTION_ID, { owner, status: trial ? 'trial' : 'active' });
      const purchased = profile(owner);
      if (result === 'paidThenInterrupted') {
        updateSubscriptionLab();
        throw Object.assign(new Error('Transaction verification network failure after payment'), { adaptyCode: 2005 });
      }
      if (result === 'paidThenEncodingFailed') {
        updateSubscriptionLab();
        throw Object.assign(new Error('Bridge failed to encode purchase response'), { adaptyCode: 2009 });
      }
      if (script.delayedCallbacks) {
        queuedProfiles.push({ operation: 'purchase', owner, profile: purchased });
        updateSubscriptionLab();
        return { type: 'pending' } as AdaptyPurchaseResult;
      }
      updateSubscriptionLab();
      if (script.duplicatePurchaseCallback) {
        profileListener?.(purchased);
        setTimeout(() => profileListener?.(purchased), 0);
      }
      return { type: 'success', profile: purchased, ios: { jwsTransaction: labStoreTransaction(product, trial, script) } } as unknown as AdaptyPurchaseResult;
    },
    restorePurchases: async () => {
      const configured = script.restore ?? ctx.snapshot().restoreOutcome;
      const result = configured === 'errorFirst' && attempts.restore > 0 ? 'restored' : configured;
      const owner = customerUserId;
      if (!owner) throw new Error('Restore owner unavailable');
      if (result === 'transport' || result === 'auth') {
        attempts.restore += 1;
        updateSubscriptionLab();
        throw Object.assign(new Error('Restore unavailable'), { adaptyCode: result === 'transport' ? 2005 : 2002 });
      }
      if (result === 'unverified') {
        attempts.restore += 1;
        updateSubscriptionLab();
        return profile('lab-unverified-owner');
      }
      if (result === 'errorFirst') {
        attempts.restore += 1;
        ctx.log('lab_restore', { result: 'error', owner, source: 'adapter' });
        updateSubscriptionLab();
        throw networkError('Restore failed');
      }
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
    setIntegrationIdentifier: async (key: string) => {
      if (key !== 'posthog_distinct_user_id') return;
      if (script.integrationIdentifier === 'networkFailed') {
        ctx.log('lab_integration', { result: 'networkFailed' });
        throw Object.assign(networkError('Adapty networkFailed 2005'), { adaptyCode: 2005 });
      }
      if (script.integrationIdentifier === 'hang') {
        ctx.log('lab_integration', { result: 'hang' });
        await new Promise(() => undefined);
      }
    },
  };

  const provisional: AuthIdentity = { kind: 'provisional', userId: null, isAnonymous: true, generation: 0, ready: false };
  const analytics = script.productionAnalytics ? paymentAnalyticsLab(ctx, () => services?.auth.identity() ?? provisional) : AnalyticsFake(ctx);
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
    analytics: {
      track: (event, props) => {
        analytics.track(event, props);
        if (script.checkoutAnalyticsFailure) {
          ctx.log('lab_checkout_analytics', { result: script.checkoutAnalyticsFailure });
          if (script.checkoutAnalyticsFailure === 'throw') throw new Error('Diagnostic tracking unavailable');
          if (script.checkoutAnalyticsFailure === 'reject') return Promise.reject(new Error('Diagnostic tracking unavailable'));
          return new Promise<void>(() => undefined);
        }
      },
    },
    adAttribution: accountHooks?.adAttribution,
    adIntegrationIdentifiers: async () => ({ facebook_anonymous_id: 'lab-meta-anonymous-id' }),
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
      if (script.productionAnalytics) await analytics.identify(id);
    },
    analyticsReset: async () => {
      distinctId = ANONYMOUS_DISTINCT_ID;
      if (script.productionAnalytics) await analytics.reset();
    },
    subscriptionIdentify: (id) => adapter.identify(id),
    subscriptionReset: () => adapter.reset(),
    getPosthogDistinctId: () => distinctId,
    setIntegrationIdentifier: (key, value) => sdk.setIntegrationIdentifier(key, value),
    onBeforeDelete: async () => undefined,
    onAfterDelete: accountHooks?.afterDelete ?? (async () => undefined),
    beforeAccountSwitch: async (options) => {
      if (rejectNextAccountReset) {
        rejectNextAccountReset = false;
        ctx.log('lab_sign_out_reset', { result: 'failed' });
        throw networkError('Account reset failed');
      }
      await accountHooks?.beforeAccountSwitch(options);
    },
    prepareAccount: accountHooks?.prepareAccount,
  });
  const auth = services.auth;
  const subscription: SubscriptionPort = {
    entitlement: () => adapter.entitlement(),
    restore: (context) => adapter.restore(context),
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
        const duplicate = adapter.purchase(handle).then(
          () => 'accepted',
          (error) => message(error),
        );
        const restore = adapter.restore().then(
          () => 'accepted',
          (error) => message(error),
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
        releasePurchaseBarrier?.();
        try {
          const [result, duplicateResult, restoreResult] = await Promise.all([first, duplicate, restore]);
          ctx.update({ subscriptionLab: {
            ...ctx.snapshot().subscriptionLab!,
            purchaseSerialization: `duplicate ${duplicateResult} restore ${restoreResult}`,
          } });
          return result;
        } catch (error) {
          releasePurchaseBarrier?.();
          throw error;
        }
      }
      try {
        const result = await adapter.purchase(handle);
        if (script.activation || script.adaptyIdentify || script.audienceUpdate)
          ctx.log('lab_preflight', { activation: attempts.activation, identify: attempts.adaptyIdentify, flowRecovered: attempts.flow > 1 });
        return result;
      } catch (error) {
        ctx.log('lab_purchase_failure', {
          attempt: attempts.purchase,
          owner: customerUserId ?? 'none',
          grants: grants.size,
        });
        updateSubscriptionLab();
        throw error;
      }
    },
    operation: () => adapter.operation(),
    manageSubscription: () => adapter.manageSubscription(),
    subscribe: (callback) => adapter.subscribe(callback),
  };
  const booted = auth.boot();
  return {
    auth,
    analytics,
    subscription,
    booted: booted.then(
      () => undefined,
      () => undefined,
    ),
    dispose: async () => {
      adapter.dispose();
      await services?.dispose();
    },
  };
}
