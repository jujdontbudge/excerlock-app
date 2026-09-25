import { createContext, useContext, PropsWithChildren } from 'react';
const SetupPresentationContext = createContext(false);
export function SetupPresentation({ children, enabled = true }: PropsWithChildren<{ enabled?: boolean }>) {
  return <SetupPresentationContext.Provider value={enabled}>{children}</SetupPresentationContext.Provider>;
}
export function useSetupPresentation() {
  return useContext(SetupPresentationContext);
}
