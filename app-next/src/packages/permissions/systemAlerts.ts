import { systemAlertCopy } from './systemAlertsCopy';
import type { Permissions } from '../model/types';
import type { SystemAlertCopy } from '../ui/SystemAlert';

export type AlertName = 'screenTime' | 'motion' | 'location' | 'camera' | 'notifications';

export function systemAlert(name: AlertName, always: boolean, location: Permissions['location']): SystemAlertCopy {
  const alerts = systemAlertCopy;
  if (name !== 'location') return alerts[name];
  if (!always) return alerts.location;
  return location === 'whenInUse' ? alerts.alwaysUpgrade : alerts.alwaysLocation;
}
