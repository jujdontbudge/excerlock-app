import { createContext, useContext, PropsWithChildren } from 'react';
const SolidChoiceContext = createContext(false);
/** Onboarding opts shared choice controls into the solid orange selection style. */
export function SolidChoices({ children }: PropsWithChildren) {
  return <SolidChoiceContext.Provider value={true}>{children}</SolidChoiceContext.Provider>;
}
export function useSolidChoices() {
  return useContext(SolidChoiceContext);
}
