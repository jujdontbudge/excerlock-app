import { useLocalSearchParams, useRouter } from 'expo-router';

import { type PermissionDetailId } from '@/content';
import { PermissionDetailScreen } from '@/features/settings';
import { useDemo, type OnboardingPermissionKey, type PermissionOutcome } from '@/presentation';

const permissions: PermissionDetailId[] = ['screenTime', 'location', 'motion', 'health', 'notifications'];

export default function PermissionDetailRoute() {
  const { permission } = useLocalSearchParams<{ permission?: string }>();
  const router = useRouter();
  const { state, dispatch } = useDemo();
  const id = permissions.includes(permission as PermissionDetailId) ? permission as PermissionDetailId : 'screenTime';
  const onboardingPermission = id === 'notifications' ? null : id satisfies OnboardingPermissionKey;
  const outcome = onboardingPermission ? state.onboarding.permissionOutcomes[onboardingPermission] : null;
  const status = state.settings.permissionHealth === 'healthy'
    ? 'healthy'
    : id === 'notifications'
      ? state.settings.notificationPermissionOutcome === 'allowed'
        ? 'healthy'
        : state.settings.notificationPermissionOutcome === 'denied'
          ? 'attention'
          : 'notAsked'
      : outcome === 'allowed'
        ? 'healthy'
        : outcome === 'denied'
          ? 'attention'
          : 'notAsked';
  const setOutcome = (value: PermissionOutcome) => {
    dispatch({ type: 'settings/set-permission-health', value: 'attention' });
    if (onboardingPermission) {
      dispatch({ type: 'onboarding/set-permission', permission: onboardingPermission, value });
    } else {
      dispatch({ type: 'settings/set-notification-permission-outcome', value });
    }
  };
  return (
    <PermissionDetailScreen
      id={id}
      onAboutData={() => router.push('/settings/about-permissions')}
      onBack={() => router.back()}
      onMarkNotAsked={() => {
        setOutcome('notAsked');
      }}
      onOpenSettingsPreview={() => {
        setOutcome('allowed');
      }}
      onRetry={() => {
        setOutcome('allowed');
      }}
      status={status}
    />
  );
}
