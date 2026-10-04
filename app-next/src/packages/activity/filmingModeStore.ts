import { useEffect, useState } from 'react';
import { createPersistedStore } from '../persistence/createPersistedStore';
import * as v from '../persistence/validation';

export const FILMING_MODE_MS = 2 * 60 * 60_000;

export const filmingModeStore = createPersistedStore<{ until: number | null }>(
  'filming-mode',
  { until: null },
  { until: v.nullable(v.number()) },
);

const useFilmingModeStore = filmingModeStore;

export function filmingModeActive(at: number): boolean {
  const until = filmingModeStore.getState().data.until;
  return until !== null && at < until;
}

export function toggleFilmingMode(at: number): boolean {
  const on = !filmingModeActive(at);
  filmingModeStore.getState().patch({ until: on ? at + FILMING_MODE_MS : null });
  return on;
}

export function useFilmingModeActive(): boolean {
  const until = useFilmingModeStore((s) => s.data.until);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until === null) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, until - Date.now()) + 1_000);
    return () => clearTimeout(timer);
  }, [until]);
  return until !== null && now < until;
}
