import { useCallback, useEffect, useRef } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { markInteractiveHome } from '../../../modules/excerlock-startup';
import type { Runtime } from '../Runtime';

const MAX_NATIVE_MARK_ATTEMPTS = 8;

/** Diagnostic only: AppDelegate entry to a laid-out, hydrated real Home. */
export function useInteractiveHomeMarker(runtime: Runtime, ready: boolean) {
  const laidOut = useRef(false);
  const marked = useRef(false);
  const frame = useRef<number | null>(null);
  const attempts = useRef(0);
  const epoch = useRef(0);
  const mounted = useRef(false);
  const isReal = runtime.kind === 'real';
  const attempt = useCallback(() => {
    const schedule = () => {
      if (!mounted.current || marked.current || frame.current !== null || !laidOut.current || !ready || !isReal || attempts.current >= MAX_NATIVE_MARK_ATTEMPTS) return;
      const scheduledEpoch = epoch.current;
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        if (!mounted.current || epoch.current !== scheduledEpoch || marked.current || !ready || !isReal) return;
        attempts.current += 1;
        try {
          marked.current = markInteractiveHome();
        } catch {
          marked.current = false;
        }
        if (!marked.current && attempts.current < MAX_NATIVE_MARK_ATTEMPTS) schedule();
        else if (!marked.current) console.warn('Startup diagnostic unavailable: native React content marker was not observed.');
      });
    };
    schedule();
  }, [isReal, ready]);
  useEffect(() => {
    mounted.current = true;
    attempt();
    return () => {
      mounted.current = false;
      epoch.current += 1;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [attempt]);
  return useCallback((_event: LayoutChangeEvent) => {
    laidOut.current = true;
    attempt();
  }, [attempt]);
}
