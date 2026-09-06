import { Entitlement } from '../domain/types';
import { createPersistedStore } from './createPersistedStore';
import * as v from './validation';
export const entitlementStore = createPersistedStore<{ entitlement: Entitlement }>(
  'entitlement',
  { entitlement: { status: 'none', renewsAt: null } },
  {
    entitlement: v.shape({
      status: v.oneOf(['unknown', 'none', 'trial', 'active', 'expired', 'billingIssue']),
      renewsAt: v.nullable(v.iso),
    }),
  },
);
