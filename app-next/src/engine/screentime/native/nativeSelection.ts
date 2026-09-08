import type { ScreenTimeSelectionHandle } from "../ScreenTimeModule";

/** The only JS-visible handle; the FamilyControls tokens stay in the app group. */
export const NATIVE_LOCKED_SELECTION =
  "excerlock.selection.locked.v1" as ScreenTimeSelectionHandle;

export function readNativeSelectionHandle(
  value: unknown,
): ScreenTimeSelectionHandle | null {
  return value === NATIVE_LOCKED_SELECTION ? NATIVE_LOCKED_SELECTION : null;
}
