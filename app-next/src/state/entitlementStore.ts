import { Entitlement } from '../domain/types';
import { defineStore } from './createPersistedStore';
import * as v from './validation';
export const entitlementStore = defineStore<{ entitlement: Entitlement }>({
  name: 'entitlement',
  initial: { entitlement: { status: 'none', renewsAt: null } },
  schemaVersion: 1,
  migrations: { 0: (raw) => raw },
  validators: {
    entitlement: v.shape({
      status: v.oneOf(['unknown', 'none', 'trial', 'active', 'expired', 'billingIssue']),
      renewsAt: v.nullable(v.iso),
    }),
  },
});
