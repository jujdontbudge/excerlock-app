import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { useRuntime } from '../AppRuntimeProvider';
import { semanticScreenName } from './PostHogAnalyticsAdapter';

export function useScreenTracking(): void {
  const pathname = usePathname();
  const runtime = useRuntime();
  useEffect(() => {
    if (!semanticScreenName(pathname)) return;
    runtime.analytics.screen(pathname);
  }, [pathname, runtime]);
}
