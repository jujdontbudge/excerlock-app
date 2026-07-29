import type {
  ScreenTimeModule,
  ScreenTimeSelectionHandle,
} from "@/screentime";

import type { RecurringLockWindow } from "../model/recurringLockWindow";
import {
  materializeLockWindows,
  RECURRING_WINDOW_ID_PREFIX,
} from "../model/windowOccurrences";

/** Reconciles only the concrete registrations owned by recurring definitions. */
export async function syncScheduleRegistrations({
  screenTime,
  selection,
  definitions,
  atMs,
}: {
  screenTime: ScreenTimeModule;
  selection: ScreenTimeSelectionHandle;
  definitions: readonly RecurringLockWindow[];
  atMs: number;
}): Promise<void> {
  const desired = materializeLockWindows(definitions, atMs);
  const desiredIds = new Set(desired.map(({ id }) => id));
  const existing = await screenTime.getLockWindows();
  await Promise.all(
    existing
      .filter(
        ({ id }) =>
          id.startsWith(RECURRING_WINDOW_ID_PREFIX) && !desiredIds.has(id),
      )
      .map(({ id }) => screenTime.cancelLockWindow(id)),
  );
  for (const window of desired) {
    await screenTime.scheduleLockWindow(selection, window);
  }
}
