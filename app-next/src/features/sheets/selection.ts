import { LockedApps } from '../../domain/types';
import { pickerCopy } from '../../content/pickers';
const selections = new Map<string, string[]>();
export function toggleSelection(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}
export function finishSelection(ids: string[]): LockedApps {
  const valid = ids.filter((id) => pickerCopy.options.some((option) => option.id === id));
  const appCount = valid.filter((id) => id.startsWith('app-')).length,
    categoryCount = valid.length - appCount;
  if (!valid.length) return { handle: null, appCount: 0, categoryCount: 0 };
  const token = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  selections.set(token, valid);
  return { handle: { token }, appCount, categoryCount };
}
export function restoreSelection(selection: LockedApps): string[] {
  if (selection.handle && selections.has(selection.handle.token)) return [...selections.get(selection.handle.token)!];
  return [
    ...pickerCopy.options.filter((o) => o.kind === 'app').slice(0, selection.appCount),
    ...pickerCopy.options.filter((o) => o.kind === 'category').slice(0, selection.categoryCount),
  ].map((o) => o.id);
}
