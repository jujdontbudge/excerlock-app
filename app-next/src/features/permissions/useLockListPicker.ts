import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { lockListCopy as c } from '../../content/permissions';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { ScreenTimeAuthorizationError } from '../../screentime/ScreenTimeAuthorizationError';

/**
 * Every Lock list / lock-apps control goes through here: the port asks for
 * Screen Time when undecided and presents the system picker; a denied grant
 * offers iOS Settings and any other failure is shown, never swallowed.
 */
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
