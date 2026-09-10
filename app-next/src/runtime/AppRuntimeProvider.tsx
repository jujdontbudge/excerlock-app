import { createContext, PropsWithChildren, useContext, useState, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import Constants from 'expo-constants';
import { createRuntime, Runtime } from './createRuntime';
import { runtimeMode } from './environment';
import { reportRuntimeError } from './productionRuntime';
import { ScreenShell } from '../design-system/ScreenShell';
import { Label } from '../design-system/Label';
import { PrimaryButton } from '../design-system/PrimaryButton';
import { tokens } from '../design-system/tokens';
const Context = createContext<Runtime | null>(null);
export function AppRuntimeProvider({ children, runtime: provided }: PropsWithChildren<{ runtime?: Runtime }>) {
  const [runtime, setRuntime] = useState<Runtime | null>(
    () =>
      provided ??
      (runtimeMode(Constants.expoConfig?.extra?.environment, __DEV__) === 'fake' ? createRuntime('fake') : null),
  );
  const [failed, setFailed] = useState(false);
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
        if (current) setFailed(true);
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
          {failed
            ? 'ExcerLock could not finish starting. Your saved data has not been cleared.'
            : 'Starting ExcerLock…'}
        </Label>
        {failed ? (
          <PrimaryButton
            label="Try again"
            onPress={() => {
              setFailed(false);
              setAttempt((value) => value + 1);
            }}
          />
        ) : (
          <ActivityIndicator accessibilityLabel="Starting ExcerLock" color={tokens.text.primary} />
        )}
      </ScreenShell>
    );
  return (
    <Context.Provider value={runtime}>
      {children}
      {runtime.kind === 'real' ? <NativePickerHost /> : null}
    </Context.Provider>
  );
}
export function useOptionalRuntime() {
  return useContext(Context);
}
export function useRuntime() {
  const value = useOptionalRuntime();
  if (!value) throw new Error('AppRuntimeProvider is required');
  return value;
}

function NativePickerHost() {
  const { NativeScreenTimePickerHost } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../screentime/native/createNativeScreenTimePort') as typeof import('../screentime/native/createNativeScreenTimePort');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NativeRuntimeEffects } = require('./NativeRuntimeEffects') as typeof import('./NativeRuntimeEffects');
  return (
    <>
      <NativeScreenTimePickerHost />
      <NativeRuntimeEffects />
    </>
  );
}
