import { createContext, useContext, PropsWithChildren } from 'react';
const SetupPresentationContext = createContext(false);
/**
 * Onboarding and the condition builder present text centred and hide heading support.
 * Icon tint follows the one tone rule, and choice emphasis is not part of this: pass
 * `emphasis` to ChoiceRow and ActivityCard explicitly.
 */
export function SetupPresentation({ children, enabled = true }: PropsWithChildren<{ enabled?: boolean }>) {
  // `enabled={false}` restores app presentation, e.g. for a real screen previewed inside onboarding.
  return <SetupPresentationContext.Provider value={enabled}>{children}</SetupPresentationContext.Provider>;
}
export function useSetupPresentation() {
  return useContext(SetupPresentationContext);
}
