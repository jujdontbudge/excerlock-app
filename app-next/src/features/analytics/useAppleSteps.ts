import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, localDayStart } from '../../domain/calendar';
import { useRuntime } from '../../runtime/AppRuntimeProvider';

type Point = { day: string; value: number | null };

/** Read-only Apple pedometer analytics. Exact day bounds preserve local DST boundaries. */
export function useAppleSteps(days: string[], today: string, fallback: Point[]) {
  const runtime = useRuntime();
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; points: Point[] } | null>(null);
  const key = days.join('|');
  const status = runtime.steps.authorizationStatus();
  useEffect(() => {
    let active = true;
    if (status !== 'granted') return () => { active = false; };
    const timezone = runtime.clock.timezone();
    void Promise.all(days.map(async (day): Promise<Point> => {
      if (day > today) return { day, value: null };
      try {
        const value = await runtime.steps.stepsBetween(
          localDayStart(day, timezone),
          localDayStart(addDays(day, 1), timezone),
        );
        return { day, value };
      } catch {
        return fallback.find((point) => point.day === day) ?? { day, value: null };
      }
    })).then((points) => { if (active) setResult({ key, points }); });
    return () => { active = false; };
  }, [runtime, days, fallback, today, revision, status, key]);
  const request = useCallback(async () => {
    const next = await runtime.steps.request();
    if (next === 'granted') setRevision((value) => value + 1);
    return next;
  }, [runtime]);
  const points = status === 'granted' && result?.key === key ? result.points : fallback;
  return useMemo(() => ({ points, status, request }), [points, request, status]);
}
