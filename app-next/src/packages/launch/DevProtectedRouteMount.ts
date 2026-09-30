import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { useRuntime } from '../ports/useRuntime';

export function useDevProtectedRouteMount() {
  const pathname = usePathname();
  const runtime = useRuntime();
  useEffect(() => {
    if (__DEV__ && runtime.kind === 'fake') runtime.dev?.recordProtectedRouteMount(pathname);
  }, [pathname, runtime]);
}
