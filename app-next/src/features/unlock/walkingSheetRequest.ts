import { useSyncExternalStore } from 'react';

let pendingRuleId: string | null = null;
const listeners = new Set<() => void>();

// merge: replace this bridge with P2-T19's Home sheet-opening state when that task lands.
export function requestHomeWalkingSheet(ruleId: string): void {
  pendingRuleId = ruleId;
  listeners.forEach((listener) => listener());
}

export function clearHomeWalkingSheetRequest(): void {
  pendingRuleId = null;
  listeners.forEach((listener) => listener());
}

export function useHomeWalkingSheetRequest(): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => pendingRuleId,
  );
}
