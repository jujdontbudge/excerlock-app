import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import { createRuntime, Runtime } from './createRuntime';
import { AppErrorBoundary } from '../features/launch/AppErrorBoundary';
import { bindIdentity } from './IdentityBridge';
import { bindHaptics } from '../motion/bindHaptics';
import { startEnforcement } from './EnforcementHost';
const Context = createContext<Runtime | null>(null);

/** The app's long-lived bindings, started in mount order and torn down in reverse. */
function RuntimeBindings({ runtime }: { runtime: Runtime }) {
  useEffect(() => {
    const stops = [bindIdentity(runtime), bindHaptics(), startEnforcement(runtime)];
    return () => stops.reverse().forEach((stop) => stop());
  }, [runtime]);
  return null;
}

export function AppRuntimeProvider({ children, runtime: provided }: PropsWithChildren<{ runtime?: Runtime }>) {
  const [runtime] = useState(() => provided ?? createRuntime());
  useEffect(() => () => runtime.dispose(), [runtime]);
  return (
    <Context.Provider value={runtime}>
      <AppErrorBoundary>
        <RuntimeBindings runtime={runtime} />
        {children}
      </AppErrorBoundary>
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
