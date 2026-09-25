import { useCallback } from 'react';
import { useRuntime } from '../../runtime/AppRuntimeProvider';

export function useSignInRequiredSource(): () => Promise<boolean> {
  const gate = useRuntime().signInRequired;
  return useCallback(async () => (await gate?.isRequired()) ?? false, [gate]);
}
