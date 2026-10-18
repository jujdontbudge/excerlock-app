import { AppState } from 'react-native';
import { getTrackingPermissionsAsync, requestTrackingPermissionsAsync, type PermissionResponse } from 'expo-tracking-transparency';
import type { TrackingConsent } from '../../../ports/AdAttributionPort';
import type { TrackingConsentSource } from '../../AdAttribution';

const toConsent = ({ status }: PermissionResponse): TrackingConsent =>
  status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';

export const nativeTrackingConsent: TrackingConsentSource = {
  read: () => getTrackingPermissionsAsync().then(toConsent),
  request: () => requestTrackingPermissionsAsync().then(toConsent),
  onForeground(callback) {
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') callback(); });
    return () => subscription.remove();
  },
};
