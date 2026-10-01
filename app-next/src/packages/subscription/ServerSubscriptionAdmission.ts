import type {
  StoreEnvironment,
  SubscriptionAdmissionLease,
  SubscriptionAdmissionPort,
  SubscriptionAdmissionResult,
} from '../ports/SubscriptionPort';

type AuthContext = { accessToken: string; userId: string; generation: number };
type AuthorizationResponse = {
  environment: StoreEnvironment;
  status: 'active' | 'none' | 'expired' | 'billingIssue' | 'unknown';
  hasAccess: boolean;
  expiresAt: string | null;
  observedAt: string | null;
  source: 'webhook' | 'resync' | null;
};
type ResyncResponse = {
  accountId: string;
  authorization: AuthorizationResponse;
  verifiedAt: string;
};
type LiveLease = SubscriptionAdmissionLease & { deadline: number };

const MAX_LEASE_MS = 5 * 60_000;
const REQUEST_TIMEOUT_MS = 15_000;
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
  if (authorization.source !== null && !['webhook', 'resync'].includes(String(authorization.source))) return null;
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
  const current: SubscriptionAdmissionPort['current'] = (identity) => {
    if (!lease || lease.userId !== identity.userId || lease.generation !== identity.generation || now() >= lease.deadline)
      return null;
    const { deadline: _, ...visible } = lease;
    return visible;
  };
  const verify: SubscriptionAdmissionPort['verify'] = async (identity): Promise<SubscriptionAdmissionResult> => {
    const started = ++request;
    const auth = await options.getAuthContext();
    if (started !== request || !auth || auth.userId !== identity.userId || auth.generation !== identity.generation)
      return { type: 'unavailable' };
    const storeKitTestTransaction = (await options.storeKitTestTransactions?.())?.[0];
    if (started !== request) return { type: 'unavailable' };
    let response: Response;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      response = await (options.fetchImpl ?? fetch)(`${options.apiBaseUrl.replace(/\/$/, '')}/v1/subscription/resync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(storeKitTestTransaction ? { storeKitTestTransaction } : {}),
        signal: controller.signal,
      });
    } catch {
      return { type: 'unavailable' };
    } finally {
      clearTimeout(timeout);
    }
    if (started !== request || !response.ok) return { type: 'unavailable' };
    let payload: ResyncResponse | null = null;
    try {
      payload = parseResponse(await response.json());
    } catch {
      return { type: 'unavailable' };
    }
    const live = options.getIdentity();
    if (started !== request || !payload || live.userId !== identity.userId || live.generation !== identity.generation)
      return { type: 'unavailable' };
    if (payload.accountId !== identity.userId || payload.authorization.environment !== options.environment) {
      lease = null;
      return { type: 'unavailable' };
    }
    const authorization = payload.authorization;
    if (authorization.status === 'unknown') return { type: 'unavailable' };
    if (!authorization.hasAccess || authorization.status !== 'active') {
      lease = null;
      return { type: 'ineligible' };
    }
    if (!authorization.expiresAt || !authorization.observedAt || !authorization.source) {
      lease = null;
      return { type: 'unavailable' };
    }
    const verifiedAt = Date.parse(payload.verifiedAt);
    const observedAt = Date.parse(authorization.observedAt);
    const expiresAt = Date.parse(authorization.expiresAt);
    const duration = Math.min(MAX_LEASE_MS, expiresAt - verifiedAt);
    if (observedAt > verifiedAt || duration <= 0) {
      lease = null;
      return { type: 'unavailable' };
    }
    lease = {
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
  const remainingMs: SubscriptionAdmissionPort['remainingMs'] = (identity) =>
    lease && current(identity) ? lease.deadline - now() : 0;
  return { verify, current, remainingMs, invalidate: () => { request += 1; lease = null; } };
}
