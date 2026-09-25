import { Entitlement } from '../model/types';
import { createPersistedStore } from '../persistence/createPersistedStore';
import * as v from '../persistence/validation';
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
