import { setupCopy } from '../../content/setup';
import type { Permissions } from '../../domain/types';
import type { SystemAlertCopy } from '../../design-system/SystemAlert';

export type AlertName = 'screenTime' | 'motion' | 'location' | 'camera' | 'notifications';

/**
 * The iOS alert a request shows. Asking for Always from While Using is Apple's one-time upgrade
 * alert; from nothing it is the usual location alert carrying the Always purpose string.
 */
export function systemAlert(name: AlertName, always: boolean, location: Permissions['location']): SystemAlertCopy {
  const alerts = setupCopy.alerts;
  if (name !== 'location') return alerts[name];
  if (!always) return alerts.location;
  return location === 'whenInUse' ? alerts.alwaysUpgrade : alerts.alwaysLocation;
}
