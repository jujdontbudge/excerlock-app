import { createContext, useContext } from 'react';
import type { Runtime } from './Runtime';
export const RuntimeContext = createContext<Runtime | null>(null);
export function useOptionalRuntime() {
  return useContext(RuntimeContext);
}
export function useRuntime() {
  const value = useOptionalRuntime();
  if (!value) throw new Error('AppRuntimeProvider is required');
  return value;
}
