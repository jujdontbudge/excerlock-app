import type { AuthIdentity } from '../ports/AuthPort';
import type { Entitlement } from '../model/types';
import type {
  PaywallProduct,
  PurchaseResult,
  SubscriptionEntitlement,
  SubscriptionOperation,
  SubscriptionPaywall,
  SubscriptionPort,
  SubscriptionAdmissionPort,
} from '../ports/SubscriptionPort';
import type { Unsubscribe } from '../model/models';
import { forgetObservedEntitlement, noteObservedEntitlement } from './winbackSession';
import { entitlementStore } from './entitlementStore';
import { rememberedAdmissionStore } from './rememberedAdmission';
import type { RunIdentityOperation } from '../identity/identityBarrier';
import { mapEntitlement, reduceEntitlement, type ProfileSource } from './lib/entitlementMapping';
import { ADAPTY_FALLBACK_FILE_NAME } from './lib/fallbackPaywall';
import { deviceLocale, pickRemoteConfig } from './lib/remoteConfig';
import { weeklyPrice } from './lib/weeklyPrice';
import type { AdaptyFlow, AdaptyPaywallProduct, AdaptyProfile, AdaptySdkPort } from './adaptySdk';
import { PurchaseRecoveryJournal } from './PurchaseRecoveryJournal';
import { trialOffer } from './trialOffer';
import { profileContainsPurchase, storePurchaseForProfile } from './lib/storePurchase';
import { retryAdapty } from './lib/retryAdapty';
import { adaptyErrorCode, purchaseDefinitelyUncharged } from './purchaseErrors';

const INTEGRATION_KEY = 'posthog_distinct_user_id';
const INTEGRATION_TIMEOUT_MS = 3000;
type Loaded = {
  generation: number;
  identityGeneration: number;
  flow: AdaptyFlow;
  sdkProducts: Map<string, AdaptyPaywallProduct>;
};

const isAlreadyOwned = (error: unknown) =>
  typeof error === 'object' && error !== null && 'adaptyCode' in error && error.adaptyCode === 107;

export class AdaptySubscriptionAdapter implements SubscriptionPort {
  private observedEntitlement: Entitlement = rememberedAdmissionStore.getState().data.admission?.source === 'complimentary'
    ? { status: 'none', renewsAt: null }
    : entitlementStore.getState().data.entitlement;
  private admission: SubscriptionAdmissionPort | null = null;
  private stopAdmission: Unsubscribe | null = null;
  private admissionExpiry: ReturnType<typeof setTimeout> | null = null;
  bindAdmission(port: SubscriptionAdmissionPort): void {
    this.admission = port;
    this.stopAdmission?.();
    this.stopAdmission = rememberedAdmissionStore.subscribe(() => this.publishEntitlement());
    this.publishEntitlement();
  }
  private effectiveEntitlement(): Entitlement {
    const identity = this.deps.getIdentity();
    const lease = identity.kind === 'canonical' && !identity.isAnonymous && identity.userId
      ? this.admission?.current({ userId: identity.userId, generation: identity.generation }) : null;
    if (lease?.source !== 'complimentary') return this.observedEntitlement;
    const paid = this.observedEntitlement;
    const end = paid.accessExpiresAt ?? paid.renewsAt;
    if ((paid.status === 'active' || paid.status === 'trial') && (paid.isLifetime || !end || Date.parse(end) > Date.now())) return paid;
    return { status: 'active', renewsAt: null, accessExpiresAt: lease.expiresAt, willRenew: false, observedAt: lease.verifiedAt };
  }
  private publishEntitlement(): Entitlement {
    if (this.disposed) return entitlementStore.getState().data.entitlement;
    const entitlement = this.effectiveEntitlement();
    entitlementStore.getState().patch({ entitlement });
    if (this.admissionExpiry) clearTimeout(this.admissionExpiry);
    const end = entitlement.accessExpiresAt ? Date.parse(entitlement.accessExpiresAt) - Date.now() : 0;
    this.admissionExpiry = end > 0 ? setTimeout(() => this.publishEntitlement(), Math.min(end + 1, 2_147_483_647)) : null;
    return entitlement;
  }
  private activation: Promise<void> | null = null;
  private listener: { remove(): void } | null = null;
  private expected: { userId: string; generation: number } | null = null;
  private loaded: Loaded | null = null;
  private paywallGeneration = 0;
  private onboardingAudienceGeneration: number | null = null;
  private op: SubscriptionOperation = { busy: false, pending: false, error: null };
  private restoreInFlight = false;
  private disposed = false;
  constructor(
    private deps: {
      sdk: AdaptySdkPort;
      publicSdkKey: string;
      getIdentity(): AuthIdentity;
      waitForIdentityReady(): Promise<AuthIdentity>;
      runIdentityOperation: RunIdentityOperation;
      getPosthogDistinctId(): string | null;
      reportError(error: unknown): void;
      openSubscriptionManagement(): Promise<void>;
      recoveryJournal: PurchaseRecoveryJournal;
      now(): string;
    },
  ) {}

  private ensureActivated(): Promise<void> {
    if (this.disposed) throw new Error('Subscription adapter disposed');
    if (!this.activation) {
      this.activation = retryAdapty(() => {
        if (this.disposed) throw new Error('Subscription adapter disposed');
        return this.deps.sdk.activate(this.deps.publicSdkKey, { __ignoreActivationOnFastRefresh: true });
      })
        .then(() => this.registerFallback())
        .then(() => {
          if (!this.disposed && !this.listener)
            this.listener = this.deps.sdk.addEventListener(
              'onLatestProfileLoad',
              (profile) => void this.publishProfile(profile, this.restoreInFlight ? 'restore-callback' : 'listener'),
            );
        }).catch((error) => {
          this.activation = null;
          throw error;
        });
    }
    return this.activation;
  }
  private async registerFallback(): Promise<void> {
    try {
      await this.deps.sdk.setFallback({ ios: { fileName: ADAPTY_FALLBACK_FILE_NAME } });
    } catch (error) {
      this.deps.reportError(error);
    }
  }
  entitlement(): SubscriptionEntitlement {
    return {
      ...this.effectiveEntitlement(),
      offer: { trialDays: 0, reminderDaysBefore: 0, label: '' },
    };
  }
  operation(): SubscriptionOperation {
    return { ...this.op, pending: this.deps.recoveryJournal.snapshot().type === 'pending' };
  }
  recovery() {
    return this.deps.recoveryJournal.snapshot();
  }
  recoveryReady(): Promise<void> {
    return this.deps.recoveryJournal.ready();
  }
  clearRecovery(): Promise<void> {
    return this.deps.recoveryJournal.clear();
  }
  subscribeRecovery(callback: Parameters<PurchaseRecoveryJournal['subscribe']>[0]) {
    return this.deps.recoveryJournal.subscribe(callback);
  }
  subscribe(callback: (entitlement: Entitlement) => void): Unsubscribe {
    return entitlementStore.subscribe((state) => callback(state.data.entitlement));
  }
  async identify(userId: string): Promise<void> {
    const identity = this.deps.getIdentity();
    if (identity.kind !== 'canonical' || identity.userId !== userId) throw new Error('Canonical identity mismatch');
    this.expected = null;
    this.loaded = null;
    await this.ensureActivated();
    const before = this.deps.getIdentity();
    if (before.kind !== 'canonical' || before.userId !== userId || before.generation !== identity.generation || this.disposed)
      throw new Error('Identity changed before Adapty identify');
    await retryAdapty(() => {
      const current = this.deps.getIdentity();
      if (current.kind !== 'canonical' || current.userId !== userId || current.generation !== identity.generation || this.disposed)
        throw new Error('Identity changed before Adapty identify');
      return this.deps.sdk.identify(userId);
    });
    const after = this.deps.getIdentity();
    if (after.kind !== 'canonical' || after.userId !== userId || after.generation !== identity.generation)
      throw new Error('Identity changed during Adapty identify');
    this.expected = { userId, generation: identity.generation };
    forgetObservedEntitlement();
    this.observedEntitlement = { status: 'unknown', renewsAt: null };
    this.publishEntitlement();
  }
  async reset(): Promise<void> {
    await this.deps.recoveryJournal.ready();
    const recovery = this.deps.recoveryJournal.snapshot();
    if (recovery.type !== 'none' && !recovery.storePurchase) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const profile = await Promise.race([
          this.deps.sdk.getProfile(),
          new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 3000); }),
        ]);
        if (profile?.customerUserId === recovery.checkoutUserId) {
          const purchase = storePurchaseForProfile(profile);
          if (purchase) await this.deps.recoveryJournal.confirm(recovery.checkoutUserId, this.deps.now(), purchase);
        }
      } catch (error) { this.deps.reportError(error); }
      finally { if (timer) clearTimeout(timer); }
    }
    this.expected = null;
    this.loaded = null;
    await this.ensureActivated();
    await this.deps.sdk.logout();
  }
  async refresh(): Promise<Entitlement> {
    const identity = this.requireExpected();
    await this.ensureActivated();
    this.assertIdentity(identity);
    const late = retryAdapty(() => {
      this.assertIdentity(identity);
      return this.deps.sdk.getProfile();
    }).then((profile) => {
      this.assertIdentity(identity);
      return this.publishProfile(profile, 'refresh');
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const budget = new Promise<Entitlement>((resolve) => {
      timer = setTimeout(() => resolve(entitlementStore.getState().data.entitlement), 3000);
    });
    return Promise.race([late, budget]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }
  async loadPaywall(placement: SubscriptionPaywall['placement'], options?: { onboardingPlacement: 'onboarding_trial_fallback' | 'onboarding_no_trial' }): Promise<SubscriptionPaywall> {
    const generation = ++this.paywallGeneration;
    await this.deps.recoveryJournal.ready();
    await this.deps.waitForIdentityReady();
    const identity = this.requireExpected();
    await this.ensureActivated();
    if (placement === 'onboarding' && !options && this.onboardingAudienceGeneration !== identity.generation) {
      try { await this.deps.sdk.updateProfile({ customAttributes: { onboarding_offer_version: 1 } }); }
      catch (error) { this.deps.reportError(error); }
      this.assertIdentity(identity);
      this.onboardingAudienceGeneration = identity.generation;
    }
    const flow = await retryAdapty(() => {
      this.assertIdentity(identity);
      return this.deps.sdk.getFlow(options?.onboardingPlacement ?? placement, {
        fetchPolicy: 'reload_revalidating_cache_data',
        loadTimeoutMs: 5000,
      });
    });
    this.assertIdentity(identity);
    const products = await retryAdapty(() => {
      this.assertIdentity(identity);
      return this.deps.sdk.getPaywallProducts(flow);
    });
    this.assertIdentity(identity);
    if (!products.length) throw new Error('Plans could not load');
    if (generation !== this.paywallGeneration) throw new Error('Paywall request superseded');
    const remote = this.remoteCopy(flow);
    const mapped = products.map((product, index) =>
      this.mapProduct(product, generation, index, remote.recommendedProductId),
    );
    const title = remote.title?.trim() ? remote.title : 'Choose your plan';
    const publicPaywall = {
      placement,
      title,
      body: remote.body ?? '',
      flowVariationId: String(flow.variationId ?? ''),
      products: mapped,
      generation,
      trial: remote.trial,
    } as const;
    this.loaded = {
      generation,
      identityGeneration: identity.generation,
      flow,
      sdkProducts: new Map(mapped.map((item, i) => [item.handle, products[i]!])),
    };
    return publicPaywall;
  }
  async logPaywallShown(generation: number): Promise<void> {
    const identity = this.requireExpected();
    if (!this.loaded || this.loaded.generation !== generation || this.loaded.identityGeneration !== identity.generation) throw new Error('Paywall expired');
    await this.deps.sdk.logShowFlow(this.loaded.flow);
  }
  async purchase(handle: string): Promise<PurchaseResult> {
    if (this.op.busy) throw new Error('A subscription operation is already running');
    this.op = { busy: true, pending: false, error: null };
    try {
      const ready = await this.deps.waitForIdentityReady();
      return await this.deps.runIdentityOperation(async () => {
        this.assertIdentity(ready);
        const loaded = this.loaded;
        const product = loaded?.sdkProducts.get(handle);
        if (!loaded || !product || loaded.identityGeneration !== ready.generation)
          throw new Error('Plan expired. Reload plans.');
        await this.deps.recoveryJournal.ready();
        if (this.deps.recoveryJournal.snapshot().type !== 'none')
          throw new Error('Finish connecting the existing purchase before starting another.');
        const recovery = await this.deps.recoveryJournal.begin('purchase', ready.userId!, this.deps.now());
        if (recovery.type !== 'pending' || recovery.checkoutUserId !== ready.userId)
          throw new Error('Finish connecting the existing purchase before starting another.');
        let result;
        let purchaseInvoked = false;
        try {
          await this.attachIntegrationBestEffort(ready);
          this.assertIdentity(ready);
          purchaseInvoked = true;
          result = await this.deps.sdk.makePurchase(product);
        } catch (error) {
          if (purchaseInvoked && adaptyErrorCode(error) === 1050) {
            return { type: 'pending' };
          }
          if (!purchaseInvoked || purchaseDefinitelyUncharged(error)) {
            const current = this.deps.recoveryJournal.snapshot();
            if (current.type === 'pending' && current.operationId === recovery.operationId)
              await this.deps.recoveryJournal.clear();
          }
          if (isAlreadyOwned(error)) {
            this.assertIdentity(ready);
            return { type: 'already_subscribed' };
          }
          if (adaptyErrorCode(error) === 2) return { type: 'user_cancelled' };
          throw error;
        }
        if (result.type === 'success') {
          await this.deps.recoveryJournal.confirm(ready.userId!, this.deps.now(), storePurchaseForProfile(result.profile, product.vendorProductId));
        }
        this.assertIdentity(ready);
        if (result.type !== 'success') {
          if (result.type === 'pending') this.op = { busy: true, pending: true, error: null };
          else await this.deps.recoveryJournal.clear();
          return { type: result.type };
        }
        const entitlement = this.publishProfile(result.profile, 'purchase');
        await this.deps.recoveryJournal.confirm(ready.userId!, this.deps.now());
        return { type: 'success', entitlement };
      });
    } catch (error) {
      this.op = { busy: true, pending: false, error: error instanceof Error ? error.message : 'Purchase failed' };
      throw error;
    } finally {
      this.op = { ...this.op, busy: false };
    }
  }
  async restore(): Promise<Entitlement> {
    if (this.op.busy) throw new Error('A subscription operation is already running');
    this.op = { busy: true, pending: false, error: null };
    this.restoreInFlight = true;
    try {
      const ready = await this.deps.waitForIdentityReady();
      return await this.deps.runIdentityOperation(async () => {
        this.assertIdentity(ready);
        await this.deps.recoveryJournal.ready();
        const existing = this.deps.recoveryJournal.snapshot();
        const recovery = await this.deps.recoveryJournal.begin('restore', ready.userId!, this.deps.now());
        if (recovery.type === 'none' || (recovery.checkoutUserId !== ready.userId && ready.isAnonymous))
          throw new Error('Sign in to connect your purchase.');
        let profile;
        try {
          await this.attachIntegrationBestEffort(ready);
          profile = await retryAdapty(() => {
            this.assertIdentity(ready);
            return this.deps.sdk.restorePurchases();
          });
        } catch (error) {
          const current = this.deps.recoveryJournal.snapshot();
          if (existing.type === 'none' && current.type === 'pending' && current.operationId === recovery.operationId)
            await this.deps.recoveryJournal.clear();
          throw error;
        }
        this.assertIdentity(ready);
        const entitlement = this.publishProfile(profile, 'restore-return');
        const restored = mapEntitlement(profile);
        const matchesCheckout = existing.type === 'none' || existing.checkoutUserId === ready.userId ||
          (existing.storePurchase && profileContainsPurchase(profile, existing.storePurchase));
        if ((restored.status === 'active' || restored.status === 'trial') && profile.customerUserId === ready.userId && matchesCheckout) {
          await this.deps.recoveryJournal.connect(ready.userId!, this.deps.now());
          await this.deps.recoveryJournal.confirm(ready.userId!, this.deps.now(), storePurchaseForProfile(profile));
        }
        else if (existing.type === 'none') await this.deps.recoveryJournal.clear();
        return entitlement;
      });
    } catch (error) {
      this.op = { busy: true, pending: false, error: error instanceof Error ? error.message : 'Restore failed' };
      throw error;
    } finally {
      this.op = { ...this.op, busy: false };
      this.restoreInFlight = false;
    }
  }
  async presentPaywall(): Promise<Entitlement> {
    throw new Error('Navigation must render PaywallScreen and call purchase(handle)');
  }
  async manageSubscription(): Promise<void> {
    await this.deps.openSubscriptionManagement();
  }
  dispose(): void {
    this.disposed = true;
    this.stopAdmission?.();
    if (this.admissionExpiry) clearTimeout(this.admissionExpiry);
    this.listener?.remove();
    this.listener = null;
  }
  private assertIdentity(expected: AuthIdentity): void {
    const current = this.requireExpected();
    if (current.userId !== expected.userId || current.generation !== expected.generation) throw new Error('Identity changed');
  }
  private requireExpected() {
    const identity = this.deps.getIdentity();
    if (
      this.disposed ||
      !this.expected ||
      identity.kind !== 'canonical' ||
      identity.userId !== this.expected.userId ||
      identity.generation !== this.expected.generation
    )
      throw new Error('Canonical subscription identity unavailable');
    return identity;
  }
  private async attachIntegrationBestEffort(identity: AuthIdentity) {
    const current = this.requireExpected();
    if (current.generation !== identity.generation) throw new Error('Identity changed');
    const id = this.deps.getPosthogDistinctId();
    if (!id) {
      this.deps.reportError(new Error('PostHog identity unavailable'));
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        this.deps.sdk.setIntegrationIdentifier(INTEGRATION_KEY, id),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Integration identifier timed out')), INTEGRATION_TIMEOUT_MS); }),
      ]);
    } catch (error) {
      this.deps.reportError(error);
    } finally {
      if (timer) clearTimeout(timer);
    }
    this.assertIdentity(identity);
  }
  private publishProfile(profile: AdaptyProfile, source: ProfileSource): Entitlement {
    if (this.disposed) return entitlementStore.getState().data.entitlement;
    const expected = this.expected;
    if (
      !expected ||
      profile.customerUserId !== expected.userId ||
      this.deps.getIdentity().generation !== expected.generation
    )
      return entitlementStore.getState().data.entitlement;
    const next = reduceEntitlement(this.observedEntitlement, mapEntitlement(profile), source);
    this.observedEntitlement = next;
    this.publishEntitlement();
    noteObservedEntitlement(next.status);
    if (next.status === 'active' || next.status === 'trial')
      void this.deps.recoveryJournal.confirm(expected.userId, this.deps.now(), storePurchaseForProfile(profile)).catch(this.deps.reportError);
    return next;
  }
  private mapProduct(
    product: AdaptyPaywallProduct,
    generation: number,
    index: number,
    recommendedProductId?: string,
  ): PaywallProduct {
    const period =
      product.subscription?.localizedSubscriptionPeriod ?? product.subscription?.subscriptionPeriod?.unit ?? '';
    const free = product.subscription?.offer?.phases.find((phase) => phase.paymentMode === 'free_trial');
    const introductoryOffer = free ? trialOffer(free.subscriptionPeriod, free.numberOfPeriods) : null;
    return {
      handle: `${generation}:${product.variationId}:${index}:${product.vendorProductId}`,
      vendorProductId: product.vendorProductId,
      title: product.localizedTitle,
      detail: product.localizedDescription,
      localizedPrice: product.price?.localizedString ?? '',
      localizedPeriod: period,
      localizedWeeklyPrice: weeklyPrice(product.price, product.subscription?.subscriptionPeriod, deviceLocale()),
      periodUnit: product.subscription?.subscriptionPeriod?.unit ?? null,
      offerLabel: introductoryOffer?.label ?? null,
      trialOffer: introductoryOffer,
      recommended: recommendedProductId === product.vendorProductId,
    };
  }
  private remoteCopy(flow: AdaptyFlow): { title?: string; body?: string; recommendedProductId?: string; trial?: boolean } {
    const data = pickRemoteConfig(flow.remoteConfigs, deviceLocale())?.data;
    if (!data || typeof data !== 'object') return {};
    const value = data as Record<string, unknown>;
    return {
      title: typeof value.title === 'string' ? value.title : undefined,
      body: typeof value.body === 'string' ? value.body : undefined,
      recommendedProductId: typeof value.recommendedProductId === 'string' ? value.recommendedProductId : undefined,
      trial: typeof value.trial === 'boolean' ? value.trial : undefined,
    };
  }
}
