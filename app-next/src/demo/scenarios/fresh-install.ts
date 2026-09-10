import { base } from './base';
import { emptyPermissions } from '../../state/permissionsStore';
export const scenario0 = base('fresh-install', 'Fresh install', {
  onboarding: 'fresh',
  profile: { name: '' },
  rules: [],
  lockedApps: { handle: null, isEmpty: true },
  ruleDays: [],
  permissions: emptyPermissions,
  entitlement: { status: 'none', renewsAt: null },
  history: [],
  usageMinutesToday: null,
  steps: { today: 0 },
});
