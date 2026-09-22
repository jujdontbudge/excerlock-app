import { createContext, useContext, PropsWithChildren } from 'react';
const SetupPresentationContext = createContext(false);
/**
 * Onboarding and the condition builder present text centred and hide heading support.
 * Icon tint follows the one tone rule, and choice emphasis is not part of this: pass
 * `emphasis` to ChoiceRow and ActivityCard explicitly.
 */
export function SetupPresentation({ children }: PropsWithChildren) {
  return <SetupPresentationContext.Provider value={true}>{children}</SetupPresentationContext.Provider>;
}
export function useSetupPresentation() {
  return useContext(SetupPresentationContext);
}
