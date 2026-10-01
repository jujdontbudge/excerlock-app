import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { lockListCopy as c } from './lib/permissionsCopy';
import { useRuntime } from '../ports/useRuntime';
import { ScreenTimeAuthorizationError } from './ScreenTimeAuthorizationError';
import { notify } from '../ui/Notice';

export function useLockListPicker() {
  const locked = useRef(false), router = useRouter();
  const runtime = useRuntime(),
    [busy, setBusy] = useState(false);
  useFocusEffect(useCallback(() => { locked.current = false; }, []));
  const open = useCallback(async () => {
    if (locked.current) return;
    locked.current = true;
    if (runtime.screenTime.authorizationStatus() !== 'granted') { router.push('/permissions/apps'); return; }
    setBusy(true);
    try {
      await runtime.screenTime.presentAppPicker();
    } catch (error) {
      if (error instanceof ScreenTimeAuthorizationError && error.status !== 'notDetermined')
        router.push('/permissions/apps');
      else notify(c.retry);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }, [router, runtime]);
  return { open, busy };
}
