import { createContext, PropsWithChildren, useContext, useState } from 'react';
import { createRuntime, Runtime } from './createRuntime';
const Context = createContext<Runtime | null>(null);
export function AppRuntimeProvider({ children }: PropsWithChildren) {
  const [runtime] = useState(createRuntime);
  return <Context.Provider value={runtime}>{children}</Context.Provider>;
}
export function useRuntime() {
  const value = useContext(Context);
  if (!value) throw new Error('AppRuntimeProvider is required');
  return value;
}
