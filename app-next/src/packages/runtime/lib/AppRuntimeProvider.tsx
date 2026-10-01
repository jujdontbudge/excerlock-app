import { PropsWithChildren, useState, useEffect } from 'react';
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
import { OtaResumeHost } from './OtaResumeHost';
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
        if (current && attempt === 0 && !(error && typeof error === 'object' && error.retryUnsafe === true)) setAttempt(1);
        else if (current) setFailed(error && typeof error === 'object' && error.retryUnsafe === true ? 'restart' : 'retry');
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
      <ScreenShell contentStyle={{ flexGrow: 1, justifyContent: 'center', gap: tokens.space.xl }}>
        {failed ? (
          <Label variant="label" style={{ textAlign: 'center' }}>
            {failed === 'restart' ? 'Please close ExcerLock and open it again.' : "Let's try that again."}
          </Label>
        ) : null}
        {failed === 'retry' ? (
          <PrimaryButton
            label="Try again"
            onPress={() => {
              setFailed(null);
              setAttempt((value) => value + 1);
            }}
          />
        ) : null}
      </ScreenShell>
    );
  return (
    <RuntimeContext.Provider value={runtime}>
      {children}
      <NotificationLandingHost />
      <OtaResumeHost />
      {runtime.kind === 'real' ? <NativeEffects /> : null}
    </RuntimeContext.Provider>
  );
}

function NativeEffects() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so fake runtimes have no native effects
  const { NativeRuntimeEffects } = require('./NativeRuntimeEffects') as typeof import('./NativeRuntimeEffects');
  return <NativeRuntimeEffects />;
}
