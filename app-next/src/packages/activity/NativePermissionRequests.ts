import { createNativeLocationProvider } from './lib/location/createNativeLocationProvider';
import { createExcerlockMotionModuleClient } from './lib/native/MotionModuleClient';

export function nativePermissionRequests() {
  const motion = createExcerlockMotionModuleClient(), location = createNativeLocationProvider();
  const motionStatus = () => {
    const value = motion.getAuthorizationStatus();
    return value === 'authorized' ? 'granted' as const : value;
  };
  const locationStatus = (value: ReturnType<typeof location.getAuthorizationStatus>) =>
    value === 'authorizedAlways' ? 'always' as const : value === 'authorizedWhenInUse' ? 'whenInUse' as const : value === 'restricted' ? 'denied' as const : value;
  return {
    motionStatus,
    requestMotion: async () => { await motion.requestAuthorization(); return motionStatus(); },
    locationStatus: () => locationStatus(location.getAuthorizationStatus()),
    requestLocation: async () => locationStatus(await location.requestAuthorization()),
    requestBackgroundLocation: async () => locationStatus(await location.requestAlwaysAuthorization()),
  };
}
