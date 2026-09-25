import { LockedApps } from '../../model/types';

export function finishSelection(ids: string[]): LockedApps {
  const valid = [...new Set(ids.filter(Boolean))];
  if (!valid.length) return { handle: null, isEmpty: true };
  return { handle: { token: `fake-selection-${valid.join('-')}` }, isEmpty: false };
}
export function restoreSelection(_selection: LockedApps): string[] {
  return [];
}
export function toggleSelection(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
}
