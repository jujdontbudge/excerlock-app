import { create } from 'zustand';
import type { ActivityTruth } from '@excerlock/analytics-events';

export type { ActivityTruth };
export type ActivityTruthHold = { activity: ActivityTruth; heldAt: number };

/** A held label is "what I am doing NOW"; after this long it no longer describes now. */
export const ACTIVITY_TRUTH_TTL_MS = 10 * 60 * 1000;

/**
 * The ground-truth label the person holds on Home (Walking / Sitting / Shaking / Treadmill).
 * In-memory only: it describes this moment, so it must never outlive the session. One active
 * label; the incident snapshot and analytics read it through `currentActivityTruth`.
 */
export const activityTruthStore = create<{
  data: ActivityTruthHold | null;
  hold(activity: ActivityTruth, at: number): void;
  clear(): void;
}>((set) => ({
  data: null,
  hold: (activity, at) => set({ data: { activity, heldAt: at } }),
  clear: () => set({ data: null }),
}));

/** The label as the report sees it: null once stale, otherwise with its age so a reader knows how fresh it was. */
export function currentActivityTruth(now: number): { activity: ActivityTruth; heldAt: string; ageSeconds: number } | null {
  const held = activityTruthStore.getState().data;
  if (!held || now - held.heldAt >= ACTIVITY_TRUTH_TTL_MS) return null;
  return { activity: held.activity, heldAt: new Date(held.heldAt).toISOString(), ageSeconds: Math.round((now - held.heldAt) / 1000) };
}
