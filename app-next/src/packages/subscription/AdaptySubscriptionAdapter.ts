import type { AuthIdentity } from '../ports/AuthPort';
import type { Entitlement } from '../model/types';
import type {
  PaywallProduct,
  PurchaseResult,
  SubscriptionEntitlement,
  SubscriptionOperation,
  SubscriptionPaywall,
  SubscriptionPort,
} from '../ports/SubscriptionPort';
import type { Unsubscribe } from '../model/models';
import { forgetObservedEntitlement, noteObservedEntitlement } from './winbackSession';
import { entitlementStore } from './entitlementStore';
import type { RunIdentityOperation } from '../identity/identityBarrier';
import { mapEntitlement, reduceEntitlement, type ProfileSource } from './lib/entitlementMapping';
import { ADAPTY_FALLBACK_FILE_NAME } from './lib/fallbackPaywall';
import { deviceLocale, pickRemoteConfig } from './lib/remoteConfig';
import { monthlyPrice, weeklyPrice } from './lib/weeklyPrice';
import type { AdaptyFlow, AdaptyPaywallProduct, AdaptyProfile, AdaptySdkPort } from './adaptySdk';
import { trialOffer } from './trialOffer';
import type { AdAttributionPort } from '../ports/AdAttributionPort';
import { classifyPurchase, decodeStoreTransaction } from './lib/purchaseConversion';
import { retryAdapty } from './lib/retryAdapty';
import { adaptyErrorCode } from './purchaseErrors';
import { AppState } from 'react-native';
import type { AnalyticsPort } from '../ports/AnalyticsPort';
import { CheckoutDiagnostics } from './CheckoutDiagnostics';
import type { ComplimentaryAccess } from './complimentaryAccess';

const INTEGRATION_KEY = 'posthog_distinct_user_id';
const INTEGRATION_TIMEOUT_MS = 3000;
const PROFILE_BUDGET_MS = 3000;
type Loaded = {
  generation: number;
  userId: string;
  flow: AdaptyFlow;
  placement: SubscriptionPaywall['placement'];
  sdkProducts: Map<string, AdaptyPaywallProduct>;
};

const paid = (entitlement: Entitlement) => entitlement.status === 'active' || entitlement.status === 'trial';
const isAlreadyOwned = (error: unknown) => adaptyErrorCode(error) === 107;
const PENDING_APPROVAL = 1050;
const CANCELLED = 2;

export class AdaptySubscriptionAdapter implements SubscriptionPort {
  private observed: Entitlement = entitlementStore.getState().data.entitlement;
  private complimentary = entitlementStore.getState().data.complimentary;
  private activation: Promise<void> | null = null;
  private listener: { remove(): void } | null = null;
  private userId: string | null = null;
  private loaded: Loaded | null = null;
  private paywalls = new Map<number, Loaded>();
  private paywallGeneration = 0;
  private op: SubscriptionOperation = { busy: false, pending: false, error: null };
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
      analytics: Pick<AnalyticsPort, 'track'>;
      adAttribution?: Pick<AdAttributionPort, 'trialStarted' | 'subscriptionStarted'>;
      adIntegrationIdentifiers?(): Promise<Record<string, string>>;
      complimentaryAccess?: ComplimentaryAccess;
    },
  ) {}

  entitlement(): SubscriptionEntitlement {
    return { ...this.effective(), offer: { trialDays: 0, reminderDaysBefore: 0, label: '' } };
  }
  operation(): SubscriptionOperation {
    return this.op;
  }
  subscribe(callback: (entitlement: Entitlement) => void): Unsubscribe {
    return entitlementStore.subscribe((state) => callback(state.data.entitlement));
  }

  async identify(userId: string): Promise<void> {
    await this.ensureActivated();
    if (this.disposed) return;
    const switching = this.userId !== null && this.userId !== userId;
    await retryAdapty(() => this.deps.sdk.identify(userId));
    this.userId = userId;
    this.loaded = null;
    this.paywalls.clear();
    if (switching) {
      forgetObservedEntitlement();
      this.setComplimentary(null);
      this.observed = { status: 'unknown', renewsAt: null };
      this.publish();
    }
    void this.attachAdIdentifiers();
    void this.loadProfile(userId);
    void this.checkComplimentary(userId);
  }
  async reset(): Promise<void> {
    this.userId = null;
    this.loaded = null;
    this.paywalls.clear();
    this.setComplimentary(null);
    forgetObservedEntitlement();
    this.observed = { status: 'unknown', renewsAt: null };
    this.publish();
    await this.ensureActivated();
    await this.deps.sdk.logout();
  }
  async refresh(): Promise<Entitlement> {
    const userId = this.userId;
    if (!userId) return this.effective();
    const late = this.loadProfile(userId);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const budget = new Promise<Entitlement>((resolve) => {
      timer = setTimeout(() => resolve(this.effective()), PROFILE_BUDGET_MS);
    });
    return Promise.race([late, budget]).finally(() => { if (timer) clearTimeout(timer); });
  }

  async loadPaywall(placement: SubscriptionPaywall['placement']): Promise<SubscriptionPaywall> {
    const generation = ++this.paywallGeneration;
    const userId = await this.readyUser();
    const flow = await retryAdapty(() => this.deps.sdk.getFlow(placement, {
      fetchPolicy: 'reload_revalidating_cache_data',
      loadTimeoutMs: 5000,
    }));
    const products = await retryAdapty(() => this.deps.sdk.getPaywallProducts(flow));
    if (!products.length) throw new Error('Plans could not load');
    const remote = this.remoteCopy(flow);
    const mapped = products.map((product, index) => this.mapProduct(product, generation, index, remote.recommendedProductId));
    const loaded = { generation, userId, flow, placement, sdkProducts: new Map(mapped.map((item, i) => [item.handle, products[i]!])) };
    this.paywalls.set(generation, loaded);
    if (generation === this.paywallGeneration) this.loaded = loaded;
    return {
      placement,
      title: remote.title?.trim() ? remote.title : 'Choose your plan',
      body: remote.body ?? '',
      flowVariationId: String(flow.variationId ?? ''),
      products: mapped,
      generation,
      trial: mapped.some((item) => item.trialOffer),
    };
  }
  async logPaywallShown(generation: number): Promise<void> {
    const loaded = this.paywalls.get(generation);
    if (!loaded) return;
    await this.deps.sdk.logShowFlow(loaded.flow);
  }

  async purchase(handle: string): Promise<PurchaseResult> {
    if (this.op.busy) throw new Error('A purchase is already running');
    this.op = { busy: true, pending: false, error: null };
    const loaded = this.paywalls.get(Number(handle.split(':')[0])) ?? null;
    const product = loaded?.sdkProducts.get(handle);
    const attempt = new CheckoutDiagnostics(this.deps.analytics, {
      operation: 'purchase', placement: loaded?.placement ?? 'in_app', plan_id: product?.vendorProductId ?? 'unknown',
    });
    try {
      const userId = await this.readyUser();
      if (!loaded || !product || loaded.userId !== userId) throw new Error('Plans changed. Reload plans.');
      attempt.record('succeeded');
      return await this.deps.runIdentityOperation(async () => {
        await this.attachIntegration(attempt);
        const hadAccess = paid(this.observed);
        let result;
        try {
          result = await attempt.storeKit(() => this.deps.sdk.makePurchase(product), (inactive) => {
            const listener = AppState.addEventListener('change', (state) => { if (state === 'inactive') inactive(); });
            return () => listener.remove();
          });
        } catch (error) {
          const code = adaptyErrorCode(error);
          if (code === PENDING_APPROVAL) {
            attempt.result('pending', error);
            this.op = { busy: true, pending: true, error: null };
            return { type: 'pending' };
          }
          if (code === CANCELLED) {
            attempt.result('cancelled', error);
            return { type: 'user_cancelled' };
          }
          if (isAlreadyOwned(error)) {
            attempt.result('already_subscribed', error);
            return { type: 'already_subscribed' };
          }
          throw error;
        }
        attempt.stage('result');
        attempt.result(result.type === 'user_cancelled' ? 'cancelled' : result.type);
        attempt.record('succeeded');
        if (result.type !== 'success') {
          if (result.type === 'pending') this.op = { busy: true, pending: true, error: null };
          return { type: result.type };
        }
        attempt.stage('entitlement_verification');
        const entitlement = this.applyProfile(result.profile, 'purchase');
        attempt.entitlement(paid(entitlement) ? 'active' : entitlement.status === 'none' ? 'none' : 'unverified');
        attempt.record('succeeded');
        void this.reportConversion(userId, result.profile, result.ios?.jwsTransaction, product, hadAccess);
        return { type: 'success', entitlement };
      });
    } catch (error) {
      attempt.result('failed', error);
      attempt.fail(error);
      this.op = { busy: true, pending: false, error: error instanceof Error ? error.message : 'Purchase failed' };
      throw error;
    } finally {
      attempt.complete();
      this.op = { ...this.op, busy: false };
    }
  }

  async restore(context?: { placement: SubscriptionPaywall['placement'] }): Promise<Entitlement> {
    if (this.op.busy) throw new Error('A purchase is already running');
    this.op = { busy: true, pending: false, error: null };
    const attempt = new CheckoutDiagnostics(this.deps.analytics, {
      operation: 'restore', placement: context?.placement ?? this.loaded?.placement ?? 'in_app', plan_id: 'none',
    });
    try {
      await this.readyUser();
      attempt.record('succeeded');
      return await this.deps.runIdentityOperation(async () => {
        await this.attachIntegration(attempt);
        const profile = await attempt.storeKit(() => retryAdapty(() => this.deps.sdk.restorePurchases()));
        attempt.stage('entitlement_verification');
        const entitlement = this.applyProfile(profile, 'restore-return');
        attempt.result(paid(entitlement) ? 'success' : 'not_found');
        attempt.entitlement(paid(entitlement) ? 'active' : 'none');
        attempt.record('succeeded');
        return entitlement;
      });
    } catch (error) {
      attempt.result(adaptyErrorCode(error) === 1004 ? 'not_found' : 'failed', error);
      if (adaptyErrorCode(error) === 1004) return this.effective();
      attempt.fail(error);
      this.op = { busy: true, pending: false, error: error instanceof Error ? error.message : 'Restore failed' };
      throw error;
    } finally {
      attempt.complete();
      this.op = { ...this.op, busy: false };
    }
  }

  async manageSubscription(): Promise<void> {
    await this.deps.openSubscriptionManagement();
  }
  dispose(): void {
    this.disposed = true;
    this.listener?.remove();
    this.listener = null;
  }

  private effective(): Entitlement {
    const comp = this.complimentary;
    if (paid(this.observed) || !comp || comp.userId !== this.userId || Date.parse(comp.expiresAt) <= Date.now()) return this.observed;
    return { status: 'active', renewsAt: null, accessExpiresAt: comp.expiresAt, willRenew: false };
  }
  private setComplimentary(grant: { userId: string; expiresAt: string } | null) {
    this.complimentary = grant;
    if (!this.disposed) entitlementStore.getState().patch({ complimentary: grant });
  }
  private publish(): Entitlement {
    const entitlement = this.effective();
    if (!this.disposed) entitlementStore.getState().patch({ entitlement });
    return entitlement;
  }
  private applyProfile(profile: AdaptyProfile, source: ProfileSource): Entitlement {
    if (this.disposed || !this.userId || profile.customerUserId !== this.userId) return this.effective();
    this.observed = reduceEntitlement(this.observed, mapEntitlement(profile), source);
    noteObservedEntitlement(this.observed.status);
    return this.publish();
  }
  private async loadProfile(userId: string): Promise<Entitlement> {
    try {
      const profile = await retryAdapty(() => this.deps.sdk.getProfile());
      if (this.userId !== userId) return this.effective();
      return this.applyProfile(profile, 'refresh');
    } catch (error) {
      this.deps.reportError(error);
      return this.effective();
    }
  }
  private async checkComplimentary(userId: string): Promise<void> {
    const identity = this.deps.getIdentity();
    if (!this.deps.complimentaryAccess || identity.isAnonymous) return;
    try {
      const expiresAt = await this.deps.complimentaryAccess(userId);
      if (this.userId !== userId || !expiresAt) return;
      this.setComplimentary({ userId, expiresAt });
      this.publish();
    } catch (error) {
      this.deps.reportError(error);
    }
  }
  private ensureActivated(): Promise<void> {
    if (this.disposed) return Promise.reject(new Error('Subscription adapter disposed'));
    if (!this.activation) {
      this.activation = retryAdapty(() => this.deps.sdk.activate(this.deps.publicSdkKey, { __ignoreActivationOnFastRefresh: true }))
        .then(async () => {
          try { await this.deps.sdk.setFallback({ ios: { fileName: ADAPTY_FALLBACK_FILE_NAME } }); }
          catch (error) { this.deps.reportError(error); }
          if (!this.disposed && !this.listener)
            this.listener = this.deps.sdk.addEventListener('onLatestProfileLoad', (profile) => void this.applyProfile(profile, 'listener'));
        })
        .catch((error) => {
          this.activation = null;
          throw error;
        });
    }
    return this.activation;
  }
  private async readyUser(): Promise<string> {
    const identity = await this.deps.waitForIdentityReady();
    await this.ensureActivated();
    if (!identity.userId || identity.userId !== this.userId) throw new Error('Account is still loading. Try again.');
    return identity.userId;
  }
  private async attachIntegration(attempt: CheckoutDiagnostics) {
    attempt.stage('integration_attach');
    const id = this.deps.getPosthogDistinctId();
    if (!id) {
      attempt.record('skipped', undefined, 'auth');
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Error('Integration identifier timed out');
    try {
      await Promise.race([
        this.deps.sdk.setIntegrationIdentifier(INTEGRATION_KEY, id),
        new Promise((_, reject) => { timer = setTimeout(() => reject(timedOut), INTEGRATION_TIMEOUT_MS); }),
      ]);
      attempt.record('succeeded');
    } catch (error) {
      if (error === timedOut) attempt.record('timed_out', undefined, 'timeout');
      else attempt.record('failed', error);
      this.deps.reportError(error);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  private async attachAdIdentifiers(): Promise<void> {
    try {
      const identifiers = (await this.deps.adIntegrationIdentifiers?.()) ?? {};
      for (const [key, value] of Object.entries(identifiers)) await this.deps.sdk.setIntegrationIdentifier(key, value);
    } catch (error) {
      this.deps.reportError(error);
    }
  }
  private async reportConversion(
    account: string,
    profile: AdaptyProfile,
    jws: string | undefined,
    product: AdaptyPaywallProduct,
    hadAccessBefore: boolean,
  ): Promise<void> {
    try {
      const purchase = classifyPurchase({
        account,
        access: profile.accessLevels?.premium,
        transaction: decodeStoreTransaction(jws),
        product: { vendorProductId: product.vendorProductId, amount: product.price?.amount, currency: product.price?.currencyCode },
        hadAccessBefore,
      });
      if (!purchase || !this.deps.adAttribution) return;
      if (purchase.kind === 'trial') await this.deps.adAttribution.trialStarted(purchase.conversion);
      else await this.deps.adAttribution.subscriptionStarted(purchase.conversion);
    } catch (error) {
      this.deps.reportError(error);
    }
  }
  private mapProduct(product: AdaptyPaywallProduct, generation: number, index: number, recommendedProductId?: string): PaywallProduct {
    const period = product.subscription?.localizedSubscriptionPeriod ?? product.subscription?.subscriptionPeriod?.unit ?? '';
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
      priceAmount: product.price?.amount ?? null,
      localizedMonthlyPrice: monthlyPrice(product.price, product.subscription?.subscriptionPeriod, deviceLocale()),
      periodUnit: product.subscription?.subscriptionPeriod?.unit ?? null,
      offerLabel: introductoryOffer?.label ?? null,
      trialOffer: introductoryOffer,
      recommended: recommendedProductId === product.vendorProductId,
    };
  }
  private remoteCopy(flow: AdaptyFlow): { title?: string; body?: string; recommendedProductId?: string } {
    const data = pickRemoteConfig(flow.remoteConfigs, deviceLocale())?.data;
    if (!data || typeof data !== 'object') return {};
    const value = data as Record<string, unknown>;
    return {
      title: typeof value.title === 'string' ? value.title : undefined,
      body: typeof value.body === 'string' ? value.body : undefined,
      recommendedProductId: typeof value.recommendedProductId === 'string' ? value.recommendedProductId : undefined,
    };
  }
}
