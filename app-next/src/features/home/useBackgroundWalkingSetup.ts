import { useState } from 'react';
import { Linking } from 'react-native';
import { backgroundWalkingReadiness } from '../../domain/backgroundWalking';
import { homeCopy as c } from '../../content/home';
import type { Runtime } from '../../runtime/Runtime';
import { permissionsStore as usePermissionsStore } from '../../state/permissionsStore';

/**
 * Hands-free unlock needs Core Motion plus the Always-location keep-alive that
 * keeps ExcerLock resident once it is backgrounded (ADR 0036). Neither grant is
 * requested during setup, so the walking card asks for both at the point of need.
 */
export function useBackgroundWalkingSetup(runtime: Runtime) {
  const permissions = usePermissionsStore((s) => s.data);
  // iOS shows the Always upgrade prompt once; a second tap would silently no-op,
  // so anything still missing after one attempt goes to Settings.
  const [asked, setAsked] = useState(false);
  const readiness = backgroundWalkingReadiness(permissions);
  if (readiness.state === 'ready') return { state: 'ready' } as const;
  if (readiness.state === 'settings' || asked)
    return {
      state: 'settings',
      detail: c.backgroundWalkingSettings,
      label: c.openSettings,
      onPress: () => void Linking.openSettings(),
    } as const;
  const turnOn = async () => {
    for (const grant of readiness.missing) {
      const outcome =
        grant === 'motion'
          ? (await runtime.steps.request()) === 'granted'
          : (await runtime.gym.requestBackgroundLocation()) === 'always';
      runtime.analytics.track('permission_resolved', { permission: grant, outcome: outcome ? 'granted' : 'denied' });
    }
    setAsked(true);
  };
  return { state: 'ask', detail: c.backgroundWalkingAsk, label: c.backgroundWalkingOn, onPress: () => void turnOn() } as const;
}
