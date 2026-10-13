import type { AuthIdentity } from '../ports/AuthPort';
import type { StoreEnvironment, SubscriptionAdmissionPort } from '../ports/SubscriptionPort';
import { createPersistedStore } from '../persistence/createPersistedStore';
import * as v from '../persistence/validation';

type RememberedAdmission = {
  source?: 'complimentary';
  userId: string;
  environment: StoreEnvironment;
  expiresAt: string;
  observedAt: string;
  verifiedAt: string;
};

export const OFFLINE_GRACE_MS = 3 * 24 * 60 * 60_000;

export const rememberedAdmissionStore = createPersistedStore<{ admission: RememberedAdmission | null }>(
  'remembered-admission',
  { admission: null },
  {
    admission: v.nullable(
      v.shape({
        source: (value) => value === undefined || value === 'complimentary',
        userId: v.text,
        environment: v.oneOf(['production', 'sandbox']),
        expiresAt: v.iso,
        observedAt: v.iso,
        verifiedAt: v.iso,
      }),
    ),
  },
);

export function forgetAdmission() {
  rememberedAdmissionStore.getState().patch({ admission: null });
}

export function rememberAdmission(
  port: SubscriptionAdmissionPort,
  options: { environment: StoreEnvironment; now(): number; identity(): AuthIdentity },
): SubscriptionAdmissionPort {
  const remembered: SubscriptionAdmissionPort['current'] = (identity) => {
    const admission = rememberedAdmissionStore.getState().data.admission;
    const live = options.identity();
    if (
      !admission ||
      admission.userId !== identity.userId ||
      admission.environment !== options.environment ||
      live.userId !== identity.userId ||
      live.generation !== identity.generation ||
      options.now() >= Date.parse(admission.expiresAt) + (admission.source === 'complimentary' ? 0 : OFFLINE_GRACE_MS)
    )
      return null;
    return { ...admission, generation: identity.generation };
  };
  return {
    current: (identity) => port.current(identity) ?? remembered(identity),
    remainingMs: port.remainingMs,
    invalidate: port.invalidate,
    verify: async (identity) => {
      const result = await port.verify(identity);
      if (result.type === 'eligible') {
        const { userId, environment, expiresAt, observedAt, verifiedAt, source } = result.lease;
        const previous = rememberedAdmissionStore.getState().data.admission;
        const retainPaid = source === 'complimentary' && previous && previous.source !== 'complimentary' && previous.userId === userId && previous.environment === environment && Date.parse(previous.expiresAt) + OFFLINE_GRACE_MS > Math.max(options.now(), Date.parse(expiresAt));
        if (retainPaid) {
          rememberedAdmissionStore.getState().patch({ admission: previous });
          return result;
        }
        rememberedAdmissionStore.getState().patch({ admission: { userId, environment, expiresAt, observedAt, verifiedAt, ...(source ? { source } : {}) } });
      } else if (result.type === 'ineligible') forgetAdmission();
      return result;
    },
  };
}
