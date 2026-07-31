import { MockScreenTimeModule } from "./MockScreenTimeModule";
import type { ScreenTimeModule } from "./ScreenTimeModule";
import { screenTimeAppClock } from "./appRuntime";

let screenTimeModule: ScreenTimeModule | undefined;

/**
 * The composition root for ScreenTime. Phase 3 changes only this constructor to
 * the native adapter; every caller keeps the same interface.
 */
export function getScreenTimeModule(): ScreenTimeModule {
  screenTimeModule ??= new MockScreenTimeModule({ clock: screenTimeAppClock });
  return screenTimeModule;
}
