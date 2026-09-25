import type { ScreenTimeSelectionHandle } from "./lib/ScreenTimeModule";

export const NATIVE_LOCKED_SELECTION =
  "excerlock.selection.locked.v1" as ScreenTimeSelectionHandle;

export function readNativeSelectionHandle(
  value: unknown,
): ScreenTimeSelectionHandle | null {
  return value === NATIVE_LOCKED_SELECTION ? NATIVE_LOCKED_SELECTION : null;
}
