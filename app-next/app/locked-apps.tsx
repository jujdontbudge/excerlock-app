import { Href, Redirect } from 'expo-router';
import { entitlementStore as useEntitlementStore } from '../src/state/entitlementStore';
import { lockedAppsDestination } from '../src/features/launch/lockedAppsDestination';
import { BootScreen } from '../src/features/launch/BootScreen';
export default function LockedApps() {
  const status = useEntitlementStore((s) => s.data.entitlement.status);
  const destination = lockedAppsDestination(status);
  return destination ? <Redirect href={destination as Href} /> : <BootScreen />;
}
