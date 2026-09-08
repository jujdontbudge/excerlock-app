import { useSyncExternalStore } from 'react';

let pendingRuleId: string | null = null;
const listeners = new Set<() => void>();

/**
 * Home's sheet-opening state, hoisted out of the screen so a modal can hand a walk back to Home:
 * the treadmill ceremony's handheld fallback starts the session and asks Home to open its walk sheet.
 */
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
