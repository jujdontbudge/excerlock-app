import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { useRuntime } from '../AppRuntimeProvider';
import { semanticScreenName } from './PostHogAnalyticsAdapter';

/**
 * The single root-level `$screen` subscriber (B4b): one `usePathname()` effect
 * in the root navigator covers every production route, so screens never need
 * their own analytics call. The four step-level callers stay for step detail
 * (`onboarding`/`setup` + `step`); the adapter deduplicates their event with
 * this one for the same navigation.
 *
 * Routes the adapter does not map — the launch gate `index`, the dev tools
 * route, and the lab-only linked-trace recorder — never emit.
 */
export function useScreenTracking(): void {
  const pathname = usePathname();
  const runtime = useRuntime();
  useEffect(() => {
    if (!semanticScreenName(pathname)) return;
    runtime.analytics.screen(pathname);
  }, [pathname, runtime]);
}
