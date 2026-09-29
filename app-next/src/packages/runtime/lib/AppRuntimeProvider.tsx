import { PropsWithChildren, useState, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import Constants from 'expo-constants';
import { createRuntime, Runtime } from './createRuntime';
import { runtimeMode } from '../../platform/environment';
import { reportRuntimeError } from '../../telemetry/reportRuntimeError';
import { ScreenShell } from '../../ui/ScreenShell';
import { Label } from '../../ui/Label';
import { PrimaryButton } from '../../ui/PrimaryButton';
import { tokens } from '../../ui/tokens';
import { RuntimeContext } from '../../ports/useRuntime';
import { NotificationLandingHost } from './NotificationLandingHost';
export function AppRuntimeProvider({ children, runtime: provided }: PropsWithChildren<{ runtime?: Runtime }>) {
  const [runtime, setRuntime] = useState<Runtime | null>(
    () =>
      provided ??
      (runtimeMode(Constants.expoConfig?.extra?.environment, __DEV__) === 'fake' ? createRuntime('fake') : null),
  );
  const [failed, setFailed] = useState<'retry' | 'restart' | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (runtime) return;
    let current = true;
    void createRuntime('real').then(
      (value) => {
        if (current) setRuntime(value);
      },
      (error) => {
        reportRuntimeError(error);
        if (current) setFailed(error && typeof error === 'object' && error.retryUnsafe === true ? 'restart' : 'retry');
      },
    );
    return () => {
      current = false;
    };
  }, [runtime, attempt]);
  useEffect(
    () => () => {
      if (runtime?.kind === 'fake') runtime.dispose();
    },
    [runtime],
  );
  if (!runtime)
    return (
      <ScreenShell contentStyle={{ flexGrow: 1, justifyContent: 'center', gap: 24 }}>
        <Label style={{ textAlign: 'center' }}>
          {failed === 'restart'
            ? 'Close ExcerLock from the app switcher, then open it again to finish starting safely.'
            : failed
              ? 'ExcerLock could not finish starting. Your saved data has not been cleared.'
              : 'Starting ExcerLock…'}
        </Label>
        {failed === 'restart' ? null : failed ? (
          <PrimaryButton
            label="Try again"
            onPress={() => {
              setFailed(null);
              setAttempt((value) => value + 1);
            }}
          />
        ) : (
          <ActivityIndicator accessibilityLabel="Starting ExcerLock" color={tokens.text.primary} />
        )}
      </ScreenShell>
    );
  return (
    <RuntimeContext.Provider value={runtime}>
      {children}
      <NotificationLandingHost />
      {runtime.kind === 'real' ? <NativePickerHost /> : null}
    </RuntimeContext.Provider>
  );
}

function NativePickerHost() {
  const { NativeScreenTimePickerHost } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
    require('../../app-selection/createNativeScreenTimePort') as typeof import('../../app-selection/createNativeScreenTimePort');
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
  const { NativeRuntimeEffects } = require('./NativeRuntimeEffects') as typeof import('./NativeRuntimeEffects');
  return (
    <>
      <NativeScreenTimePickerHost />
      <NativeRuntimeEffects />
    </>
  );
}
