import { LockedApps, PermissionStatus } from './types';

export type CanEnforce = { ok: true } | { ok: false; reason: 'screenTimeDenied' | 'noSelection' };

export function canEnforce({
  screenTime,
  selection,
}: {
  screenTime: PermissionStatus;
  selection: LockedApps;
}): CanEnforce {
  if (screenTime !== 'granted') return { ok: false, reason: 'screenTimeDenied' };
  if (selection.handle === null || selection.appCount + selection.categoryCount === 0)
    return { ok: false, reason: 'noSelection' };
  return { ok: true };
}
