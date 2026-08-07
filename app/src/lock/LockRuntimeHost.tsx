import { useEffect } from "react";
import { AppState } from "react-native";

import {
  getLockController,
  type LockController,
} from "./controller/lockController";

/**
 * Keeps the shared lock controller running for the app's lifetime.
 *
 * Before this host existed the controller only ran while a lock surface was
 * mounted, so an earn made on Home didn't move the OS shield until the user
 * happened to open Locked apps (device-smoke Finding 3: ≥40 s of shielded
 * apps after a legitimate earn). Mounted at the root, every journal change
 * reconciles the Screen Time boundary immediately.
 */
export function LockRuntimeHost({
  controller = getLockController(),
}: {
  controller?: LockController;
}) {
  useEffect(() => {
    void controller.start();
    return () => controller.stop();
  }, [controller]);

  useEffect(() => {
    // Foregrounding is when the JS ledger is most likely behind the OS: drain
    // rungs fired while the app was backgrounded. Ingest and decide again
    // before any screen renders a stale verdict (device-smoke Finding 6).
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void controller.reconcileNow();
      }
    });
    return () => subscription?.remove();
  }, [controller]);

  return null;
}
