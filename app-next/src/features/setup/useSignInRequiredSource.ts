import { useCallback } from 'react';
import { useRuntime } from '../../runtime/AppRuntimeProvider';

/**
 * The `signInRequired` source every `SignInScreen` mount supplies (B7).
 *
 * It is a function, not a boolean, so the screen keeps painting immediately and
 * only reveals "Skip for now" once the flag has answered (the flags controller
 * settles within its 2 s budget). A missing port — the demo runtime, a build
 * with no flag rail — resolves to `false`, which keeps the step skippable.
 */
export function useSignInRequiredSource(): () => Promise<boolean> {
  const gate = useRuntime().signInRequired;
  return useCallback(async () => (await gate?.isRequired()) ?? false, [gate]);
}
