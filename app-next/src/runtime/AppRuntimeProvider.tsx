import { createContext, PropsWithChildren, useContext, useState, useEffect } from 'react';
import { createRuntime, Runtime } from './createRuntime';
const Context = createContext<Runtime | null>(null);
export function AppRuntimeProvider({ children, runtime: provided }: PropsWithChildren<{ runtime?: Runtime }>) {
  const [runtime] = useState(() => provided ?? createRuntime());
  useEffect(() => () => runtime.dispose(), [runtime]);
  return <Context.Provider value={runtime}>{children}</Context.Provider>;
}
export function useOptionalRuntime() {
  return useContext(Context);
}
export function useRuntime() {
  const value = useOptionalRuntime();
  if (!value) throw new Error('AppRuntimeProvider is required');
  return value;
}
