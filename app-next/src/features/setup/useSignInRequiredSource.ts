import { useCallback } from 'react';
import { useRuntime } from '../../ports/useRuntime';

export function useSignInRequiredSource(): () => Promise<boolean> {
  const gate = useRuntime().signInRequired;
  return useCallback(async () => (await gate?.isRequired()) ?? false, [gate]);
}
