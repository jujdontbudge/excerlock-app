import type { AnalyticsSink } from "./sink";

/**
 * The default transport. Instrumentation compiles and runs everywhere from
 * Phase 2 on, and goes nowhere until a real sink is installed in Phase 5
 * (ARCHITECTURE §6: "analytics instrumentation is written here in no-op mode").
 * A missing key is therefore never a crash and never a branch at a call site.
 */
export const noopSink: AnalyticsSink = {
  register() {},
  capture() {},
  screen() {},
  identify() {},
  async flush() {},
  async discardPending() {},
  reset() {},
};
