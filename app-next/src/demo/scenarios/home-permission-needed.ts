import { base } from './base';
import { emptyPermissions } from '../../state/permissionsStore';
export const scenario7 = base('home-permission-needed', 'Screen Time access needed', {
  permissions: { ...emptyPermissions, motion: 'granted', screenTime: 'denied' },
});
