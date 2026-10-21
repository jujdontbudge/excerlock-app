import type {
  StoreEnvironment,
  SubscriptionAdmissionLease,
  SubscriptionAdmissionPort,
  SubscriptionAdmissionResult,
  SubscriptionVerificationFailure,
} from '../ports/SubscriptionPort';
import { forgetAdmission, rememberedAdmissionStore } from './rememberedAdmission';

type AuthContext = { accessToken: string; userId: string; generation: number };
type AuthorizationResponse = {
  environment: StoreEnvironment;
  status: 'active' | 'none' | 'expired' | 'billingIssue' | 'unknown';
  hasAccess: boolean;
  expiresAt: string | null;
  observedAt: string | null;
  source: 'webhook' | 'resync' | 'complimentary' | null;
};
type ResyncResponse = {
  accountId: string;
  complimentaryAccessChecked?: boolean;
  authorization: AuthorizationResponse;
  verifiedAt: string;
};
type LiveLease = SubscriptionAdmissionLease & { deadline: number };
type AdmissionAttempt = SubscriptionAdmissionResult & { retryable?: boolean };

const MAX_LEASE_MS = 5 * 60_000;
const REQUEST_TIMEOUT_MS = 20_000;
const RETRY_DELAY_MS = 1000;
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object';
const finiteDate = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));

function parseResponse(value: unknown): ResyncResponse | null {
  if (!isObject(value) || typeof value.accountId !== 'string' || !finiteDate(value.verifiedAt)) return null;
  const authorization = value.authorization;
  if (!isObject(authorization)) return null;
  if (!['production', 'sandbox'].includes(String(authorization.environment))) return null;
  if (!['active', 'none', 'expired', 'billingIssue', 'unknown'].includes(String(authorization.status))) return null;
  if (typeof authorization.hasAccess !== 'boolean') return null;
  if (authorization.expiresAt !== null && !finiteDate(authorization.expiresAt)) return null;
  if (authorization.observedAt !== null && !finiteDate(authorization.observedAt)) return null;
  if (authorization.source !== null && !['webhook', 'resync', 'complimentary'].includes(String(authorization.source))) return null;
  return value as ResyncResponse;
}

export function createServerSubscriptionAdmission(options: {
  apiBaseUrl: string;
  environment: StoreEnvironment;
  getAuthContext(): Promise<AuthContext | null>;
  getIdentity(): { userId: string | null; generation: number };
  fetchImpl?: typeof fetch;
  monotonicNow?: () => number;
  storeKitTestTransactions?: () => Promise<string[]>;
}): SubscriptionAdmissionPort {
  const now = options.monotonicNow ?? (() => performance.now());
  let lease: LiveLease | null = null;
  let request = 0;
  let verification = 0;
  let inFlight: { userId: string; generation: number; promise: Promise<SubscriptionAdmissionResult> } | null = null;
  const current: SubscriptionAdmissionPort['current'] = (identity) => {
    if (!lease || lease.userId !== identity.userId || lease.generation !== identity.generation || now() >= lease.deadline)
      return null;
    const { deadline: _, ...visible } = lease;
    return visible;
  };
  const verifyOnce = async (identity: Parameters<SubscriptionAdmissionPort['verify']>[0]): Promise<AdmissionAttempt> => {
    const started = ++request;
    let failure: SubscriptionVerificationFailure = 'auth_unavailable';
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const run = async (): Promise<AdmissionAttempt> => {
      const auth = await options.getAuthContext();
      if (started !== request || !auth || auth.userId !== identity.userId || auth.generation !== identity.generation)
        return { type: 'unavailable', reason: 'auth_unavailable' };
      failure = 'request_failed';
      const storeKitTestTransaction = (await options.storeKitTestTransactions?.())?.[0];
      if (started !== request) return { type: 'unavailable', reason: 'identity_changed' };
      let response: Response;
      try {
        response = await (options.fetchImpl ?? fetch)(`${options.apiBaseUrl.replace(/\/$/, '')}/v1/subscription/resync`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${auth.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(storeKitTestTransaction ? { storeKitTestTransaction } : {}),
          signal: controller.signal,
        });
      } catch {
        return { type: 'unavailable', reason: 'request_failed' };
      }
      if (started !== request) return { type: 'unavailable', reason: 'identity_changed' };
      if (!response.ok) return { type: 'unavailable', reason: 'http_error', retryable: response.status === 408 || response.status >= 500 };
      let payload: ResyncResponse | null = null;
      try {
        payload = parseResponse(await response.json());
      } catch {
        return { type: 'unavailable', reason: 'invalid_response' };
      }
      const live = options.getIdentity();
      if (started !== request || live.userId !== identity.userId || live.generation !== identity.generation)
        return { type: 'unavailable', reason: 'identity_changed' };
      if (!payload) return { type: 'unavailable', reason: 'invalid_response' };
      if (payload.accountId !== identity.userId || payload.authorization.environment !== options.environment) {
        lease = null;
        return { type: 'unavailable', reason: payload.accountId !== identity.userId ? 'account_mismatch' : 'environment_mismatch' };
      }
      const authorization = payload.authorization;
      if (payload.complimentaryAccessChecked === true && authorization.source !== 'complimentary' && rememberedAdmissionStore.getState().data.admission?.source === 'complimentary') {
        lease = null;
        forgetAdmission();
      }
      if (authorization.status === 'unknown') return { type: 'unavailable', reason: 'subscription_unknown' };
      if (!authorization.hasAccess || authorization.status !== 'active') {
        lease = null;
        return { type: 'ineligible' };
      }
      if (!authorization.expiresAt || !authorization.observedAt || !authorization.source) {
        lease = null;
        return { type: 'unavailable', reason: 'invalid_response' };
      }
      const verifiedAt = Date.parse(payload.verifiedAt);
      const observedAt = Date.parse(authorization.observedAt);
      const expiresAt = Date.parse(authorization.expiresAt);
      const duration = Math.min(MAX_LEASE_MS, expiresAt - verifiedAt);
      if (observedAt > verifiedAt || duration <= 0) {
        lease = null;
        return { type: 'unavailable', reason: 'invalid_response' };
      }
      lease = {
        ...(authorization.source === 'complimentary' ? { source: 'complimentary' as const } : {}),
        userId: identity.userId,
        generation: identity.generation,
        environment: options.environment,
        expiresAt: authorization.expiresAt,
        observedAt: authorization.observedAt,
        verifiedAt: payload.verifiedAt,
        deadline: now() + duration,
      };
      return { type: 'eligible', lease: current(identity)! };
    };
    try {
      return await Promise.race([
        run().catch((): SubscriptionAdmissionResult => ({ type: 'unavailable', reason: failure })),
        new Promise<SubscriptionAdmissionResult>((resolve) => {
          timer = setTimeout(() => {
            if (started === request) request += 1;
            controller.abort();
            resolve({ type: 'unavailable', reason: 'request_timeout' });
          }, REQUEST_TIMEOUT_MS);
        }),
      ]);
    } finally {
      clearTimeout(timer!);
    }
  };
  const verify: SubscriptionAdmissionPort['verify'] = (identity) => {
    if (inFlight?.userId === identity.userId && inFlight.generation === identity.generation) return inFlight.promise;
    const started = ++verification;
    const unchanged = () => {
      const live = options.getIdentity();
      return started === verification && live.userId === identity.userId && live.generation === identity.generation;
    };
    const run = async (): Promise<SubscriptionAdmissionResult> => {
      for (let attempt = 0; ; attempt += 1) {
        if (!unchanged()) return { type: 'unavailable', reason: 'identity_changed' };
        const { retryable, ...result } = await verifyOnce(identity);
        if (!unchanged()) return { type: 'unavailable', reason: 'identity_changed' };
        if (attempt > 0 || result.type !== 'unavailable' ||
          !(result.reason === 'http_error' ? retryable : ['request_timeout', 'request_failed', 'subscription_unknown'].includes(result.reason ?? ''))) return result;
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    };
    const promise = run().finally(() => {
      if (inFlight?.promise === promise) inFlight = null;
    });
    inFlight = { ...identity, promise };
    return promise;
  };
  const remainingMs: SubscriptionAdmissionPort['remainingMs'] = (identity) =>
    lease && current(identity) ? lease.deadline - now() : 0;
  return { verify, current, remainingMs, invalidate: () => { verification += 1; request += 1; inFlight = null; lease = null; } };
}
