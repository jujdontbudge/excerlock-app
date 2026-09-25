import { PropsWithChildren, useState, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import Constants from 'expo-constants';
import { createRuntime, Runtime } from './createRuntime';
import { runtimeMode } from './environment';
import { reportRuntimeError } from './observability/reportRuntimeError';
import { ScreenShell } from '../design-system/ScreenShell';
import { Label } from '../design-system/Label';
import { PrimaryButton } from '../design-system/PrimaryButton';
import { tokens } from '../design-system/tokens';
import { RuntimeContext } from '../ports/useRuntime';
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
      {runtime.kind === 'real' ? <NativePickerHost /> : null}
    </RuntimeContext.Provider>
  );
}

function NativePickerHost() {
  const { NativeScreenTimePickerHost } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
    require('../screentime/native/createNativeScreenTimePort') as typeof import('../screentime/native/createNativeScreenTimePort');
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
  const { NativeRuntimeEffects } = require('./NativeRuntimeEffects') as typeof import('./NativeRuntimeEffects');
  return (
    <>
      <NativeScreenTimePickerHost />
      <NativeRuntimeEffects />
    </>
  );
}
