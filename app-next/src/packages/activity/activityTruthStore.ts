import { create } from 'zustand';
import type { ActivityTruth } from '@excerlock/analytics-events';

export type { ActivityTruth };
export type ActivityTruthHold = { activity: ActivityTruth; heldAt: number };

export const ACTIVITY_TRUTH_TTL_MS = 10 * 60 * 1000;

export const activityTruthStore = create<{
  data: ActivityTruthHold | null;
  hold(activity: ActivityTruth, at: number): void;
  clear(): void;
}>((set) => ({
  data: null,
  hold: (activity, at) => set({ data: { activity, heldAt: at } }),
  clear: () => set({ data: null }),
}));

export function currentActivityTruth(now: number): { activity: ActivityTruth; heldAt: string; ageSeconds: number } | null {
  const held = activityTruthStore.getState().data;
  if (!held || now - held.heldAt >= ACTIVITY_TRUTH_TTL_MS) return null;
  return { activity: held.activity, heldAt: new Date(held.heldAt).toISOString(), ageSeconds: Math.round((now - held.heldAt) / 1000) };
}
