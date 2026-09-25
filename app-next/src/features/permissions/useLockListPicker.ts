import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { lockListCopy as c } from '../../content/permissions';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { ScreenTimeAuthorizationError } from '../../screentime/ScreenTimeAuthorizationError';

export function useLockListPicker() {
  const runtime = useRuntime(),
    [busy, setBusy] = useState(false);
  const open = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await runtime.screenTime.presentAppPicker();
    } catch (error) {
      if (error instanceof ScreenTimeAuthorizationError && error.status !== 'notDetermined')
        Alert.alert(c.deniedTitle, c.deniedBody, [
          { text: c.notNow, style: 'cancel' },
          { text: c.openSettings, onPress: () => void Linking.openSettings() },
        ]);
      else Alert.alert(c.failedTitle, error instanceof Error ? error.message : String(error), [{ text: c.ok }]);
    } finally {
      setBusy(false);
    }
  }, [busy, runtime]);
  return { open, busy };
}
