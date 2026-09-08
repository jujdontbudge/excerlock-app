import { Rule } from '../../domain/types';

export type HomeInterval = { startMinute: number; endMinute: number };

/** merge: replace with P2-T14's mergedLockIntervals adapter once that module lands. */
export function mergedHomeIntervals(rules: Rule[]): HomeInterval[] {
  const intervals = rules.map(({ schedule }) => {
    const window = schedule.window;
    if (window.kind === 'allDay') return { startMinute: 0, endMinute: 1440 };
    return {
      startMinute: window.startMinute,
      endMinute: window.endMinute <= window.startMinute ? 1440 : window.endMinute,
    };
  });
  intervals.sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);
  return intervals.reduce<HomeInterval[]>((merged, interval) => {
    const last = merged.at(-1);
    if (!last || interval.startMinute > last.endMinute) return [...merged, interval];
    last.endMinute = Math.max(last.endMinute, interval.endMinute);
    return merged;
  }, []);
}
